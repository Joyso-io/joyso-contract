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
    uint256 constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

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

    function lockMe () public {
        userLock[msg.sender] = block.number.add(lockPeriod);
        Lock (msg.sender, userLock[msg.sender]);
    }

    function unlockme () public {
        userLock[msg.sender] = 0;
        Lock (msg.sender, userLock[msg.sender]);
    }

    // -------------------------------------------- helper functions
    function getBalance (address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function getWithdrawDataHash (uint256 amount, uint256 gas, uint256 data) public view returns (bytes32) {
        return keccak256(this, amount, gas, data);
    }

    function getOrderDataHash (uint256 amountSell, uint256 amountBuy, uint256 gasFee, uint256 data) public view returns (bytes32) {
        return keccak256(this, amountSell, amountBuy, gasFee, data);
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        //return ecrecover(hash, v, r, s) == sender;
         return true;
    }

    // -------------------------------------------- only admin 
    function registerToken (address tokenAddress, uint256 index) onlyAdmin {
        require (index > 1);
        require (address2Id[tokenAddress] == 0);
        address2Id[tokenAddress] = index;
        tokenId2Address[index] = tokenAddress;
    }

    function addToAdmin (address admin, bool isAdd) onlyAdmin public {
        isAdmin[admin] = isAdd;
    }

    function withdrawByAdmin (uint256[] inputs) onlyAdmin public {
        /**
            inputs[0] (uint256) amount;
            inputs[1] (uint256) gasFee;
            inputs[2] (uint256) dataV
            inputs[3] (bytes32) r
            inputs[4] (bytes32) s
            -----------------------------------
            dataV[0 .. 7] (uint256) nonce --> doesnt used when withdraw
            dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            dataV[24..24] (uint256) v --> should be uint8 when used
            dataV[52..55] (uint256) tokenId
            dataV[56..63] (uint256) userId
            -----------------------------------
            user withdraw singature (uint256)
            (this.address, amount, gasFee, data)
            -----------------------------------
            data [0 .. 7] (uint256) nonce --> does not used when withdraw
            data [23..23] (uint256) paymentMethod
            data [24..63] (address) tokenAddress
         */
        uint256 v_256 = retrieveV(inputs[2]);
        var (paymentMethod, tokenId, userId) = decodeWithdrawData(inputs[2]);
        address token = tokenId2Address[tokenId];
        address user = userId2Address[userId];
        uint256 data = genUserSignedWithdrawData(inputs[2], token);

        bytes32 hash = getWithdrawDataHash(inputs[0], inputs[1], data);
        require (!usedHash[hash]);
        require (verify(hash, user, (uint8)(v_256), (bytes32)(inputs[3]), (bytes32)(inputs[4])));

        address gasToken = 0;
        if (paymentMethod == PAY_BY_JOY) { // pay fee by JOY
            gasToken = joyToken;
        } else if (paymentMethod == PAY_BY_TOKEN) { // pay fee by tx token
            gasToken = token;
        }

        if (gasToken == token) { // pay by ether or token
            require (balances[token][user] >= inputs[0].add(inputs[1]));
            balances[token][user] = balances[token][user].sub(inputs[0].add(inputs[1]));
        } else {
            require (balances[token][user] >= inputs[0]);
            require (balances[gasToken][user] >= inputs[1]);
            balances[token][user] = balances[token][user].sub(inputs[0]);
            balances[gasToken][user] = balances[gasToken][user].sub(inputs[1]);
        }
        balances[gasToken][joysoWallet] = balances[gasToken][joysoWallet].add(inputs[1]);

        usedHash[hash] = true;

        if (token == 0) {
            msg.sender.transfer(inputs[0]);
        } else {
            require(Token(token).transfer(msg.sender, inputs[0]));
        }
        Withdraw(token, user, inputs[0], balances[token][user]);
    }

    function matchByAdmin (uint256[] inputs) onlyAdmin public {
        /**
            inputs[6*i .. (6*i+5)] order i, order1 is taker, other orders are maker  
            inputs[6i] (uint256) amountSell
            inputs[6i+1] (uint256) amountBuy
            inputs[6i+2] (uint256) gasFee
            inputs[6i+3] (uint256) dataV
            inputs[6i+4] (bytes32) r
            inputs[6i+5] (bytes32) s
            -----------------------------------
            dataV[0 .. 7] (uint256) nonce 
            dataV[8 ..11] (uint256) takerFee
            dataV[12..15] (uint256) makerFee
            dataV[16..22] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
            dataV[23..23] (uint256) isBuy --> always 0, should be modified in contract
            dataV[24..24] (uint256) v --> should be uint8 when used, 0: 27, 1: 28
            dataV[49..51] (uint256) tokenSellId
            dataV[52..55] (uint256) tokenBuyId
            dataV[56..63] (uint256) userId
            -----------------------------------
            user order singature (uint256)
            (this.address, amountSell, amountBuy, gasFee, data)
            -----------------------------------
            data [0 .. 7] (uint256) nonce 
            data [8 ..11] (uint256) takerFee
            data [12..15] (uint256) makerFee
            data [16..22] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
            data [23..23] (uint256) isBuy --> always 0, should be modified in contract
            data [24..63] (address) tokenAddress
         */
        var (tokenId, isBuy) = decodeOrderTokenIdAndIsBuy(inputs[3]);
        bytes32 orderHash = getOrderDataHash(inputs[0], inputs[1], inputs[2], genUserSignedOrderData(inputs[3], isBuy, tokenId2Address[tokenId]));
        // TODO: should check the nonce here
        require (orderFills[orderHash] == 0);
        require (verify(orderHash, userId2Address[decodeOrderUserId(inputs[3])], (uint8)(retrieveV(inputs[3])), (bytes32)(inputs[4]), (bytes32)(inputs[5])));

        isBuy = isBuy ^ ORDER_ISBUY;
        uint256 tosb = inputs[0]; // taker order sell balance
        uint256 tobb = 0;  // taker order buy balance
        for (uint256 i = 6; i < inputs.length; i+=6) {
            // TODO: we should guerentee the maker's price is better than taker's price
            // TODO: should we guerentee the maker's price is better than the next maker's price?
            if (tosb <= 0) 
                break;
            bytes32 makerOrderHash = getOrderDataHash(inputs[i], inputs[i+1], inputs[i+2], genUserSignedOrderData(inputs[i+3], isBuy, tokenId2Address[tokenId]));
            require(verify(makerOrderHash, userId2Address[decodeOrderUserId(inputs[i+3])], (uint8)(retrieveV(inputs[i+3])), (bytes32)(inputs[i+4]), (bytes32)(inputs[i+5])));
            (tosb, tobb) = internalTrade(inputs[i], inputs[i+1], inputs[i+2], inputs[i+3], tosb, tobb, isBuy, tokenId, makerOrderHash);
        }

        updateTakerBalance(inputs[0], inputs[1], inputs[2], inputs[3], tosb, tobb, isBuy, tokenId, orderHash);
    }

    // -------------------------------------------- internal/private function
    function addUser (address _address) internal {
        if (address2Id[_address] != 0) {
            return;
        }
        userCount += 1;
        address2Id[_address] = userCount;
        userId2Address[userCount] = _address;
        NewUser(_address, userCount);
    }

    function updateTakerBalance (uint256 amountSell, uint256 amountBuy, uint256 gasFee, uint256 data, uint256 tosb, uint256 tobb, uint256 isBuy, uint256 tokenId, bytes32 orderHash) {
        uint256 etherGet;
        uint256 tokenGet;
        if (isBuy == ORDER_ISBUY) { // (to maker) buy token, sell ether --> (to taker) tosb unit is token, tobb unit is ether
            etherGet = tobb;
            tokenGet = amountSell.sub(tosb);
        } else {
            etherGet = amountSell.sub(tosb);
            tokenGet = tobb;
        }
        uint256 etherFee = calculateEtherFee(gasFee, data, etherGet, orderHash, true);
        uint256 joyFee = calculateJoyFee(gasFee, data, etherGet, orderHash);
        updateUserBalance(data, isBuy ^ ORDER_ISBUY, etherGet, tokenGet, etherFee, joyFee, tokenId);
        orderFills[orderHash] = orderFills[orderHash].add(tobb);
    }

    function internalTrade (uint256 amountSell, uint256 amountBuy, uint256 gasFee, uint256 data, uint256 _tosb, uint256 _tobb, uint256 isBuy, uint256 tokenId, bytes32 orderHash) 
        internal returns (uint256 tosb, uint256 tobb) 
    {
        uint256 etherGet = calculateEtherGet(amountSell, amountBuy, _tosb, isBuy, orderHash);
        uint256 tokenGet = calculateTokenGet(amountSell, amountBuy, etherGet);
        uint256 etherFee = calculateEtherFee(gasFee, data, etherGet, orderHash, false);
        uint256 joyFee = calculateJoyFee(gasFee, data, etherGet, orderHash);
        updateUserBalance(data, isBuy, etherGet, tokenGet, etherFee, joyFee, tokenId);
        (tosb, tobb) = updateTakerOrder(isBuy, _tosb, _tobb, etherGet, tokenGet);
    }

    function updateTakerOrder(uint256 isBuy, uint256 _tosb, uint256 _tobb, uint256 etherGet, uint256 tokenGet) returns (uint256 tosb, uint256 tobb) {
        if (isBuy == ORDER_ISBUY) { // (to maker) buy token, sell ether --> (to taker) _tosb unit is token, _tobb unit is ether
            tosb = _tosb.sub(tokenGet);
            tobb = _tobb.add(etherGet);
        } else {
            tosb = _tosb.sub(etherGet);
            tobb = _tobb.add(tokenGet);
        }
    }

    event Logg(bool isBuy, uint256 balance, uint256 Get, uint256 Fee);
    function updateUserBalance(uint256 data, uint256 isBuy, uint256 etherGet, uint256 tokenGet, uint256 etherFee, uint256 joyFee, uint256 tokenId) internal {
        address user = userId2Address[decodeOrderUserId(data)];
        address token = tokenId2Address[tokenId];
        if (isBuy == ORDER_ISBUY) { // buy token, sell ether
            balances[0][user] = balances[0][user].sub(etherGet).sub(etherFee);
            balances[token][user] = balances[token][user].add(tokenGet);
        } else {
            balances[0][user] = balances[0][user].add(etherGet.sub(etherFee));
            balances[token][user] = balances[token][user].sub(tokenGet);
        }

        if(joyFee != 0) {
            balances[joyToken][user] = balances[joyToken][user].sub(joyFee);
            balances[joyToken][joysoWallet] = balances[joyToken][joysoWallet].add(joyFee);
        } else { 
            balances[0][joysoWallet] = balances[0][joysoWallet].add(etherFee);
        }
    }

    function calculateJoyFee (uint256 gasFee, uint256 data, uint256 etherGet, bytes32 orderHash) returns (uint256) {
        uint256 joyPrice = decodeOrderJoyPrice(data);
        if (joyPrice != 0) {
            uint256 joyFee = 0;
            if (orderFills[orderHash] == 0) {
                joyFee.add(gasFee);
            }

            uint256 txFee = etherGet.mul(decodeOrderMakerFee(data).div(10000));
            uint256 toJoy = txFee.mul(10).div(joyPrice);
            return joyFee.add(toJoy);
        } else {
            return 0;
        }
    }

    function calculateEtherFee (uint256 gasFee, uint256 data, uint256 etherGet, bytes32 orderHash, bool isTaker) view returns (uint256) {
        if (decodeOrderJoyPrice(data) != 0) {
            return 0;
        } else {
            uint256 etherFee = 0;
            if (orderFills[orderHash] == 0) {
                etherFee = etherFee.add(gasFee);
            }

            uint256 txFee;
            if(isTaker){
                txFee =  etherGet.mul(decodeOrderTakerFee(data)).div(10000);
            } else {
                txFee = etherGet.mul(decodeOrderMakerFee(data)).div(10000);
            }
            return etherFee.add(txFee);
        }
    }

    function calculateTokenGet (uint256 amountSell, uint256 amountBuy, uint256 etherGet) returns (uint256) {
        return etherGet.mul(amountSell).div(amountBuy);
    }

    function calculateEtherGet (uint256 amountSell, uint256 amountBuy, uint256 _tosb, uint256 isBuy, bytes32 orderHash) view returns (uint256) {
        uint256 tradeAmount = amountBuy.sub(orderFills[orderHash]);
        if (_tosb >= tradeAmount && isBuy == ORDER_ISBUY) { // buy token, the unit of amountBuy is token, turn to ether
            return amountBuy.sub(orderFills[orderHash]).mul(amountSell).div(amountBuy);
        } else if (_tosb >= tradeAmount && isBuy == 0) {    // sell token, the unit of amountBuy is ether 
            return amountBuy.sub(orderFills[orderHash]);
        } else if (_tosb < tradeAmount && isBuy == ORDER_ISBUY) { // buy token, the unit of amountBuy is token, turn to ether
            return _tosb.mul(amountSell).div(amountBuy);
        } else {
            return _tosb;
        }
    }
}

