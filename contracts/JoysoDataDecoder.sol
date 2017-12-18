pragma solidity ^0.4.17;

contract JoysoDataDecoder {

    uint256 constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

   function decodeTakerOrderData (uint256 data) public view returns (uint256[7] memory datas) 
    {
        /**
            OrderData (dataV)
            dataV[0 .. 7] (uint256) nonce 
            dataV[8 ..11] (uint256) takerFee
            dataV[12..15] (uint256) makerFee
            dataV[16..22] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
            dataV[23..23] (uint256) isBuy --> always 0, should be modified in contract
            dataV[24..24] (uint256) v --> should be uint8 when used, 0: 27, 1: 28
            dataV[48..51] (uint256) tokenSellId
            dataV[52..55] (uint256) tokenBuyId
            dataV[56..63] (uint256) userId
        */
        uint256 v_256;
        if (data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0) {
            v_256 = 27;
        } else {
            v_256 = 28;
        }
        uint256 nonce = data / 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        data = data & 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        uint256 takerFee = data / 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;
        data = data & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        uint256 joyPrice = data / 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;
        data = data & 0x000000000000000000000000000000000000000000000000ffffffffffffffff;
        uint256 tokenSellId = data / 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        data = data & 0x0000000000000000000000000000000000000000000000000000ffffffffffff;
        uint256 tokenBuyId = data / 0x00000000000000000000000000000000000000000000000000000000ffffffff;
        uint256 userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
        uint256 isBuy = 0;
        uint256 tokenId = tokenSellId;
        if (tokenBuyId > tokenSellId) {
            tokenId = tokenBuyId;
            isBuy = ORDER_ISBUY;
        }
        // uint256[] memory temp = new uint256[](7);
        // temp[0] = nonce;   // 0
        // temp[1] = takerFee;// 1
        // temp[2] = joyPrice;// 2
        // temp[3] = isBuy;   // 3
        // temp[4] = tokenId; // 4
        // temp[5] = userId;  // 5
        // temp[6] = v_256;   // 6
        datas = [nonce, takerFee, joyPrice, isBuy, tokenId, userId, v_256];
    }

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

    function decodeMakerOrderData (uint256 data) public view returns (uint256 nonce, uint256 makerFee,
                                                            uint256 joyPrice, uint256 userId, uint256 v_256)
    {
        if (data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0) {
            v_256 = 27;
        } else {
            v_256 = 28;
        }
        nonce = data / 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        data = data & 0x000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffff;
        makerFee = data / 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        data = data & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffff;
        joyPrice = data / 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;
        userId = data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function decodeWithdrawData (uint256 _data) public view returns (uint256 paymentMethod, uint256 tokenID, uint256 userID) {
        /**
            data3
            0x000181bfeb 0000000000000 1 1 000000000000000000000000000 0002 00000001
            [ 0.. 9] (uint256) nonce         --> use for random hash             
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

    function retrieveV (uint256 _data) public view returns (uint256 v) {
        // [24..24] v 0:27 1:28
        if (_data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0) {
            v = 27;
        } else {
            v = 28;
        }
    }

    function genUserSignedWithdrawData (uint256 _data, address _address) public view returns (uint256 data) {
        _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        data = _data | (uint256)(_address);
    }

    function genUserSignedOrderData (uint256 _data, uint256 _isBuy, address _address) public view returns (uint256 data) {
        _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
        _data = _data | _isBuy;
        data = _data | (uint256)(_address);
    }

    function subArray (uint256 from, uint256 to, uint256[] array) public view returns (uint256[]) {
        uint256[] temp;
        for(uint256 i = from; i <= to; i++) {
            temp.push(array[i]);
        }
        return temp;
    }
}