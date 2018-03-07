pragma solidity ^0.4.17;

contract JoysoDataDecoder {

    uint256 constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    /**
     * @dev rertrive the nonce in an order data
     * @dev nonce take 8 bytes 
     * @dev its used for avoild order comflict and check if the nonce is canceled. 
     */
    function decodeOrderNonce (uint256 data) internal pure returns (uint256 nonce) {
        nonce = data / 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    }

    /**
     * @dev rertrive the taker fee in an order data 
     * @dev taker fee take 4 bytes
     * @dev from 1 to 10^4 
     * @dev means 0.01% to 100%
     */
    function decodeOrderTakerFee (uint256 data) internal pure returns (uint256 takerFee) {
        data = data & 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        takerFee = data / 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;       
    }

    /**
     * @dev rertrive the maker fee in an order data 
     * @dev maker fee take 4 bytes
     * @dev from 1 to 10^4 
     * @dev means 0.01% to 100%
     */
    function decodeOrderMakerFee (uint256 data) internal pure returns (uint256 makerFee) {
        data = data & 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;
        makerFee = data / 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff; 
    }

    /**
     * @dev rertrive the JoyPrice in an order data 
     * @dev JoyPrice take 11 digitals in hex
     * @dev from 1 to 10^8 
     * @dev means 1 JOY = 10^-7 ether to 10 ether  
     */
    function decodeOrderJoyPrice (uint256 data) internal pure returns (uint256 joyPrice) {
        data = data & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        joyPrice = data / 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;        
    }

    /**
     * @dev get tokenId and check the order is a buy order or not  
     * @dev tokenId take 4 bytes 
     * @dev isBuy is true means this order is buying token 
     */
    function decodeOrderTokenIdAndIsBuy (uint256 data) internal pure returns (uint256 tokenId, uint256 isBuy) {
        data = data & 0x000000000000000000000000000000000000000000000000ffffffffffffffff;
        uint256 tokenSellId = data / 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        data = data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        uint256 tokenBuyId = data / 0x00000000000000000000000000000000000000000000000000000000ffffffff;
        isBuy = 0;
        tokenId = tokenSellId;
        if (tokenSellId == 0) {
            tokenId = tokenBuyId;
            isBuy = ORDER_ISBUY;
        }
    }

    /**
     * @dev get userId   
     * @dev userId take 4 bytes 
     * @dev from 1 to 4294967295  
     */
    function decodeOrderUserId (uint256 data) internal pure returns (uint256 userId) {
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    /** 
     * @dev is used to retrieve withdrawData 
     */
    function decodeWithdrawData (uint256 _data) internal pure returns (uint256 paymentMethod, uint256 tokenId, uint256 userId) {
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
        tokenId = _data / 0x00000000000000000000000000000000000000000000000000000000ffffffff;
        userId = _data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeCancelData (uint256 _data) internal pure returns (uint256 nonce, uint256 paymentMethod, uint256 userId) {
        nonce = _data / 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        paymentMethod = _data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        userId = _data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function retrieveV (uint256 _data) internal pure returns (uint256 v) {
        // [24..24] v 0:27 1:28
        if (_data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0) {
            v = 27;
        } else {
            v = 28;
        }
    }

    function genUserSignedWithdrawData (uint256 _data, address _address) internal pure returns (uint256 data) {
        _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        data = _data | (uint256)(_address);
    }

    function genUserSignedOrderData (uint256 _data, uint256 _isBuy, address _address) internal pure returns (uint256 data) {
        data = _data & 0xfffffffffffffffffffffff00000000000000000000000000000000000000000;
        data = data | _isBuy;
        data = data | (uint256)(_address);
    }

}

