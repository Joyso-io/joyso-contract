pragma solidity 0.4.19;

import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./libs/SafeMath.sol";
import "./Migratable.sol";
import "./JoysoDataDecoder.sol";

/// @title Joyso
/// @notice joyso main contract
/// @author Will, Emn178
contract Joyso is Ownable, JoysoDataDecoder {
    using SafeMath for uint256;

    uint256 internal constant PAY_BY_TOKEN = 0x0000000000000000000000020000000000000000000000000000000000000000;
    uint256 internal constant PAY_BY_JOY = 0x0000000000000000000000010000000000000000000000000000000000000000;
    uint256 internal constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    mapping (address => mapping (address => uint256)) private balances;
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
    event TradeSuccess(address user, uint256 etherGet, uint256 tokenGet, bool isBuy, uint256 fee);

    function Joyso(address _joysoWallet, address _joyToken) public {
        joysoWallet = _joysoWallet;
        addUser(_joysoWallet);
        joyToken = _joyToken;
        tokenAddress2Id[joyToken] = 1;
        tokenAddress2Id[0] = 0; // ether address is Id 0
        tokenId2Address[0] = 0;
        tokenId2Address[1] = joyToken;
    }

    /// @notice deposit token into the contract
    /// @notice Be sure to Approve the contract to move your erc20 token
    /// @param token The address of deposited token
    /// @param amount The amount of token to deposit
    function depositToken(address token, uint256 amount) external {
        require(tokenAddress2Id[token] != 0);
        addUser(msg.sender);
        require(ERC20(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        Deposit(
            token,
            msg.sender,
            amount,
            balances[token][msg.sender]
        );
    }

    /// @notice deposit Ether into the contract
    function depositEther() external payable {
        addUser(msg.sender);
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);
        Deposit(
            0,
            msg.sender,
            msg.value,
            balances[0][msg.sender]
        );
    }

    /// @notice withdraw funds directly from contract
    /// @notice must claim by lockme first, after a period of time it would be valid
    /// @param token The address of withdrawed token, using address(0) to withdraw Ether
    /// @param amount The amount of token to withdraw
    function withdraw(address token, uint256 amount) external {
        require(getTime() > userLock[msg.sender] && userLock[msg.sender] != 0);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require(ERC20(token).transfer(msg.sender, amount));
        }
        Withdraw(
            token,
            msg.sender,
            amount,
            balances[token][msg.sender]
        );
    }

    /// @notice This function is used to claim to withdraw the funds
    /// @notice The matching server will automaticlly remove all un-touched orders
    /// @notice After a period of time, the claimed user can withdraw funds directly from contract without admins involved.
    function lockMe() external {
        require(userAddress2Id[msg.sender] != 0);
        userLock[msg.sender] = getTime() + lockPeriod;
        Lock(msg.sender, userLock[msg.sender]);
    }

    /// @notice This function is used to revoke the claim of lockMe
    function unlockMe() external {
        require(userAddress2Id[msg.sender] != 0);
        userLock[msg.sender] = 0;
        Lock(msg.sender, userLock[msg.sender]);
    }

    /// @notice add/remove a address to admin list, only owner
    /// @param admin The address of the admin
    /// @param isAdd Set the address's status in admin list
    function addToAdmin(address admin, bool isAdd) external onlyOwner {
        isAdmin[admin] = isAdd;
    }

    /// @notice collect the fee to owner's address, only owner
    function collectFee(address token) external onlyOwner {
        uint256 amount = balances[token][joysoWallet];
        balances[token][joysoWallet] = 0;
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require(ERC20(token).transfer(msg.sender, amount));
        }
        Withdraw(
            token,
            msg.sender,
            amount,
            balances[token][joysoWallet]
        );
    }

    /// @notice change lock period, only owner
    /// @dev can change from 1 days to 30 days, initial is 30 days
    function changeLockPeriod(uint256 periodInDays) external onlyOwner {
        require(periodInDays * 1 days < 30 * 1 days && periodInDays >= 1 * 1 days);
        lockPeriod = periodInDays * 1 days;
    }

    /// @notice add a new token into the token list, only admins
    /// @dev index 0 & 1 are saved for Ether and JOY
    /// @dev both index & token can not be redundant, and no removed mathod
    /// @param tokenAddress token's address
    /// @param index chosen index of the token
    function registerToken(address tokenAddress, uint256 index) external onlyAdmin {
        require(index > 1);
        require(tokenAddress2Id[tokenAddress] == 0);
        require(tokenId2Address[index] == 0);
        tokenAddress2Id[tokenAddress] = index;
        tokenId2Address[index] = tokenAddress;
    }

    /// @notice withdraw with admins involved, only admin
    /// @param inputs array of inputs, must have 5 elements
    /// @dev
    ///   input array details:
    ///     inputs[0] (uint256) amount amount to withdraw
    ///     inputs[1] (uint256) gasFee Gas fee paid to the joyso wallet if matched
    ///     inputs[2] (uint256) dataV A batch of input data including nonce, paymentMethod, sig_v, tokenId, userId
    ///     inputs[3] (bytes32) sig_r
    ///     inputs[4] (bytes32) sig_s
    ///   dataV details:
    ///     dataV[0 .. 7] (uint256) nonce Nonce for generateing different hash, is not used in contract
    ///     dataV[23..23] (uint256) paymentMethod paid in 0: ether, 1: JOY, 2: token
    ///     dataV[24..24] (uint256) sig_v
    ///     dataV[52..55] (uint256) tokenId Token id in contract, can be check through tokenId2Address
    ///     dataV[56..63] (uint256) userId User id in contract, can be check through userId2Address
    ///   user withdraw signature (bytes32)
    ///     keccak(this.address, amount, gasFee, data)
    ///   data details:
    ///     data[0 .. 7] (uint256) nonce
    ///     data[23..23] (uint256) paymentMethod
    ///     data[24..63] (uint256) tokenAddress
    function withdrawByAdmin_Unau(uint256[] inputs) external onlyAdmin {
        uint256 v256 = retrieveV(inputs[2]);
        uint256 paymentMethod = decodeWithdrawPaymentMethod(inputs[2]);
        address token = tokenId2Address[decodeWithdrawTokenId(inputs[2])];
        address user = userId2Address[decodeWithdrawUserId(inputs[2])];
        uint256 data = genUserSignedWithdrawData(inputs[2], token);
        bytes32 hash = keccak256(this, inputs[0], inputs[1], data);
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

    /// @notice match orders with admins involved, only admin
    /// @param inputs Array of input orders, each order have 6 elements. Inputs must conatin at least 2 orders.
    /// @dev
    ///   input array details:
    ///     inputs[6*i .. (6*i+5)] order i, order1 is taker, other orders are maker
    ///     inputs[6*i] (uint256) amountSell
    ///     inputs[6*i+1] (uint256) amountBuy
    ///     inputs[6*i+2] (uint256) gasFee
    ///     inputs[6*i+3] (uint256) dataV
    ///     inputs[6*i+4] (bytes32) sig_r
    ///     inputs[6*i+5] (bytes32) sig_s
    ///   dataV details:
    ///     dataV[0 .. 7] (uint256) nonce Nonce for generateing different hash, is not used in contract
    ///     dataV[8 ..11] (uint256) takerFee
    ///     dataV[12..15] (uint256) makerFee
    ///     dataV[16..22] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
    ///     dataV[23..23] (uint256) isBuy --> always 0, should be modified in contract
    ///     dataV[24..24] (uint256) sig_v --> should be uint8 when used, 0: 27, 1: 28
    ///     dataV[49..51] (uint256) tokenSellId
    ///     dataV[52..55] (uint256) tokenBuyId
    ///     dataV[56..63] (uint256) userId User id in contract, can be check through userId2Address
    ///   user order signature (bytes32)
    ///     keccak(this.address, amountSell, amountBuy, gasFee, data)
    ///   data details:
    ///     data [0 .. 7] (uint256) nonce
    ///     data [8 ..11] (uint256) takerFee
    ///     data [12..15] (uint256) makerFee
    ///     data [16..22] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
    ///     data [23..23] (uint256) isBuy
    ///     data [24..63] (address) tokenAddress
    function matchByAdmin_TwH36(uint256[] inputs) external onlyAdmin {
        uint256 data = inputs[3];
        address user = userId2Address[decodeOrderUserId(data)];
        // check taker order nonce
        require(decodeOrderNonce(data) > userNonce[user]);
        address token;
        bool isBuy;
        (token, isBuy) = decodeOrderTokenAndIsBuy(data);
        bytes32 orderHash = getOrderDataHash(inputs, 0, isBuy, token);
        require(
            verify(
                orderHash,
                user,
                uint8(retrieveV(data)),
                bytes32(inputs[4]),
                bytes32(inputs[5])
            )
        );

        uint256 tokenExecute = isBuy ? inputs[1] : inputs[0]; // taker order token execute
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        require(tokenExecute != 0); // the taker order should remain something to trade
        uint256 etherExecute = 0;  // taker order ether execute

        isBuy = !isBuy;
        for (uint256 i = 6; i < inputs.length; i += 6) {
            //check price, maker price should lower than taker price
            require(tokenExecute > 0 && inputs[1].mul(inputs[i + 1]) <= inputs[0].mul(inputs[i]));

            data = inputs[i + 3];
            user = userId2Address[decodeOrderUserId(data)];
            // check maker order nonce
            require(decodeOrderNonce(data) > userNonce[user]);
            bytes32 makerOrderHash = getOrderDataHash(inputs, i, isBuy, token);
            require(
                verify(
                    makerOrderHash,
                    user,
                    uint8(retrieveV(data)),
                    bytes32(inputs[i + 4]),
                    bytes32(inputs[i + 5])
                )
            );
            (tokenExecute, etherExecute) = internalTrade(
                inputs[i],
                inputs[i + 1],
                inputs[i + 2],
                data,
                tokenExecute,
                etherExecute,
                isBuy,
                token,
                address(0),
                makerOrderHash
            );
        }

        isBuy = !isBuy;
        tokenExecute = isBuy ? inputs[1].sub(tokenExecute) : inputs[0].sub(tokenExecute);
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        processTakerOrder(inputs[2], inputs[3], tokenExecute, etherExecute, isBuy, token, 0, orderHash);
    }

    /// @notice match token orders with admins involved, only admin
    /// @param inputs Array of input orders, each order have 6 elements. Inputs must conatin at least 2 orders.
    /// @dev
    ///   input array details:
    ///     inputs[6*i .. (6*i+5)] order i, order1 is taker, other orders are maker
    ///     inputs[6*i] (uint256) amountSell
    ///     inputs[6*i+1] (uint256) amountBuy
    ///     inputs[6*i+2] (uint256) gasFee
    ///     inputs[6*i+3] (uint256) dataV
    ///     inputs[6*i+4] (bytes32) sig_r
    ///     inputs[6*i+5] (bytes32) sig_s
    ///   dataV details:
    ///     dataV[0 .. 7] (uint256) nonce Nonce for generateing different hash, is not used in contract
    ///     dataV[8 ..11] (uint256) takerFee
    ///     dataV[12..15] (uint256) makerFee
    ///     dataV[16..22] (uint256) no use
    ///     dataV[23..23] (uint256) isBuy --> always 0, should be modified in contract
    ///     dataV[24..24] (uint256) sig_v --> should be uint8 when used, 0: 27, 1: 28
    ///     dataV[25..48] (uint256) joyPrice --> 0: pay baseToken, others: pay joy Token
    ///     dataV[49..51] (uint256) tokenSellId
    ///     dataV[52..55] (uint256) tokenBuyId
    ///     dataV[56..63] (uint256) userId User id in contract, can be check through userId2Address
    ///   user order signature (bytes32)
    ///     keccak(this.address, amountSell, amountBuy, gasFee, data, baseTokenAddress, joyPrice)
    ///   data details:
    ///     data [0 .. 7] (uint256) nonce
    ///     data [8 ..11] (uint256) takerFee
    ///     data [12..15] (uint256) makerFee
    ///     data [16..22] (uint256) no use
    ///     data [23..23] (uint256) isBuy
    ///     data [24..63] (address) tokenAddress
    function matchTokenOrderByAdmin_k44j(uint256[] inputs) external onlyAdmin {
        address user = userId2Address[decodeOrderUserId(inputs[3])];
        // check taker order nonce
        require(decodeOrderNonce(inputs[3]) > userNonce[user]);
        address token;
        address base;
        bool isBuy;
        (token, base, isBuy) = decodeTokenOrderTokenAndIsBuy(inputs[3]);
        bytes32 orderHash = getTokenOrderDataHash(inputs, 0, inputs[3], token, base);
        require(
            verify(
                orderHash,
                user,
                uint8(retrieveV(inputs[3])),
                bytes32(inputs[4]),
                bytes32(inputs[5])
            )
        );
        uint256 tokenExecute = isBuy ? inputs[1] : inputs[0]; // taker order token execute
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        require(tokenExecute != 0); // the taker order should remain something to trade
        uint256 baseExecute = 0;  // taker order ether execute

        isBuy = !isBuy;
        for (uint256 i = 6; i < inputs.length; i += 6) {
            //check price, taker price should better than maker price
            require(tokenExecute > 0 && inputs[1].mul(inputs[i + 1]) <= inputs[0].mul(inputs[i]));

            user = userId2Address[decodeOrderUserId(inputs[i + 3])];
            // check maker order nonce
            require(decodeOrderNonce(inputs[i + 3]) > userNonce[user]);
            bytes32 makerOrderHash = getTokenOrderDataHash(inputs, i, inputs[i + 3], token, base);
            require(
                verify(
                    makerOrderHash,
                    user,
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
                token,
                base,
                makerOrderHash
            );
        }

        isBuy = !isBuy;
        tokenExecute = isBuy ? inputs[1].sub(tokenExecute) : inputs[0].sub(tokenExecute);
        tokenExecute = tokenExecute.sub(orderFills[orderHash]);
        processTakerOrder(inputs[2], inputs[3], tokenExecute, baseExecute, isBuy, token, base, orderHash);
    }

    /// @notice update user on-chain nonce with admins involved, only admin
    /// @param inputs Array of input data, must have 4 elements.
    /// @dev
    ///   input array details:
    ///     inputs[0] (uint256) gasFee
    ///     inputs[1] (uint256) dataV
    ///     inputs[2] (uint256) sig_r
    ///     inputs[3] (uint256) sig_s
    ///   dataV details:
    ///     dataV[0 .. 7] nonce
    ///     dataV[23..23] paymentMethod --> 0: ether, 1: JOY
    ///     dataV[24..24] v --> should be uint8 when used
    ///     dataV[56..63] userId
    ///   user cancel signature (bytes32)
    ///     keccak(this.address, gasFee, data)
    ///   data details:
    ///     data [0 .. 7] (uint256) nonce
    function cancelByAdmin(uint256[] inputs) external onlyAdmin {
        uint256 v256 = retrieveV(inputs[1]);
        uint256 nonce;
        uint256 paymentMethod;
        uint256 userId;
        (nonce, paymentMethod, userId) = decodeCancelData(inputs[1]);
        address user = userId2Address[userId];
        require(nonce > userNonce[user]);
        uint256 data = inputs[1] & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        bytes32 hash = keccak256(this, inputs[0], data);
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

    /// @notice batch send the current balance to the new version contract
    /// @param inputs Array of input data
    /// @dev
    ///   input array details:
    ///     inputs[0]   new contract address
    ///     inputs[i+1] gasFee
    ///     inputs[i+2] dataV
    ///     inputs[i+3] sig_r
    ///     inputs[i+4] sig_s
    ///   dataV details:
    ///     dataV[0 .. 7] nonce
    ///     dataV[23..23] paymentMethod --> 0: ether, 1: JOY
    ///     dataV[24..24] v --> should be uint8 when used
    ///     dataV[52..55] tokenId
    ///     dataV[56..63] userId
    ///   user migrate signature (bytes32)
    ///     keccak(this.address, newAddress, gasFee, data)
    ///   data details:
    ///     data [0 .. 7] (uint256) nonce
    ///     data [23..23] (uint256) paymentMethod
    ///     data [24..63] (address) tokenAddress
    function migrateByAdmin_DQV(uint256[] inputs) external onlyAdmin {
        address token = tokenId2Address[decodeWithdrawTokenId(inputs[2])];
        address newContract = address(inputs[0]);
        for (uint256 i = 1; i < inputs.length; i += 4) {
            uint256 gasFee = inputs[i];
            uint256 data = inputs[i + 1];
            address user = userId2Address[decodeWithdrawUserId(data)];
            bytes32 hash = keccak256(
                this,
                gasFee,
                genUserSignedWithdrawData(data, token),
                newContract
            );
            require(
                verify(
                    hash,
                    user,
                    uint8(retrieveV(data)),
                    bytes32(inputs[i + 2]),
                    bytes32(inputs[i + 3])
                )
            );
            if (gasFee > 0) {
                uint256 paymentMethod = decodeWithdrawPaymentMethod(data);
                if (paymentMethod == PAY_BY_JOY) {
                    balances[joyToken][user] = balances[joyToken][user].sub(gasFee);
                    balances[joyToken][joysoWallet] = balances[joyToken][joysoWallet].add(gasFee);
                } else if (paymentMethod == PAY_BY_TOKEN) {
                    balances[token][user] = balances[token][user].sub(gasFee);
                    balances[token][joysoWallet] = balances[token][joysoWallet].add(gasFee);
                } else {
                    balances[0][user] = balances[0][user].sub(gasFee);
                    balances[0][joysoWallet] = balances[0][joysoWallet].add(gasFee);
                }
            }
            uint256 amount = balances[token][user];
            balances[token][user] = 0;
            if (token == 0) {
                Migratable(newContract).migrate.value(amount)(user, amount, token);
            } else {
                ERC20(token).approve(newContract, amount);
                Migratable(newContract).migrate(user, amount, token);
            }
        }
    }

    /// @notice transfer token from admin to users
    /// @param token address of token
    /// @param account receiver's address
    /// @param amount amount to transfer
    function transferForAdmin(address token, address account, uint256 amount) onlyAdmin external {
        require(tokenAddress2Id[token] != 0);
        addUser(account);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        balances[token][account] = balances[token][account].add(amount);
    }

    /// @notice get balance information
    /// @param token address of token
    /// @param account address of user
    function getBalance(address token, address account) external view returns (uint256) {
        return balances[token][account];
    }

    /// @dev get tokenId and check the order is a buy order or not, internal
    ///      tokenId take 4 bytes
    ///      isBuy is true means this order is buying token
    function decodeOrderTokenAndIsBuy(uint256 data) internal view returns (address token, bool isBuy) {
        uint256 tokenId = (data & 0x000000000000000000000000000000000000000000000000ffff000000000000) >> 48;
        if (tokenId == 0) {
            token = tokenId2Address[(data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32];
            isBuy = true;
        } else {
            token = tokenId2Address[tokenId];
        }
    }

    /// @dev decode token oreder data, internal
    function decodeTokenOrderTokenAndIsBuy(uint256 data) internal view returns (address token, address base, bool isBuy) {
        isBuy = data & 0x00000000000000000000000f0000000000000000000000000000000000000000 == ORDER_ISBUY;
        if (isBuy) {
            token = tokenId2Address[(data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32];
            base = tokenId2Address[(data & 0x000000000000000000000000000000000000000000000000ffff000000000000) >> 48];
        } else {
            token = tokenId2Address[(data & 0x000000000000000000000000000000000000000000000000ffff000000000000) >> 48];
            base = tokenId2Address[(data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32];
        }
    }

    function getTime() internal view returns (uint256) {
        return now;
    }

    /// @dev get order's hash for user to sign, internal
    /// @param inputs forword match input to this function
    /// @param offset offset of the order in inputs
    /// @param isBuy tell the order is buying token or not
    function getOrderDataHash(
        uint256[] inputs,
        uint256 offset,
        bool isBuy,
        address token
    )
        internal view returns (bytes32)
    {
        uint256 data = genUserSignedOrderData(inputs[offset + 3], isBuy, token);
        return keccak256(this, inputs[offset], inputs[offset + 1], inputs[offset + 2], data);
    }

    /// @dev get token order's hash for user to sign, internal
    /// @param inputs forword tokenOrderMatch's input to this function
    /// @param offset offset of the order in inputs
    function getTokenOrderDataHash(uint256[] inputs, uint256 offset, uint256 data, address token, address base) internal view returns (bytes32) {
        uint256 joyPrice = decodeTokenOrderJoyPrice(data);
        return keccak256(this, inputs[offset], inputs[offset + 1], inputs[offset + 2], genUserSignedTokenOrderData(data, token), base, joyPrice);
    }

    /// @dev check if the provided signature is valid, internal
    /// @param hash signed information
    /// @param sender signer address
    /// @param v sig_v
    /// @param r sig_r
    /// @param s sig_s
    function verify(bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) internal pure returns (bool) {
        return ecrecover(keccak256("\x19Ethereum Signed Message:\n32", hash), v, r, s) == sender;
    }

    /// @dev give a new user an id, intrnal
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
        bool isBuy,
        address token,
        address base,
        bytes32 orderHash
    )
        internal
    {
        uint256 fee = calculateFee(gasFee, data, baseExecute, orderHash, true, base != address(0));
        updateUserBalance(data, isBuy, baseExecute, tokenExecute, fee, token, base);
        orderFills[orderHash] = orderFills[orderHash].add(tokenExecute);
        TradeSuccess(userId2Address[decodeOrderUserId(data)], baseExecute, tokenExecute, isBuy, fee);
    }

    function internalTrade(
        uint256 amountSell,
        uint256 amountBuy,
        uint256 gasFee,
        uint256 data,
        uint256 _remainingToken,
        uint256 _baseExecute,
        bool isBuy,
        address token,
        address base,
        bytes32 orderHash
    )
        internal returns (uint256 remainingToken, uint256 baseExecute)
    {
        uint256 tokenGet = calculateTokenGet(amountSell, amountBuy, _remainingToken, isBuy, orderHash);
        uint256 baseGet = calculateBaseGet(amountSell, amountBuy, isBuy, tokenGet);
        uint256 fee = calculateFee(gasFee, data, baseGet, orderHash, false, base != address(0));
        updateUserBalance(data, isBuy, baseGet, tokenGet, fee, token, base);
        orderFills[orderHash] = orderFills[orderHash].add(tokenGet);
        remainingToken = _remainingToken.sub(tokenGet);
        baseExecute = _baseExecute.add(baseGet);
        TradeSuccess(
            userId2Address[decodeOrderUserId(data)],
            baseGet,
            tokenGet,
            isBuy,
            fee
        );
    }

    function updateUserBalance(
        uint256 data,
        bool isBuy,
        uint256 baseGet,
        uint256 tokenGet,
        uint256 fee,
        address token,
        address base
    )
        internal
    {
        address user = userId2Address[decodeOrderUserId(data)];
        uint256 baseFee = fee;
        uint256 joyFee = 0;
        if ((base == address(0) && decodeOrderJoyPrice(data) != 0) ||
            (base != address(0) && decodeTokenOrderJoyPrice(data) != 0)) {
            joyFee = fee;
            baseFee = 0;
        }

        if (isBuy) { // buy token, sell ether
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
        uint256 baseGet,
        bytes32 orderHash,
        bool isTaker,
        bool isTokenOrder
    )
        internal view returns (uint256)
    {
        uint256 fee = orderFills[orderHash] == 0 ? gasFee : 0;
        uint256 txFee = baseGet.mul(isTaker ? decodeOrderTakerFee(data) : decodeOrderMakerFee(data)) / 10000;
        uint256 joyPrice = isTokenOrder ? decodeTokenOrderJoyPrice(data) : decodeOrderJoyPrice(data);
        if (joyPrice != 0) {
            if (isTokenOrder) {
                txFee = txFee * (10 ** 12) / joyPrice;
            } else {
                txFee = txFee / (10 ** 5) / joyPrice;
            }
        }
        return fee.add(txFee);
    }

    function calculateBaseGet(
        uint256 amountSell,
        uint256 amountBuy,
        bool isBuy,
        uint256 tokenGet
    )
        internal pure returns (uint256)
    {
        return isBuy ? tokenGet.mul(amountSell) / amountBuy : tokenGet.mul(amountBuy) / amountSell;
    }

    function calculateTokenGet(
        uint256 amountSell,
        uint256 amountBuy,
        uint256 remainingToken,
        bool isBuy,
        bytes32 orderHash
    )
        internal view returns (uint256)
    {
        uint256 makerRemainingToken = isBuy ? amountBuy : amountSell;
        makerRemainingToken = makerRemainingToken.sub(orderFills[orderHash]);
        require(makerRemainingToken > 0); // the maker order should remain something to trade
        return makerRemainingToken >= remainingToken ? remainingToken : makerRemainingToken;
    }
}
