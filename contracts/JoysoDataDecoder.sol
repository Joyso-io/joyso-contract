pragma solidity ^0.4.17;

contract JoysoDataDecoder {

    function decodeData1 (uint256 data) public constant returns (bool isBuy, address token) {
        /**
            data1
            0x00000000000000000000000 1 b2f7eb1f2c37645be61d73953035360e768d81e6
            [23..23] (bool) isBuy
            [24..63] (address) token 
         */
         token = (address)(data & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
         isBuy = (data & 0x00000000000000000000000f0000000000000000000000000000000000000000) > 0;
    }

    function decodeData2 (uint256 _data) public constant returns (uint256 txFee, uint256 timeStamp, uint256 joyPrice, address userAddress) {
        /**
            data2
            0x00 0014 160004a1170 0000000 b2f7eb1f2c37645be61d73953035360e768d81e6
            [2 .. 5] (uint256) txFee
            [6 ..16] (uint256) timestamp
            [17..23] (uint256) joyPrice --> 0: pay ether, others: pay joy Token
            [24..63] (address) userAddress
         */
        // Assume the _data is come after retriveV, which already eliminated the first two bytes.  
        txFee = _data / 0x000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        _data = _data & 0x000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        timeStamp = _data / 0x00000000000000000fffffffffffffffffffffffffffffffffffffffffffffff;
        _data = _data & 0x00000000000000000fffffffffffffffffffffffffffffffffffffffffffffff;
        joyPrice = _data / 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff;
        userAddress = (address)(_data & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
    }

    function decodeData3 (uint256 _data) public constant returns (uint256 timeStamp, uint256 joyPrice, uint256 paymentMethod, address token) {
        /**
            data3
            0x00000 160004a1170 0000000 1 b2f7eb1f2c37645be61d73953035360e768d81e6
            [5 ..15] (uint256) timestamp
            [16..22] (uint256) joysoPrice
            [23..23] (uint256) paymentMethod --> 0: ether, 1: Token, 2: joyToken
            [24..63] (address) token
         */
        // Assume the _data is come after retriveV, which already eliminated the first two bytes.  
        timeStamp = _data / 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        _data = _data & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff;
        joyPrice = _data / 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;
        _data = _data & 0x00000000000000000000000fffffffffffffffffffffffffffffffffffffffff;
        paymentMethod = _data / 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff;
        token = (address)(_data & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
    }

    function decodeData4 (uint256 _data) public constant returns (uint256 timeStamp, address userAddress) {
        /**
            data4 
            0x0000000000000 160004a1170 b2f7eb1f2c37645be61d73953035360e768d81e6
            [13..23] (uint256) timeStamp
            [24..63] (address) userAddress
         */
        // Assume the _data is come after retriveV, which already eliminated the first two bytes.  
        timeStamp = _data / 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff;
        userAddress = (address)(_data & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
    }

    function retrieveV (uint256 _data) public constant returns (uint256 data, uint256 v) {
        v = _data / 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        data = _data & 0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    }
}