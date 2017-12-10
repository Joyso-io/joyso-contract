pragma solidity ^0.4.17;

contract JoysoDataDecoder {

   function decodeData1 (uint256 data) public view returns (bool isBuy, address token) {
        /**
            data1
            0x00000000000000000000000 1 b2f7eb1f2c37645be61d73953035360e768d81e6
            [23..23] (bool) isBuy
            [24..63] (address) token
         */
         token = (address)(data & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
         isBuy = (data & 0x00000000000000000000000f0000000000000000000000000000000000000000) > 0;
    }

   function decodeData2 (uint256 _data) public view returns (uint256 txFee, uint256 timeStamp, uint256 joyPrice, address userAddress) {
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

   function genUserSignedData (uint256 _data, address _address) public view returns (uint256 data) {
       _data = _data & 0xffffffffffffffffffffffff0000000000000000000000000000000000000000;
       data = _data | (uint256)(_address);
   }
}