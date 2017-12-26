pragma solidity ^0.4.17;

contract JoysoDataDecoder {

    uint256 constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    function decodeOrderNonce (uint256 data) public pure returns (uint256 nonce) {
        nonce = data / 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    }

    function decodeOrderTakerFee (uint256 data) public pure returns (uint256 takerFee) {
        data = data & 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        takerFee = data / 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;       
    }

    function decodeOrderMakerFee (uint256 data) public pure returns (uint256 makerFee) {
        data = data & 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;
        makerFee = data / 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff; 
    }

    function decodeOrderJoyPrice (uint256 data) public pure returns (uint256 joyPrice) {
        data = data & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        joyPrice = data / 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;        
    }

    function decodeOrderTokenIdAndIsBuy (uint256 data) public pure returns (uint256 tokenId, uint256 isBuy) {
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

    function decodeOrderUserId (uint256 data) public pure returns (uint256 userId) {
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeWithdrawData (uint256 _data) public pure returns (uint256 paymentMethod, uint256 tokenID, uint256 userID) {
        /**
            data3
            0x000181bfeb 0000000000000 1 1 000000000000000000000000000 0002 00000001
            [ 0.. 7] (uint256) nonce         --> use for random hash             
            [23..23] (uint256) paymentMethod --> 0: ether, 1: Token, 2: joyToken
            [52..55] (uint256) tokenID
            [56..63] (address) userID
            */
        // Assume the _data is come after retriveV, which already eliminated the first two bytes.  
        paymentMethod = _data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        _data = _data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        tokenID = _data / 0x00000000000000000000000000000000000000000000000000000000ffffffff;
        userID = _data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeData4 (uint256 _data) public view returns (uint256 timeStamp, uint256 paymentMethod, address userAddress) {
        /**
            data4
            0x000000000000 160004a1170 1 b2f7eb1f2c37645be61d73953035360e768d81e6
            [12..22] (uint256) timeStamp
            [23..23] (uint256) paymentMethod
            [24..63] (address) userAddress
            */
        // Assume the _data is come after retriveV, which already eliminated the first two bytes.  
        timeStamp = _data / 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;
        paymentMethod = _data & 0x00000000000000000000000f0000000000000000000000000000000000000000;
        userAddress = (address)(_data & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
    }

    function retrieveV (uint256 _data) public pure returns (uint256 v) {
        // [24..24] v 0:27 1:28
        if (_data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0) {
            v = 27;
        } else {
            v = 28;
        }
    }

    function genUserSignedWithdrawData (uint256 _data, address _address) public pure returns (uint256 data) {
        _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        data = _data | (uint256)(_address);
    }

    function genUserSignedOrderData (uint256 _data, uint256 _isBuy, address _address) public pure returns (uint256 data) {
        data = _data & 0xfffffffffffffffffffffff00000000000000000000000000000000000000000;
        data = data | _isBuy;
        data = data | (uint256)(_address);
    }

}

