pragma solidity 0.4.19;


contract JoysoDataDecoder {
    uint256 internal constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    /**
     * @dev rertrive the nonce in an order data
     * @dev nonce take 8 bytes
     * @dev its used for avoild order comflict and check if the nonce is canceled.
     */
    function decodeOrderNonce (uint256 data) internal pure returns (uint256) {
        return data >> 224;
    }

    /**
     * @dev rertrive the taker fee in an order data
     * @dev taker fee take 4 bytes
     * @dev from 1 to 10^4
     * @dev means 0.01% to 100%
     */
    function decodeOrderTakerFee (uint256 data) internal pure returns (uint256) {
        return (data & 0x00000000ffff0000000000000000000000000000000000000000000000000000) >> 208;
    }

    /**
     * @dev rertrive the maker fee in an order data
     * @dev maker fee take 4 bytes
     * @dev from 1 to 10^4
     * @dev means 0.01% to 100%
     */
    function decodeOrderMakerFee (uint256 data) internal pure returns (uint256) {
        return (data & 0x000000000000ffff000000000000000000000000000000000000000000000000) >> 192;
    }

    /**
     * @dev rertrive the JoyPrice in an order data
     * @dev JoyPrice take 11 digitals in hex
     * @dev from 1 to 10^8
     * @dev means 1 JOY = 10^-7 ether to 10 ether
     */
    function decodeOrderJoyPrice (uint256 data) internal pure returns (uint256) {
        return (data & 0x0000000000000000fffffff00000000000000000000000000000000000000000) >> 164;
    }

    /**
     * @dev get tokenId and check the order is a buy order or not
     * @dev tokenId take 4 bytes
     * @dev isBuy is true means this order is buying token
     */
    function decodeOrderTokenIdAndIsBuy (uint256 data) internal pure returns (uint256 tokenId, uint256 isBuy) {
        tokenId = (data & 0x000000000000000000000000000000000000000000000000ffff000000000000) >> 48;
        if (tokenId == 0) {
            tokenId = (data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32;
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
        isBuy = data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        if (isBuy == ORDER_ISBUY) {
            tokenId = (data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32;
            baseId = (data & 0x000000000000000000000000000000000000000000000000ffff000000000000) >> 48;
        } else {
            tokenId = (data & 0x000000000000000000000000000000000000000000000000ffff000000000000) >> 48;
            baseId = (data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32;
        }
    }

    function decodeTokenOrderJoyPrice (uint256 data) internal pure returns (uint256 joyPrice) {
        return (data & 0x0000000000000000000000000fffffffffffffffffffffff0000000000000000) >> 64;
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
        uint256 data
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
        paymentMethod = data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        data = data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        tokenId = data / (0x00000000000000000000000000000000000000000000000000000000ffffffff + 1);
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeWithdrawPaymentMethod (uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
    }

    function decodeWithdrawTokenId (uint256 data) internal pure returns (uint256) {
        return (data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32;
    }

    function decodeWithdrawUserId (uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeCancelData (
        uint256 data
    )
        internal pure returns (uint256 nonce, uint256 paymentMethod, uint256 userId)
    {
        nonce = data >> 224;
        paymentMethod = data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function retrieveV (uint256 data) internal pure returns (uint256) {
        // [24..24] v 0:27 1:28
        return data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0 ? 27 : 28;
    }

    function genUserSignedWithdrawData (uint256 data, address _address) internal pure returns (uint256) {
        return data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000 | uint256(_address);
    }

    function genUserSignedOrderData (uint256 data, uint256 _isBuy, address _address) internal pure returns (uint256) {
        return data & 0xfffffffffffffffffffffff00000000000000000000000000000000000000000 | _isBuy | uint256(_address);
    }

    function genUserSignedTokenOrderData (uint256 data, address _address) internal pure returns (uint256) {
        return data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000 | uint256(_address);
    }
}
