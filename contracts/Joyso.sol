pragma solidity 0.4.19;

import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./libs/SafeMath.sol";
import "./Migratable.sol";
import "./JoysoDataDecoder.sol";


contract Joyso is Ownable, JoysoDataDecoder {
    using SafeMath for uint256;

    uint256 internal constant PAY_BY_TOKEN = 0x0000000000000000000000020000000000000000000000000000000000000000;
    uint256 internal constant PAY_BY_JOY = 0x0000000000000000000000010000000000000000000000000000000000000000;
    uint256 internal constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    mapping (address => mapping (address => uint256)) public balances;
    mapping (address => uint256) public userLock;
    mapping (address => uint256) public userNonce;
    mapping (bytes32 => uint256) public orderFills;
    mapping (bytes32 => bool) public usedHash;
    mapping (address => bool) public isAdmin;
    mapping (uint256 => address) public tokenId2Address;
    mapping (uint256 => address) public userId2Address;
    mapping (address => uint256) public userAddress2Id;
    mapping (address => uint256) public tokenAddress2Id;

    address public joysoWallet;
    address public joyToken;
    uint256 public lockPeriod = 30 days;
    uint256 public userCount;

    modifier onlyAdmin {
        require(msg.sender == owner || isAdmin[msg.sender]);
        _;
    }

    //events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event NewUser(address user, uint256 id);
    event Lock(address user, uint256 timeLock);

    // for debug
    event TradeSuccess(address user, uint256 etherGet, uint256 tokenGet, uint256 isBuy, uint256 fee);

    function Joyso(address _joysoWallet, address _joyToken) public {
        joysoWallet = _joysoWallet;
        addUser(_joysoWallet);
        joyToken = _joyToken;
        tokenAddress2Id[joyToken] = 1;
        tokenAddress2Id[0] = 0; // ether address is Id 0
        tokenId2Address[0] = 0;
        tokenId2Address[1] = joyToken;
    }

    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.
      */
    function depositToken(address token, uint256 amount) external {
        require(tokenAddress2Id[token] != 0);
        addUser(msg.sender);
        require(ERC20(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function depositEther() external payable {
        addUser(msg.sender);
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);
        Deposit(0, msg.sender, msg.value, balances[0][msg.sender]);
    }

    function withdraw(address token, uint256 amount) external {
        require(getTime() > userLock[msg.sender] && userLock[msg.sender] != 0);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require(ERC20(token).transfer(msg.sender, amount));
        }
        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function lockMe() external {
        require(userAddress2Id[msg.sender] != 0);
        userLock[msg.sender] = getTime() + lockPeriod;
        Lock(msg.sender, userLock[msg.sender]);
    }

    function unlockMe() external {
        require(userAddress2Id[msg.sender] != 0);
        userLock[msg.sender] = 0;
        Lock(msg.sender, userLock[msg.sender]);
    }

    // only owner
    function addToAdmin(address admin, bool isAdd) external onlyOwner {
        isAdmin[admin] = isAdd;
    }

    function changeJoysoWallet(address _new) external onlyOwner {
        require(_new != address(0));
        joysoWallet = _new;
    }

    function changeLockPeriod(uint256 _periodInDays) external onlyOwner {
        require(_periodInDays * 1 days < 30 * 1 days && _periodInDays >= 1 * 1 days);
        lockPeriod = _periodInDays * 1 days;
    }

    // -------------------------------------------- only admin
    function registerToken(address tokenAddress, uint256 index) external onlyAdmin {
        require(index > 1);
        require(tokenAddress2Id[tokenAddress] == 0);
        require(tokenId2Address[index] == 0);
        tokenAddress2Id[tokenAddress] = index;
        tokenId2Address[index] = tokenAddress;
    }

    /**
        inputs[0] (uint256) amount;
        inputs[1] (uint256) gasFee;
        inputs[2] (uint256) dataV
        inputs[3] (bytes32) r
        inputs[4] (bytes32) s
        -----------------------------------
        dataV[0 .. 7] (uint256) nonce --> doesnt used in contract, its for generating different hash
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
    function withdrawByAdmin_Unau(uint256[] inputs) external onlyAdmin {
        uint256 v256 = retrieveV(inputs[2]);
        uint256 paymentMethod = decodeWithdrawPaymentMethod(inputs[2]);
        address token = tokenId2Address[decodeWithdrawTokenId(inputs[2])];
        address user = userId2Address[decodeWithdrawUserId(inputs[2])];
        uint256 data = genUserSignedWithdrawData(inputs[2], token);

        bytes32 hash = getWithdrawDataHash(inputs[0], inputs[1], data);
        require(!usedHash[hash]);
        require(verify(hash, user, uint8(v256), bytes32(inputs[3]), bytes32(inputs[4])));

        address gasToken = 0;
        if (paymentMethod == PAY_BY_JOY) { // pay fee by JOY
            gasToken = joyToken;
        } else if (paymentMethod == PAY_BY_TOKEN) { // pay fee by tx token
            gasToken = token;
        }

        if (gasToken == token) { // pay by ether or token
            balances[token][user] = balances[token][user].sub(inputs[0].add(inputs[1]));
        } else {
            balances[token][user] = balances[token][user].sub(inputs[0]);
            balances[gasToken][user] = balances[gasToken][user].sub(inputs[1]);
        }
        balances[gasToken][joysoWallet] = balances[gasToken][joysoWallet].add(inputs[1]);

        usedHash[hash] = true;

        if (token == 0) {
            user.transfer(inputs[0]);
        } else {
            require(ERC20(token).transfer(user, inputs[0]));
        }
    }

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
    function matchByAdmin_TwH36(uint256[] inputs) external onlyAdmin {
        uint256 tokenId;
        uint256 isBuy;
        (tokenId, isBuy) = decodeOrderTokenIdAndIsBuy(inputs[3]);
        bytes32 orderHash = getOrderDataHash(inputs, 0, isBuy, tokenId);
        // check taker order nonce
        require(decodeOrderNonce(inputs[3]) > userNonce[userId2Address[decodeOrderUserId(inputs[3])]]);
        require(
            verify(
                orderHash,
                userId2Address[decodeOrderUserId(inputs[3])],
                uint8(retrieveV(inputs[3])),
                bytes32(inputs[4]),
                bytes32(inputs[5])
            )
        );

        uint256 tokenExecute = isBuy == ORDER_ISBUY ? inputs[1] : inputs[0]; // taker order token execute
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        require(tokenExecute != 0); // the taker order should remain something to trade
        uint256 etherExecute = 0;  // taker order ether execute

        isBuy = isBuy ^ ORDER_ISBUY;
        for (uint256 i = 6; i < inputs.length; i += 6) {
            //check price, maker price should lower than taker price
            require(tokenExecute > 0 && inputs[1].mul(inputs[i + 1]) <= inputs[0].mul(inputs[i]));

            // check maker order nonce
            require(decodeOrderNonce(inputs[i + 3]) > userNonce[userId2Address[decodeOrderUserId(inputs[i + 3])]]);
            bytes32 makerOrderHash = getOrderDataHash(inputs, i, isBuy, tokenId);
            require(
                verify(
                    makerOrderHash,
                    userId2Address[decodeOrderUserId(inputs[i + 3])],
                    uint8(retrieveV(inputs[i + 3])),
                    bytes32(inputs[i + 4]),
                    bytes32(inputs[i + 5])
                )
            );
            (tokenExecute, etherExecute) = internalTrade(
                inputs[i],
                inputs[i + 1],
                inputs[i + 2],
                inputs[i + 3],
                tokenExecute,
                etherExecute,
                isBuy,
                tokenId,
                0,
                makerOrderHash
            );
        }

        isBuy = isBuy ^ ORDER_ISBUY;
        tokenExecute = isBuy == ORDER_ISBUY ? inputs[1].sub(tokenExecute) : inputs[0].sub(tokenExecute);
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        processTakerOrder(inputs[2], inputs[3], tokenExecute, etherExecute, isBuy, tokenId, 0, orderHash);
    }

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
        dataV[16..22] (uint256) no use
        dataV[23..23] (uint256) isBuy --> 1: sell basetoken (tokenSellId) 0: buy basetoken (tokenBuyId)
        dataV[24..24] (uint256) v --> should be uint8 when used, 0: 27, 1: 28
        dataV[25..48] (uint256) joyPrice --> 0: pay baseToken, others: pay joy Token
        dataV[49..51] (uint256) tokenSellId
        dataV[52..55] (uint256) tokenBuyId
        dataV[56..63] (uint256) userId
        -----------------------------------
        user order singature (uint256)
        (this.address, amountSell, amountBuy, gasFee, data, baseTokenAddress, joyPrice)
        -----------------------------------
        data [0 .. 7] (uint256) nonce
        data [8 ..11] (uint256) takerFee
        data [12..15] (uint256) makerFee
        data [16..22] (uint256) no use
        data [23..23] (uint256) isBuy
        data [24..63] (address) tokenAddress
    */
    function matchTokenOrderByAdmin_k44j(uint256[] inputs) external onlyAdmin {
        uint256 tokenId;
        uint256 baseId;
        uint256 isBuy;
        (tokenId, baseId, isBuy) = decodeTokenOrderTokenIdAndIsBuy(inputs[3]);
        bytes32 orderHash = getTokenOrderDataHash(inputs, 0);
        // check taker order nonce
        require(decodeOrderNonce(inputs[3]) > userNonce[userId2Address[decodeOrderUserId(inputs[3])]]);
        require(
            verify(
                orderHash,
                userId2Address[decodeOrderUserId(inputs[3])],
                uint8(retrieveV(inputs[3])),
                bytes32(inputs[4]),
                bytes32(inputs[5])
            )
        );
        uint256 tokenExecute = isBuy == ORDER_ISBUY ? inputs[1] : inputs[0]; // taker order token execute
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        require(tokenExecute != 0); // the taker order should remain something to trade
        uint256 baseExecute = 0;  // taker order ether execute

        isBuy = isBuy ^ ORDER_ISBUY;
        for (uint256 i = 6; i < inputs.length; i += 6) {
            //check price, maker price should lower than taker price
            require(tokenExecute > 0 && inputs[1].mul(inputs[i + 1]) <= inputs[0].mul(inputs[i]));

            // check maker order nonce
            require(decodeOrderNonce(inputs[i + 3]) > userNonce[userId2Address[decodeOrderUserId(inputs[i + 3])]]);
            bytes32 makerOrderHash = getTokenOrderDataHash(inputs, i);
            require(
                verify(
                    makerOrderHash,
                    userId2Address[decodeOrderUserId(inputs[i + 3])],
                    uint8(retrieveV(inputs[i + 3])),
                    bytes32(inputs[i + 4]),
                    bytes32(inputs[i + 5])
                )
            );
            (tokenExecute, baseExecute) = internalTrade(
                inputs[i],
                inputs[i + 1],
                inputs[i + 2],
                inputs[i + 3],
                tokenExecute,
                baseExecute,
                isBuy,
                tokenId,
                baseId,
                makerOrderHash
            );
        }

        isBuy = isBuy ^ ORDER_ISBUY;
        tokenExecute = isBuy == ORDER_ISBUY ? inputs[1].sub(tokenExecute) : inputs[0].sub(tokenExecute);
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        processTakerOrder(inputs[2], inputs[3], tokenExecute, baseExecute, isBuy, tokenId, baseId, orderHash);
    }

    /**
        inputs[0]: gasFee
        inputs[1]: dataV
        inputs[2]: r
        inputs[3]: s
        ----------------------------------------
        dataV[ 0..7 ]: nonce
        dataV[23..23]: paymentMethod --> 0: ether, 1: JOY
        dataV[24..24]: (uint256) v --> should be uint8 when used
        dataV[56..63]: (uint256) userId
    */
    function cancelByAdmin(uint256[] inputs) external onlyAdmin {
        uint256 v256 = retrieveV(inputs[1]);
        uint256 nonce;
        uint256 paymentMethod;
        uint256 userId;
        (nonce, paymentMethod, userId) = decodeCancelData(inputs[1]);
        address user = userId2Address[userId];
        require(nonce > userNonce[user]);
        uint256 data = inputs[1] & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        bytes32 hash = getCancelDataHash(inputs[0], data);
        require(verify(hash, user, uint8(v256), bytes32(inputs[2]), bytes32(inputs[3])));

        // update balance
        address gasToken = 0;
        if (paymentMethod == PAY_BY_JOY) {
            gasToken = joyToken;
        }
        require(balances[gasToken][user] >= inputs[0]);
        balances[gasToken][user] = balances[gasToken][user].sub(inputs[0]);
        balances[gasToken][joysoWallet] = balances[gasToken][joysoWallet].add(inputs[0]);

        // update user nonce
        userNonce[user] = nonce;
    }

    // NOTES: migrate and withdraw share the same signature structure,
    //        should consider the security problem.
    /**
        inputs[0] (uint256) new contract address;
        inputs[i+1] (uint256) gasFee;
        inputs[i+2] (uint256) dataV
        inputs[i+3] (bytes32) r
        inputs[i+4] (bytes32) s
        -----------------------------------
        dataV[0 .. 7] (uint256) nonce --> doesnt used in contract, its for generating different hash
        dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
        dataV[24..24] (uint256) v --> should be uint8 when used
        dataV[52..55] (uint256) tokenId
        dataV[56..63] (uint256) userId
        -----------------------------------
        user migrate singature (uint256)
        (this.address, newAddress, gasFee, data)
        -----------------------------------
        data [0 .. 7] (uint256) nonce --> does not used when migrate
        data [23..23] (uint256) paymentMethod
        data [24..63] (address) tokenAddress
        */
    function migrateByAdmin(uint256[] inputs) external onlyAdmin {
        address token = tokenId2Address[decodeWithdrawTokenId(inputs[2])];
        for (uint256 i = 0; i < inputs.length / 4; i++) {
            address user = userId2Address[decodeWithdrawUserId(inputs[4 * i + 2])];
            bytes32 hash = getMigrateDataHash(
                address(inputs[0]),
                inputs[4 * i + 1],
                genUserSignedWithdrawData(inputs[4 * i + 2], token)
            );
            require(
                verify(
                    hash,
                    user,
                    uint8(retrieveV(inputs[4 * i + 2])),
                    bytes32(inputs[4 * i + 3]),
                    bytes32(inputs[4 * i + 4])
                )
            );
            uint256 paymentMethod = decodeWithdrawPaymentMethod(inputs[4 * i + 2]);
            if (paymentMethod == PAY_BY_JOY) {
                balances[joyToken][user] = balances[joyToken][user].sub(inputs[4 * i + 1]);
                balances[joyToken][joysoWallet] = balances[joyToken][joysoWallet].add(inputs[4 * i + 1]);
            } else if (paymentMethod == PAY_BY_TOKEN) {
                balances[token][user] = balances[token][user].sub(inputs[4 * i + 1]);
                balances[token][joysoWallet] = balances[token][joysoWallet].add(inputs[4 * i + 1]);
            } else {
                balances[0][user] = balances[0][user].sub(inputs[4 * i + 1]);
                balances[0][joysoWallet] = balances[0][joysoWallet].add(inputs[4 * i + 1]);
            }
            uint256 amount = balances[token][user];
            balances[token][user] = 0;
            if (token == 0) {
                Migratable(address(inputs[0])).migrate.value(amount)(user, amount, token);
            } else {
                ERC20(token).approve(address(inputs[0]), amount);
                Migratable(address(inputs[0])).migrate(user, amount, token);
            }
        }
    }

    function getBalance(address token, address account) external view returns (uint256) {
        return balances[token][account];
    }

    // -------------------------------------------- helper functions
    function getTime() public view returns (uint256) {
        return now;
    }

    function getCancelDataHash(uint256 gasFee, uint256 data) public view returns (bytes32) {
        return keccak256(this, gasFee, data);
    }

    function getWithdrawDataHash(uint256 amount, uint256 gas, uint256 data) public view returns (bytes32) {
        return keccak256(this, amount, gas, data);
    }

    function getMigrateDataHash(address newContract, uint256 gas, uint256 data) public view returns (bytes32) {
        return keccak256(this, newContract, gas, data);
    }

    function getOrderDataHash(
        uint256[] inputs,
        uint256 offset,
        uint256 isBuy,
        uint256 tokenId
    )
        public view returns (bytes32)
    {
        uint256 amountSell = inputs[offset + 0];
        uint256 amountBuy = inputs[offset + 1];
        uint256 gasFee = inputs[offset + 2];
        uint256 data = genUserSignedOrderData(inputs[offset + 3], isBuy, tokenId2Address[tokenId]);
        return keccak256(this, amountSell, amountBuy, gasFee, data);
    }

    function getTokenOrderDataHash(uint256[] inputs, uint256 offset) public view returns (bytes32) {
        uint256 amountSell = inputs[offset + 0];
        uint256 amountBuy = inputs[offset + 1];
        uint256 gasFee = inputs[offset + 2];
        uint256 isBuy;
        uint256 tokenId;
        uint256 baseId;
        (tokenId, baseId, isBuy) = decodeTokenOrderTokenIdAndIsBuy(inputs[offset + 3]);
        uint256 joyPrice = decodeTokenOrderJoyPrice(inputs[offset + 3]);
        uint256 data = genUserSignedTokenOrderData(inputs[offset + 3], tokenId2Address[tokenId]);
        address baseToken = tokenId2Address[baseId];
        return keccak256(this, amountSell, amountBuy, gasFee, data, baseToken, joyPrice);
    }

    function verify(bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hash);
        address signer = ecrecover(prefixedHash, v, r, s);
        return signer == sender;
    }

    // -------------------------------------------- internal/private function
    function addUser(address _address) internal {
        if (userAddress2Id[_address] != 0) {
            return;
        }
        userCount += 1;
        userAddress2Id[_address] = userCount;
        userId2Address[userCount] = _address;
        NewUser(_address, userCount);
    }

    function processTakerOrder(
        uint256 gasFee,
        uint256 data,
        uint256 tokenExecute,
        uint256 baseExecute,
        uint256 isBuy,
        uint256 tokenId,
        uint256 baseId,
        bytes32 orderHash
    )
        internal
    {
        uint256 fee = calculateFee(gasFee, data, baseExecute, orderHash, true);
        updateUserBalance(data, isBuy, baseExecute, tokenExecute, fee, tokenId, baseId);
        orderFills[orderHash] = orderFills[orderHash].add(tokenExecute);
        TradeSuccess(userId2Address[decodeOrderUserId(data)], baseExecute, tokenExecute, isBuy, fee);
    }

    function internalTrade(
        uint256 amountSell,
        uint256 amountBuy,
        uint256 gasFee,
        uint256 data,
        uint256 _tokenExecute,
        uint256 _baseExecute,
        uint256 isBuy,
        uint256 tokenId,
        uint256 baseId,
        bytes32 orderHash
    )
        internal returns (uint256 tokenExecute, uint256 baseExecute)
    {
        uint256 tokenGet = calculateTokenGet(amountSell, amountBuy, _tokenExecute, isBuy, orderHash);
        uint256 baseGet = calculateEtherGet(amountSell, amountBuy, isBuy, tokenGet);
        uint256 fee = calculateFee(gasFee, data, baseGet, orderHash, false);
        updateUserBalance(data, isBuy, baseGet, tokenGet, fee, tokenId, baseId);
        orderFills[orderHash] = orderFills[orderHash].add(tokenGet);
        (tokenExecute, baseExecute) = updateTradeAmount(_tokenExecute, _baseExecute, baseGet, tokenGet);
        TradeSuccess(userId2Address[decodeOrderUserId(data)], baseGet, tokenGet, isBuy, fee);
    }

    function updateTradeAmount(
        uint256 _tokenExecute,
        uint256 _baseExecute,
        uint256 baseGet,
        uint256 tokenGet
    )
        internal pure returns (uint256 tokenExecute, uint256 baseExecute)
    {
        tokenExecute = _tokenExecute.sub(tokenGet);
        baseExecute = _baseExecute.add(baseGet);
    }

    function updateUserBalance(
        uint256 data,
        uint256 isBuy,
        uint256 baseGet,
        uint256 tokenGet,
        uint256 fee,
        uint256 tokenId,
        uint256 baseId
    )
        internal
    {
        address user = userId2Address[decodeOrderUserId(data)];
        address token = tokenId2Address[tokenId];
        address base = tokenId2Address[baseId];
        uint256 baseFee = fee;
        uint256 joyFee = 0;
        if (decodeOrderJoyPrice(data) != 0) {
            joyFee = fee;
            baseFee = 0;
        }

        if (isBuy == ORDER_ISBUY) { // buy token, sell ether
            balances[base][user] = balances[base][user].sub(baseGet).sub(baseFee);
            balances[token][user] = balances[token][user].add(tokenGet);
        } else {
            balances[base][user] = balances[base][user].add(baseGet).sub(baseFee);
            balances[token][user] = balances[token][user].sub(tokenGet);
        }

        if (joyFee != 0) {
            balances[joyToken][user] = balances[joyToken][user].sub(joyFee);
            balances[joyToken][joysoWallet] = balances[joyToken][joysoWallet].add(joyFee);
        } else {
            balances[base][joysoWallet] = balances[base][joysoWallet].add(baseFee);
        }
    }

    function calculateFee(
        uint256 gasFee,
        uint256 data,
        uint256 etherGet,
        bytes32 orderHash,
        bool isTaker
    )
        internal view returns (uint256)
    {
        uint256 joyPrice = decodeOrderJoyPrice(data);
        uint256 txFee;
        if (joyPrice != 0) {
            uint256 joyFee = orderFills[orderHash] == 0 ? gasFee : 0;
            if (isTaker) {
                txFee = etherGet.mul(decodeOrderTakerFee(data)) / 10000;
            } else {
                txFee = etherGet.mul(decodeOrderMakerFee(data)) / 10000;
            }
            uint256 toJoy = txFee / (10 ** 5) / (joyPrice);
            return joyFee.add(toJoy);
        } else {
            uint256 etherFee = orderFills[orderHash] == 0 ? gasFee : 0;
            if (isTaker) {
                txFee = etherGet.mul(decodeOrderTakerFee(data)) / 10000;
            } else {
                txFee = etherGet.mul(decodeOrderMakerFee(data)) / 10000;
            }
            return etherFee.add(txFee);
        }
    }

    function calculateEtherGet(
        uint256 amountSell,
        uint256 amountBuy,
        uint256 isBuy,
        uint256 tokenGet
    )
        internal pure returns (uint256)
    {
        return isBuy == ORDER_ISBUY ? tokenGet.mul(amountSell) / amountBuy : tokenGet.mul(amountBuy) / amountSell;
    }

    function calculateTokenGet(
        uint256 amountSell,
        uint256 amountBuy,
        uint256 _tokenExecute,
        uint256 isBuy,
        bytes32 orderHash
    )
        internal view returns (uint256)
    {
        uint256 tradeTokenAmount = isBuy == ORDER_ISBUY ? amountBuy : amountSell;
        tradeTokenAmount = tradeTokenAmount.sub(orderFills[orderHash]);
        require(tradeTokenAmount > 0); // the maker order should remain something to trade
        return tradeTokenAmount >= _tokenExecute ? _tokenExecute : tradeTokenAmount;
    }
}
