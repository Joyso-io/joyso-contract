pragma solidity 0.4.19;


contract JoysoDataDecoder {
    uint256 internal constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    function decodeOrderNonce(uint256 data) internal pure returns (uint256) {
        return data >> 224;
    }

    function decodeOrderTakerFee(uint256 data) internal pure returns (uint256) {
        return (data & 0x00000000ffff0000000000000000000000000000000000000000000000000000) >> 208;
    }

    function decodeOrderMakerFee(uint256 data) internal pure returns (uint256) {
        return (data & 0x000000000000ffff000000000000000000000000000000000000000000000000) >> 192;
    }

    function decodeOrderJoyPrice(uint256 data) internal pure returns (uint256) {
        return (data & 0x0000000000000000fffffff00000000000000000000000000000000000000000) >> 164;
    }

    function decodeTokenOrderJoyPrice(uint256 data) internal pure returns (uint256 joyPrice) {
        return (data & 0x0000000000000000000000000fffffffffffffffffffffff0000000000000000) >> 64;
    }

    function decodeOrderUserId(uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeWithdrawData(uint256 data) internal pure returns (uint256 paymentMethod, uint256 tokenId, uint256 userId) {
        paymentMethod = data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        tokenId = (data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32;
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeWithdrawPaymentMethod(uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
    }

    function decodeWithdrawTokenId(uint256 data) internal pure returns (uint256) {
        return (data & 0x0000000000000000000000000000000000000000000000000000ffff00000000) >> 32;
    }

    function decodeWithdrawUserId(uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeCancelData(uint256 data) internal pure returns (uint256 nonce, uint256 paymentMethod, uint256 userId) {
        nonce = data >> 224;
        paymentMethod = data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function retrieveV(uint256 data) internal pure returns (uint256) {
        // [24..24] v 0:27 1:28
        return data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0 ? 27 : 28;
    }

    function genUserSignedWithdrawData(uint256 data, address _address) internal pure returns (uint256) {
        return data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000 | uint256(_address);
    }

    function genUserSignedOrderData(uint256 data, bool _isBuy, address _address) internal pure returns (uint256) {
        return data & 0xfffffffffffffffffffffff00000000000000000000000000000000000000000 | (_isBuy ? ORDER_ISBUY : 0) | uint256(_address);
    }

    function genUserSignedTokenOrderData(uint256 data, address _address) internal pure returns (uint256) {
        return data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000 | uint256(_address);
    }
}
