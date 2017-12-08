pragma solidity ^0.4.17;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import "./JoysoDataDecoder.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable, JoysoDataDecoder {
    using SafeMath for uint256;

    uint256 constant PAY_BY_TOKEN = 0x0000000000000000000000020000000000000000000000000000000000000000;
    uint256 constant PAY_BY_JOY = 0x0000000000000000000000010000000000000000000000000000000000000000;
    uint256 constant PAY_BY_ETHER = 0x0000000000000000000000000000000000000000000000000000000000000000;

    mapping (address => mapping (address => uint256)) public balances;
    mapping (address => uint256) public userLock;
    mapping (bytes32 => uint256) public orderFills;
    mapping (bytes32 => bool) public usedHash;
    mapping (address => bool) public isAdmin;
    mapping (uint256 => address) public tokenId2Address;
    mapping (uint256 => address) public userId2Address;
    mapping (address => uint256) public address2Id;

    address public joysoWallet;
    address public joyToken;
    uint256 public lockPeriod = 100000; 
    uint256 public userCount;

    modifier onlyAdmin {
        require(msg.sender == owner || isAdmin[msg.sender]);
        _;
    }

    //events
    event Deposit (address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event NewUser (address user, uint256 id);
    event Lock (address user, uint256 timeLock);
 
    function Joyso (address _joysoWallet) {
        joysoWallet = _joysoWallet;
        addUser(_joysoWallet);
        joyToken = 0x12345;
        address2Id[joyToken] = 1;
        address2Id[0] = 0; // ether address is Id 0 
        tokenId2Address[0] = 0;
        tokenId2Address[1] = joyToken;
    }

    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.  
      */
    function depositToken (address token, uint256 amount) public {
        require(address2Id[token] != 0);
        addUser(msg.sender);
        require(Token(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function depositEther () public payable {
        addUser(msg.sender);
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);
        Deposit(0, msg.sender, msg.value, balances[0][msg.sender]);
    }

    function withdraw (address token, uint256 amount) public {
        require(block.number > userLock[msg.sender] && userLock[msg.sender] != 0);
        require(balances[token][msg.sender] >= amount);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        if(token == 0) {
            msg.sender.transfer(amount);
        } else {
            require(Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);       
    }

    function addUser (address _address) internal {
        if (address2Id[_address] != 0) {
            return;
        }
        userCount += 1;
        address2Id[_address] = userCount;
        userId2Address[userCount] = _address;
        NewUser(_address, userCount);
    }

    function lockMe () public {
        userLock[msg.sender] = block.number.add(lockPeriod);
        Lock (msg.sender, userLock[msg.sender]);
    }

    function unlockme () public {
        userLock[msg.sender] = 0;
        Lock (msg.sender, userLock[msg.sender]);
    }

    function withdrawByAdmin (uint256[] inputs) onlyAdmin public {
        /**
            inputs[0] (uint256) amount;
            inputs[1] (uint256) gasFee;
            inputs[2] (uint256) dataV
            inputs[3] (bytes32) r
            inputs[4] (bytes32) s
            -----------------------------------
            dataV[0 .. 9] (uint256) nonce --> doesnt used when withdraw
            dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            dataV[24..24] (uint256) v --> should be uint8 when used
            dataV[52..55] (uint256) tokenId
            dataV[56..63] (uint256) userId
            -----------------------------------
            user withdraw singature (uint256)
            (this.address, amount, gasFee, data)
            -----------------------------------
            data [0 .. 9] (uint256) nonce --> does not used when withdraw
            data [23..23] (uint256) paymentMethod
            data [24..63] (address) tokenAddress
         */
        uint256 v_256 = retrieveV(inputs[2]);
        uint256 userId;
        uint256 tokenId;
        uint256 paymentMethod;
        (paymentMethod, tokenId, userId) = decodeWithdrawData(inputs[2]);
        address token = tokenId2Address[tokenId];
        address user = userId2Address[userId];
        uint256 data = genUserSignedData(inputs[2], token);

        bytes32 hash = keccak256(this, inputs[0], inputs[1], data);
        require (!usedHash[hash]);
        require (verify(hash, user, (uint8)(v_256), (bytes32)(inputs[3]), (bytes32)(inputs[4])));
        
        address gasToken = 0;
        if (paymentMethod == PAY_BY_JOY) { // pay fee by JOY
            gasToken = tokenId2Address[1];
        } else if (paymentMethod == PAY_BY_TOKEN) { // pay fee by tx token
            gasToken = token;
        }

        if (gasToken == token) { // pay by ether or token
            require (balances[token][user] >= inputs[0] + inputs[1]);
            balances[token][user] = balances[token][user].sub(inputs[0].add(inputs[1]));
        } else {
            require (balances[token][user] >= inputs[0]);
            require (balances[gasToken][user] >= inputs[1]);
            balances[token][user] = balances[token][user].sub(inputs[0]);
            balances[gasToken][user] = balances[0][user].sub(inputs[1]);
        }
        balances[gasToken][joysoWallet] = balances[0][joysoWallet].add(inputs[1]);

        usedHash[hash] = true;

        if (token == 0) {
            msg.sender.transfer(inputs[0]);
        } else {
            require(Token(token).transfer(msg.sender, inputs[0]));
        }
    }

    // function matchByAdmin (uint256[] inputs) onlyAdmin public 
    //     // TODO: be sure the maker's ratio is better for taker 
    //     /**
    //         inputs contain multiple orders 
    //         order[0] will be taker
    //         others will be maker
    //      */
    //     /**
    //         for order i:
    //         inputs[i*7]   (uint256) amountSell
    //         inputs[i*7+1] (uint256) amountBuy
    //         inputs[i*7+2] (uint256) gasFee
    //         inputs[i*7+3] (bytes32) data1
    //         inputs[i*7+4] (bytes32) data2V
    //         inputs[i*7+5] (bytes32) r
    //         inputs[i*7+6] (bytes32) s
    //         -------------------------------------
    //         data1[23..23] (bool) isBuy
    //         data1[24..63] (address) token
    //         data2V[0 .. 1] (uint256) v
    //         data2V[9 ..12] (uint256) txFee
    //         data2V[13..23] (uint256) timestamp
    //         data2v[24..63] (address) user
    //         -------------------------------------
    //         user order signature
    //         (this.address, amountSell, amountBuy, gasFee, data1, data2)
    //         -------------------------------------
    //         data1[23..23] (bool) isBuy
    //         data1[24..63] (address) token
    //         -------------------------------------
    //         data2[9 ..12] (uint256) txFee
    //         data2[13..23] (uint256) timestamp
    //         data2[24..63] (address) user           
    //       */      
    // {
    //     bytes32 data2 = (bytes32)(inputs[4] & 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
    //     bytes32 hash = keccak256(this, inputs[0], inputs[1], inputs[2], (bytes32)(inputs[3]), data2);
    //     address user = (address)(data2 & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
    //     uint256 v = inputs[4] / 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    //     require (verify(hash, user, (uint8)(v), (bytes32)(inputs[5]), (bytes32)(inputs[6])));
    //     // every take order must first time on chain
    //     require(orderFills[hash] == 0);
    //     uint256 tosb = inputs[0]; // taker order sell balance
    //     uint256 tobb = 0; // taker order buy balance

    //     for (uint256 i = 7; i < inputs.length - 1; i = i + 7) {
    //         // TODO: we should guerentee the maker's price is better than taker's price
    //         // TODO: should we guerentee the maker's price is better than the next maker's price?
    //         if (tosb <= 0) 
    //             break;
    //         data2 = (bytes32)(inputs[i+4] & 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
    //         bytes32 makeHash = keccak256(this, inputs[i], inputs[i+1], inputs[i+2], (bytes32)(inputs[i+3]), data2);
    //         user = (address)(data2 & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
    //         v = inputs[i+4] / 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    //         //if (!verify(makeHash, (uint8)(v), (bytes32)(inputs[i+5]), (bytes32)(inputs[i+6]))) 
    //             continue; // Should we need the event if verify fail???
    //         // internalTrade not yet implement 
    //         //(tosb, tobb) = internalTrade(inputAddresses[i+3], inputAddresses[0], inputAddresses[1], inputInts[3*i], inputInts[3*i+1], makeHash, tosb, tobb);
    //     }

    //     // update taker blance
    //     //updateBalance(tosb, tobb, inputAddresses[2], hash, inputAddresses[0], inputAddresses[1], inputInts[0]);
    // }

    // helper functions
    function getBalance (address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function getHash (uint256 amount, uint256 gas, uint256 data) public view returns (bytes32) {
        return keccak256(this, amount, gas, data);
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        // bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        // bytes32 prefixedHash = keccak256(prefix, hash);
        // return ecrecover(prefixedHash, v, r, s) == sender;
        // return ecrecover(hash, v, r, s) == sender;
        return true;
    }

    function updateBalance(uint256 tosb, uint256 tobb, address user, bytes32 hash, address token1, address token2, uint256 amountSell) private {
        // update take order 
        // every take order must first time on chain
        orderFills[hash] = tobb;

        // update the taker's balance
        balances[token2][user] = balances[token2][user].sub(amountSell.sub(tosb));
        balances[token1][user] = balances[token1][user].add(tobb);
    }

    function internalTrade (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, bytes32 makerHash, 
        uint256 _tosb, uint256 _tobb)
        private returns (uint256 tosb, uint256 tobb)
    {
        // uint256 orderBuyBalance = amountBuy.sub(orderFills[makerHash]);
        // uint256 orderSellBalance = amountBuy.sub(orderFills[makerHash].mul(amountSell).div(amountBuy);
        // TODO: maybe we should check maker's balance here 
        if (_tosb >= amountBuy.sub(orderFills[makerHash])) { 
            tosb = _tosb.sub(amountBuy.sub(orderFills[makerHash]));
            tobb = _tobb.add(amountBuy.sub(orderFills[makerHash].mul(amountSell).div(amountBuy)));

            // fill the orderBalance 
            orderFills[makerHash] = amountBuy;

            // update the maker balance 
            balances[tokenSell][maker] = balances[tokenSell][maker].sub(amountBuy.sub(orderFills[makerHash].mul(amountSell).div(amountBuy)));
            balances[tokenBuy][maker] = balances[tokenBuy][maker].add(amountBuy.sub(orderFills[makerHash]));
        } else { // tosb < orderBuyBalance
            
            // fill the order balance
            orderFills[makerHash] = orderFills[makerHash].add(tosb);
            uint256 actualBuy = tosb.mul(amountSell).div(amountBuy);

            // update the maker balance
            balances[tokenSell][maker] = balances[tokenSell][maker].sub(tosb);
            balances[tokenBuy][maker] = balances[tokenBuy][maker].add(actualBuy);

            // update the tobb/tosb and return
            tobb = _tobb.add(actualBuy);
            tosb = 0;
        }
    }

    function registerToken (address tokenAddress, uint256 index) onlyAdmin {
        require (index > 1);
        require (address2Id[tokenAddress] == 0);
        address2Id[tokenAddress] = index;
        tokenId2Address[index] = tokenAddress;        
    }

    function addToAdmin (address ) {

    }


}