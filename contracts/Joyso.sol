pragma solidity ^0.4.17;

import "./libs/SafeMath.sol";
import "./libs/Ownable.sol";
import "./JoysoDataDecoder.sol";
import {ERC20 as Token} from "./libs/ERC20.sol";

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

    function Joyso (address _joysoWallet, address _joyToken) public {
        joysoWallet = _joysoWallet;
        addUser(_joysoWallet);
        joyToken = _joyToken;
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
        require(getBlock() > userLock[msg.sender] && userLock[msg.sender] != 0);
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
        userLock[msg.sender] = getBlock().add(lockPeriod);
        Lock (msg.sender, userLock[msg.sender]);
    }

    function unlockMe () public {
        userLock[msg.sender] = 0;
        Lock (msg.sender, userLock[msg.sender]);
    }

    // -------------------------------------------- helper functions
    function getBlock () public view returns (uint256) {
        return block.number;
    }

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
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hash);
        address signer = ecrecover(prefixedHash, v, r, s);
        return signer == sender;
    }

    // -------------------------------------------- only admin 
    function registerToken (address tokenAddress, uint256 index) public onlyAdmin {
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
            user.transfer(inputs[0]);
        } else {
            require(Token(token).transfer(user, inputs[0]));
        }
    }

    event TradeSuccess(address user, uint256 etherGet, uint256 tokenGet, uint256 isBuy, uint256 etherFee, uint256 joyFee);
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

        uint256 tokenExecute = isBuy == ORDER_ISBUY ? inputs[1] : inputs[0]; // taker order token execute
        uint256 etherExecute = 0;  // taker order ether execute
        
        isBuy = isBuy ^ ORDER_ISBUY;
        for (uint256 i = 6; i < inputs.length; i+=6) {
            // maker price should lower than taker price
            require (tokenExecute > 0 && inputs[1].mul(inputs[i+1]) <= inputs[0].mul(inputs[i]));     
            bytes32 makerOrderHash = getOrderDataHash(inputs[i], inputs[i+1], inputs[i+2], genUserSignedOrderData(inputs[i+3], isBuy, tokenId2Address[tokenId]));
            require (verify(makerOrderHash, userId2Address[decodeOrderUserId(inputs[i+3])], (uint8)(retrieveV(inputs[i+3])), (bytes32)(inputs[i+4]), (bytes32)(inputs[i+5])));
            (tokenExecute, etherExecute) = internalTrade(inputs[i], inputs[i+1], inputs[i+2], inputs[i+3], tokenExecute, etherExecute, isBuy, tokenId, makerOrderHash);
        }

        isBuy = isBuy ^ ORDER_ISBUY;
        tokenExecute = isBuy == ORDER_ISBUY ? inputs[1].sub(tokenExecute) : inputs[0].sub(tokenExecute);
        processTakerOrder(inputs[2], inputs[3], tokenExecute, etherExecute, isBuy, tokenId, orderHash);
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

    function processTakerOrder (uint256 gasFee, uint256 data, uint256 tokenExecute, uint256 etherExecute, uint256 isBuy, uint256 tokenId, bytes32 orderHash) 
        internal
    {
        uint256 etherFee = calculateEtherFee(gasFee, data, etherExecute, orderHash, true);
        uint256 joyFee = calculateJoyFee(gasFee, data, etherExecute, orderHash, true);
        updateUserBalance(data, isBuy, etherExecute, tokenExecute, etherFee, joyFee, tokenId);
        orderFills[orderHash] = orderFills[orderHash].add(tokenExecute);
        TradeSuccess(userId2Address[decodeOrderUserId(data)], etherExecute, tokenExecute, isBuy, etherFee, joyFee);
    }

    function internalTrade (uint256 amountSell, uint256 amountBuy, uint256 gasFee, uint256 data, uint256 _tokenExecute, uint256 _etherExecute, uint256 isBuy, uint256 tokenId, bytes32 orderHash) 
        internal returns (uint256 tokenExecute, uint256 etherExecute) 
    {
        uint256 tokenGet = calculateTokenGet(amountSell, amountBuy, _tokenExecute, isBuy, orderHash);
        uint256 etherGet = calculateEtherGet(amountSell, amountBuy, isBuy, tokenGet);
        uint256 etherFee = calculateEtherFee(gasFee, data, etherGet, orderHash, false);
        uint256 joyFee = calculateJoyFee(gasFee, data, etherGet, orderHash, false);
        updateUserBalance(data, isBuy, etherGet, tokenGet, etherFee, joyFee, tokenId);
        orderFills[orderHash] = orderFills[orderHash].add(tokenGet);
        (tokenExecute, etherExecute) = updateTradeAmount(_tokenExecute, _etherExecute, etherGet, tokenGet);
        TradeSuccess(userId2Address[decodeOrderUserId(data)], etherGet, tokenGet, isBuy, etherFee, joyFee);
    }

    function updateTradeAmount (uint256 _tokenExecute, uint256 _etherExecute, uint256 etherGet, uint256 tokenGet) 
        internal pure returns (uint256 tokenExecute, uint256 etherExecute) 
    {
        tokenExecute = _tokenExecute.sub(tokenGet);
        etherExecute = _etherExecute.add(etherGet);
    }

    function updateUserBalance (uint256 data, uint256 isBuy, uint256 etherGet, uint256 tokenGet, uint256 etherFee, uint256 joyFee, uint256 tokenId) internal {
        address user = userId2Address[decodeOrderUserId(data)];
        address token = tokenId2Address[tokenId];
        if (isBuy == ORDER_ISBUY) { // buy token, sell ether
            balances[0][user] = balances[0][user].sub(etherGet).sub(etherFee);
            balances[token][user] = balances[token][user].add(tokenGet);
        } else {
            balances[0][user] = balances[0][user].add(etherGet).sub(etherFee);
            balances[token][user] = balances[token][user].sub(tokenGet);
        }

        if(joyFee != 0) {
            balances[joyToken][user] = balances[joyToken][user].sub(joyFee);
            balances[joyToken][joysoWallet] = balances[joyToken][joysoWallet].add(joyFee);
        } else { 
            balances[0][joysoWallet] = balances[0][joysoWallet].add(etherFee);
        }
    }

    function calculateJoyFee (uint256 gasFee, uint256 data, uint256 etherGet, bytes32 orderHash, bool isTaker) 
        internal view returns (uint256) {
        uint256 joyPrice = decodeOrderJoyPrice(data);
        if (joyPrice != 0) {
            uint256 joyFee = orderFills[orderHash] == 0 ? gasFee : 0;
            uint256 txFee;
            if (isTaker) {
                txFee = etherGet.mul(decodeOrderTakerFee(data)).div(10000);
            } else {
                txFee = etherGet.mul(decodeOrderMakerFee(data)).div(10000);
            }
            //uint256 txFee = isTaker ? etherGet.mul(decodeOrderTakerFee(data)).div(10000) : etherGet.mul(decodeOrderMakerFee(data)).div(10000);
            uint256 toJoy = txFee.div(10 ** 5).div(joyPrice);
            return joyFee.add(toJoy);
        } else { 
            return 0;
        }
    }

    function calculateEtherFee (uint256 gasFee, uint256 data, uint256 etherGet, bytes32 orderHash, bool isTaker) internal view returns (uint256) {
        if (decodeOrderJoyPrice(data) != 0) {
            return 0;
        } else {
            uint256 etherFee = orderFills[orderHash] == 0 ? gasFee : 0;
            uint256 txFee;
            if (isTaker) {
                txFee = etherGet.mul(decodeOrderTakerFee(data)).div(10000);
            } else {
                txFee = etherGet.mul(decodeOrderMakerFee(data)).div(10000);
            }
            //uint256 txFee = isTaker ? etherGet.mul(decodeOrderTakerFee(data)).div(10000) : etherGet.mul(decodeOrderMakerFee(data)).div(10000);
            return etherFee.add(txFee);
        }
    }

    function calculateEtherGet (uint256 amountSell, uint256 amountBuy, uint256 isBuy, uint256 tokenGet) internal pure returns (uint256) {
        return isBuy == ORDER_ISBUY ? tokenGet.mul(amountSell).div(amountBuy): tokenGet.mul(amountBuy).div(amountSell) ;
    }

    function calculateTokenGet (uint256 amountSell, uint256 amountBuy, uint256 _tokenExecute, uint256 isBuy, bytes32 orderHash) internal view returns (uint256) {
        uint256 tradeTokenAmount = isBuy == ORDER_ISBUY ? amountBuy : amountSell;
        tradeTokenAmount = tradeTokenAmount.sub(orderFills[orderHash]);
        return tradeTokenAmount >= _tokenExecute ? _tokenExecute : tradeTokenAmount;
    }
}

