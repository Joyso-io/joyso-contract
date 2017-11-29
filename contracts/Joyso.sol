pragma solidity ^0.4.17;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable {
    using SafeMath for uint256;

    mapping (address => mapping (address => uint256)) public balances;
    mapping (address => uint256) public userLock;
    mapping (bytes32 => uint256) public orderFills;
    mapping (bytes32 => bool) public usedHash;
    mapping (address => bool) public isAdmin;

    address public joysoWallet;
    uint256 public lockPeriod = 100000; 

    modifier onlyAdmin {
        require(msg.sender == owner || isAdmin[msg.sender]);
        _;
    }

    //events
    event Deposit (address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Lock (address user, uint256 timeLock);
 
    function Joyso (address _joysoWallet) {
        joysoWallet = _joysoWallet;
    }

    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.  
      */
    function depositToken (address token, uint256 amount) public {
        require(Token(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function depositEther () public payable {
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);
        Deposit(0, msg.sender, msg.value, balances[0][msg.sender]);
    }

    function withdraw (address token, uint256 amount) public {
        require(block.number > userLock[msg.sender] && userLock[msg.sender] != 0);
        require(balances[token][msg.sender] >= amount);
        balances[token][msg.sender].sub(amount);
        if(token == 0) {
            msg.sender.transfer(amount);
        } else {
            require(Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);       
    }

    function lockme () public {
        userLock[msg.sender] = userLock[msg.sender].add(lockPeriod);
        Lock (msg.sender, userLock[msg.sender]);
    }

    function unlockme () public {
        userLock[msg.sender] = 0;
        Lock (msg.sender, userLock[msg.sender]);
    }

    function withdrawByAdmin (address user, uint256[] inputs) onlyAdmin public {
        /**
            inputs[0] (uint256) amount;
            inputs[1] (uint256) gasFee;
            inputs[2] (bytes32) dataV
            inputs[3] (bytes32) r
            inputs[4] (bytes32) s
            -----------------------------------
            dataV[0 .. 1] (uint8) v
            dataV[12..22] (uint256) timeStamp
            dataV[23..23] (bool) byEther
            dataV[24..63] (address) token
            -----------------------------------
            user withdraw singature
            (this.address, amount, gasFee, data)
            -----------------------------------
            data [12..22] timestamp --> does not used when withdraw
            data [23..23] byEther
            data [24..63] token
         */
        bytes32 data = (bytes32)(inputs[2] & 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
        bytes32 hash = keccak256(this, inputs[0], inputs[1], data);
        require (!usedHash[hash]);
        uint256 v = inputs[2] / 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        require (verify(hash, user, (uint8)(v), (bytes32)(inputs[3]), (bytes32)(inputs[4])));

        address token = (address)(inputs[2] & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
        bool byEther  = (data & 0x00000000000000000000000f0000000000000000000000000000000000000000) > 0;

        if (byEther) {
            require (balances[0][user] >= inputs[1]);
            balances[0][user] = balances[0][user].sub(inputs[1]);
            balances[0][joysoWallet] = balances[0][joysoWallet].add(inputs[1]);
        } else {
            require (balances[token][user] >= inputs[1]);
            balances[token][user] = balances[token][user].sub(inputs[1]);
            balances[token][joysoWallet] = balances[token][joysoWallet].add(inputs[1]);
        }

        require (balances[token][user] >= inputs[0]);
        balances[token][user].sub(inputs[0]);
        usedHash[hash] = true;

        if (token == 0) {
            msg.sender.transfer(inputs[0]);
        } else {
            require(Token(token).transfer(msg.sender, inputs[0]));
        }
    }

    function matchByAdmin (uint256[] inputs) onlyAdmin public 
        // TODO: be sure the maker's ratio is better for taker 
        /**
            inputs contain multiple orders 
            order[0] will be taker
            others will be maker
         */
        /**
            for order i:
            inputs[i*7]   (uint256) amountSell
            inputs[i*7+1] (uint256) amountBuy
            inputs[i*7+2] (uint256) gasFee
            inputs[i*7+3] (bytes32) data1
            inputs[i*7+4] (bytes32) data2V
            inputs[i*7+5] (bytes32) r
            inputs[i*7+6] (bytes32) s
            -------------------------------------
            data1[23..23] (bool) isBuy
            data1[24..63] (address) token
            data2V[0 .. 1] (uint256) v
            data2V[9 ..12] (uint256) txFee
            data2V[13..23] (uint256) timestamp
            data2v[24..63] (address) user
            -------------------------------------
            user order signature
            (this.address, amountSell, amountBuy, gasFee, data1, data2)
            -------------------------------------
            data1[23..23] (bool) isBuy
            data1[24..63] (address) token
            -------------------------------------
            data2[9 ..12] (uint256) txFee
            data2[13..23] (uint256) timestamp
            data2[24..63] (address) user           
          */      
    {
        bytes32 data2 = (bytes32)(inputs[4] & 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
        bytes32 hash = keccak256(this, inputs[0], inputs[1], inputs[2], (bytes32)(inputs[3]), data2);
        address user = (address)(data2 & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
        uint256 v = inputs[4] / 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        require (verify(hash, user, (uint8)(v), (bytes32)(inputs[5]), (bytes32)(inputs[6])));
        // every take order must first time on chain
        require(orderFills[hash] == 0);
        uint256 tosb = inputs[0]; // taker order sell balance
        uint256 tobb = 0; // taker order buy balance

        for (uint256 i = 7; i < inputs.length - 1; i = i + 7) {
            // TODO: we should guerentee the maker's price is better than taker's price
            // TODO: should we guerentee the maker's price is better than the next maker's price?
            if (tosb <= 0) 
                break;
            data2 = (bytes32)(inputs[i+4] & 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
            bytes32 makeHash = keccak256(this, inputs[i], inputs[i+1], inputs[i+2], (bytes32)(inputs[i+3]), data2);
            user = (address)(data2 & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
            v = inputs[i+4] / 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
            if (!verify(makeHash, (uint8)(v), (bytes32)(inputs[i+5]), (bytes32)(inputs[i+6]))) 
                continue; // Should we need the event if verify fail???
            // internalTrade not yet implement 
            (tosb, tobb) = internalTrade(inputAddresses[i+3], inputAddresses[0], inputAddresses[1], inputInts[3*i], inputInts[3*i+1], makeHash, tosb, tobb);
        }

        // update taker blance
        updateBalance(tosb, tobb, inputAddresses[2], hash, inputAddresses[0], inputAddresses[1], inputInts[0]);
    }

    // helper functions
    function getBalance (address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function getOrderHash (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 nonce) 
        public view returns (bytes32 hash) 
    {
        return keccak256("Joyso", maker, tokenSell, tokenBuy, amountSell, amountBuy, nonce);
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        // bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        // bytes32 prefixedHash = keccak256(prefix, hash);
        // return ecrecover(prefixedHash, v, r, s) == sender;
        return ecrecover(hash, v, r, s) == sender;
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
}