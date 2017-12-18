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

    struct Order {
        uint256 amountSell;
        uint256 amountBuy;
        uint256 gasFee;
        uint256 data;
        uint256 tokenId;
        uint256 isBuy;
        bytes32 orderHash;
    }

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
        return ecrecover(hash, v, r, s) == sender;
        // return true;
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
        uint256 userId;
        uint256 tokenId;
        uint256 paymentMethod;
        (paymentMethod, tokenId, userId) = decodeWithdrawData(inputs[2]);
        address token = tokenId2Address[tokenId];
        address user = userId2Address[userId];
        uint256 data = genUserSignedWithdrawData(inputs[2], token);

        bytes32 hash = keccak256(this, inputs[0], inputs[1], data);
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
            data [14..21] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
            data [23..23] (uint256) isBuy --> always 0, should be modified in contract
            data [24..63] (address) tokenAddress
         */
        uint256[7] memory datas = this.decodeTakerOrderData(inputs[3]);
        bytes32 orderHash = getOrderDataHash(inputs[0], inputs[1], inputs[2], genUserSignedOrderData(inputs[3], datas[3], tokenId2Address[datas[4]]));
        // TODO: should check the nonce here
        require (orderFills[orderHash] == 0);
        require (verify(orderHash, userId2Address[decodeOrderUserId(inputs[3])], (uint8)(retrieveV(inputs[3])), (bytes32)(inputs[4]), (bytes32)(inputs[5])));

        datas[3] = datas[3] ^ ORDER_ISBUY;
        uint256 tosb = inputs[0]; // taker order sell balance
        uint256 tobb = 0;  // taker order buy balance
        for (uint256 i = 6; i < inputs.length; i+=6) {
            // TODO: we should guerentee the maker's price is better than taker's price
            // TODO: should we guerentee the maker's price is better than the next maker's price?
            if (tosb <= 0) 
                break;
            bytes32 makerOrderHash = getOrderDataHash(inputs[i], inputs[i+1], inputs[i+2], genUserSignedOrderData(inputs[i+3], datas[3], tokenId2Address[datas[4]]));
            require(verify(makerOrderHash, userId2Address[decodeOrderUserId(inputs[i+3])], (uint8)(retrieveV(inputs[i+3])), (bytes32)(inputs[i+4]), (bytes32)(inputs[i+5])));
            // internalTrade not yet implement 
            //(tosb, tobb) = internalTrade(inputs[i], inputs[i+1], tosb, tobb, inputs[i+3], inputs[i+2], isBuy, tokenId2Address[0], makerOrderHash); 
            (tosb, tobb) = internalTrade(subArray(i, i+3, inputs), tosb, tobb, datas[3], datas[4], makerOrderHash);
        }

        updateTakerBalance(subArray(0, 3, inputs), tosb, tobb, datas[3], datas[4], orderHash);
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

    function updateTakerBalance (uint256[] inputs, uint256 tosb, uint256 tobb, uint256 isBuy, uint256 tokenId, bytes32 orderHash) {
        uint256 etherGet;
        uint256 tokenGet;
        if (isBuy == ORDER_ISBUY) { // (to maker) buy ether, sell token --> tosb uint is ether, tobb unit is token
            etherGet = tosb;
            tokenGet = tobb;
        } else {
            etherGet = tobb;
            tokenGet = tosb;
        }
        uint256 etherFee = calculateEtherFee(inputs, etherGet, orderHash);
        uint256 joyFee = calculateJoyFee(inputs, etherGet, orderHash);
        updateUserBalance(inputs, isBuy, etherGet, tokenGet, etherFee, joyFee, tokenId);
        orderFills[orderHash] = orderFills[orderHash].add(tobb);
    }

    function internalTrade (uint256[] inputs, uint256 _tosb, uint256 _tobb, uint256 isBuy, uint256 tokenId, bytes32 orderHash) 
        internal returns (uint256 tosb, uint256 tobb) 
    {
        uint256 matchCase = determinedMatchCase(inputs, _tosb, orderHash);
        uint256 etherGet = calculateEtherGet(matchCase, inputs, _tosb, isBuy, orderHash);
        uint256 tokenGet = calculateTokenGet(inputs, etherGet);
        uint256 etherFee = calculateEtherFee(inputs, etherGet, orderHash);
        uint256 joyFee = calculateJoyFee(inputs, etherGet, orderHash);
        updateUserBalance( inputs, isBuy, etherGet, tokenGet, etherFee, joyFee, tokenId);
        (tosb, tobb) = updateTakerOrder(isBuy, _tosb, _tobb, etherGet, tokenGet);
    }

    function updateTakerOrder(uint256 isBuy, uint256 _tosb, uint256 _tobb, uint256 etherGet, uint256 tokenGet) returns (uint256 tosb, uint256 tobb) {
        if (isBuy == ORDER_ISBUY) { // (to maker) buy ether, sell token --> _tosb uint is ether, _tobb unit is token
            tosb = _tosb.sub(etherGet);
            tobb = _tobb.add(tokenGet);
        } else {
            tosb = _tosb.sub(tokenGet);
            tobb = _tobb.add(etherGet);
        }
    }

    function updateUserBalance(uint256[] inputs, uint256 isBuy, uint256 etherGet, uint256 tokenGet, uint256 etherFee, uint256 joyFee, uint256 tokenId) internal {
        address user = userId2Address[decodeOrderUserId(inputs[3])];
        address token = tokenId2Address[tokenId];
        if (isBuy == ORDER_ISBUY) { // buy ether, sell token
            balances[0][user] = balances[0][user].add(etherGet.sub(etherFee));
            balances[token][user] = balances[token][user].sub(tokenGet);
        } else {
            balances[0][user] = balances[0][user].sub(etherGet.add(etherFee));
            balances[token][user] = balances[token][user].add(tokenGet);
        }

        if(joyFee != 0) {
            balances[joyToken][user] = balances[joyToken][user].sub(joyFee);
            balances[joyToken][joysoWallet] = balances[joyToken][joysoWallet].add(joyFee);
        } else { 
            balances[0][joysoWallet] = balances[0][joysoWallet].add(etherFee);
        }
    }

    function determinedMatchCase (uint256[] inputs, uint256 _tosb, bytes32 orderHash) view returns (uint256) {
        uint256 tradeAmount = inputs[1].sub(orderFills[orderHash]);
        if (_tosb >= tradeAmount) {
            return 1;
        } else {
            return 2;
        }
    }

    function calculateJoyFee (uint256[] inputs, uint256 etherGet, bytes32 orderHash) returns (uint256) {
        uint256 joyPrice = decodeOrderJoyPrice(inputs[3]);
        if (joyPrice != 0) {
            uint256 joyFee = 0;
            if (orderFills[orderHash] == 0) {
                joyFee.add(inputs[2]);
            }

            uint256 txFee = etherGet.mul(decodeOrderMakerFee(inputs[3])).div(10000);
            uint256 toJoy = txFee.mul(10).div(joyPrice);
            return joyFee.add(toJoy);
        } else {
            return 0;
        }
    }

    function calculateEtherFee (uint256[] inputs, uint256 etherGet, bytes32 orderHash) view returns (uint256) {
        if (decodeOrderJoyPrice(inputs[3]) != 0) {
            return 0;
        } else {
            uint256 etherFee = 0;
            if (orderFills[orderHash] == 0) {
                etherFee.add(inputs[2]);
            }

            uint256 txFee = etherGet.mul(decodeOrderMakerFee(inputs[3])).div(10000);
            return etherFee.add(txFee);
        }
    }

    function calculateTokenGet (uint256[] inputs, uint256 etherGet) returns (uint256) {
        return etherGet.mul(inputs[1]).div(inputs[0]);
    }

    function calculateEtherGet (uint256 matchCase, uint256[] inputs, uint256 _tosb, uint256 isBuy, bytes32 orderHash) view returns (uint256) {
        if (matchCase == 1 && isBuy == ORDER_ISBUY) { // buy ether, the unit of amountBuy is Ether
            return inputs[1].sub(orderFills[orderHash]);
        } else if (matchCase == 1 && isBuy == 0) {    // sell ether, the unit of amountBuy is token, turn to ether 
            return inputs[1].sub(orderFills[orderHash]).mul(inputs[0]).div(inputs[1]);
        } else if (matchCase == 2 && isBuy == ORDER_ISBUY) { // buy ether, the unit of amountBuy is Ether
            return _tosb;
        } else { // matchCase == 2 && isBuy == 0
            return _tosb.mul(inputs[0]).div(inputs[1]);
        }
    }
}
