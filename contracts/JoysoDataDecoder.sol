pragma solidity 0.4.19;


contract JoysoDataDecoder {
    uint256 internal constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    /**
     * @dev rertrive the nonce in an order data
     * @dev nonce take 8 bytes
     * @dev its used for avoild order comflict and check if the nonce is canceled.
     */
    function decodeOrderNonce (uint256 data) internal pure returns (uint256) {
        return data / (0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff + 1);
    }

    /**
     * @dev rertrive the taker fee in an order data
     * @dev taker fee take 4 bytes
     * @dev from 1 to 10^4
     * @dev means 0.01% to 100%
     */
    function decodeOrderTakerFee (uint256 data) internal pure returns (uint256) {
        data = data & 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        return data / (0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff + 1);
    }

    /**
     * @dev rertrive the maker fee in an order data
     * @dev maker fee take 4 bytes
     * @dev from 1 to 10^4
     * @dev means 0.01% to 100%
     */
    function decodeOrderMakerFee (uint256 data) internal pure returns (uint256) {
        data = data & 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;
        return data / (0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff + 1);
    }

    /**
     * @dev rertrive the JoyPrice in an order data
     * @dev JoyPrice take 11 digitals in hex
     * @dev from 1 to 10^8
     * @dev means 1 JOY = 10^-7 ether to 10 ether
     */
    function decodeOrderJoyPrice (uint256 data) internal pure returns (uint256) {
        data = data & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        return data / (0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff + 1);
    }

    /**
     * @dev get tokenId and check the order is a buy order or not
     * @dev tokenId take 4 bytes
     * @dev isBuy is true means this order is buying token
     */
    function decodeOrderTokenIdAndIsBuy (uint256 data) internal pure returns (uint256 tokenId, uint256 isBuy) {
        data = data & 0x000000000000000000000000000000000000000000000000ffffffffffffffff;
        uint256 tokenSellId = data / (0x0000000000000000000000000000000000000000000000000000ffffffffffff + 1);
        data = data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        uint256 tokenBuyId = data / (0x00000000000000000000000000000000000000000000000000000000ffffffff + 1);
        isBuy = 0;
        tokenId = tokenSellId;
        if (tokenSellId == 0) {
            tokenId = tokenBuyId;
            isBuy = ORDER_ISBUY;
        }
    }

    /**
     * @dev decode token base Match
     */
    function decodeTokenOrderTokenIdAndIsBuy (
        uint256 data
    )
        internal pure returns (uint256 tokenId, uint256 baseId, uint256 isBuy)
    {
        uint256 _data;
        _data = data & 0x000000000000000000000000000000000000000000000000ffffffffffffffff;
        uint256 tokenSellId = _data / (0x0000000000000000000000000000000000000000000000000000ffffffffffff + 1);
        _data = data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        uint256 tokenBuyId = _data / (0x00000000000000000000000000000000000000000000000000000000ffffffff + 1);
        isBuy = data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        if (isBuy == ORDER_ISBUY) {
            tokenId = tokenBuyId;
            baseId = tokenSellId;
        } else {
            tokenId = tokenSellId;
            baseId = tokenBuyId;
        }
    }

    function decodeTokenOrderJoyPrice (uint256 data) internal pure returns (uint256 joyPrice) {
        uint256 _data = data & 0x0000000000000000000000000fffffffffffffffffffffffffffffffffffffff;
        return _data / (0x000000000000000000000000000000000000000000000000ffffffffffffffff + 1);
    }

    /**
     * @dev get userId
     * @dev userId take 4 bytes
     * @dev from 1 to 4294967295
     */
    function decodeOrderUserId (uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    /**
     * @dev is used to retrieve withdrawData
     */
    function decodeWithdrawData (
        uint256 _data
    )
        internal pure returns (uint256 paymentMethod, uint256 tokenId, uint256 userId)
    {
        /**
            data3
            0x000181bfeb 0000000000000 1 1 000000000000000000000000000 0002 00000001
            [ 0.. 7] (uint256) nonce         --> use for random hash
            [23..23] (uint256) paymentMethod --> 0: ether, 1: Token, 2: joyToken
            [52..55] (uint256) tokenId
            [56..63] (address) userId
            */
        paymentMethod = _data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        _data = _data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        tokenId = _data / (0x00000000000000000000000000000000000000000000000000000000ffffffff + 1);
        userId = _data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeWithdrawPaymentMethod (uint256 _data) internal pure returns (uint256) {
        return _data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
    }

    function decodeWithdrawTokenId (uint256 _data) internal pure returns (uint256) {
        _data = _data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        return _data / (0x00000000000000000000000000000000000000000000000000000000ffffffff + 1);
    }

    function decodeWithdrawUserId (uint256 _data) internal pure returns (uint256) {
        return _data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeCancelData (
        uint256 _data
    )
        internal pure returns (uint256 nonce, uint256 paymentMethod, uint256 userId)
    {
        nonce = _data / (0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff + 1);
        paymentMethod = _data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        userId = _data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function retrieveV (uint256 _data) internal pure returns (uint256) {
        // [24..24] v 0:27 1:28
        if (_data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0) {
            return 27;
        } else {
            return 28;
        }
    }

    function genUserSignedWithdrawData (uint256 _data, address _address) internal pure returns (uint256) {
        _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        return _data | (uint256)(_address);
    }

    function genUserSignedOrderData (uint256 _data, uint256 _isBuy, address _address) internal pure returns (uint256) {
        _data = _data & 0xfffffffffffffffffffffff00000000000000000000000000000000000000000;

        _data = _data | _isBuy;
        return _data | (uint256)(_address);
    }

    function genUserSignedTokenOrderData (uint256 _data, address _address) internal pure returns (uint256) {
        _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        return _data | (uint256)(_address);
    }
}
