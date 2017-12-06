pragma solidity ^0.4.17;
import "../contracts/JoysoDataDecoder.sol";
import "truffle/Assert.sol";

contract TestDecoder {
    uint256 constant data1 = 0x000000000000000000000001b2f7eb1f2c37645be61d73953035360e768d81e6;
    uint256 constant data2V = 0x1c0014160004a11703000000b2f7eb1f2c37645be61d73953035360e768d81e6;
    uint256 constant data3V = 0x000181bfeb000000000000011000000000000000000000000000000200000001;
    uint256 constant data4V = 0x1c00000000000160004a1170b2f7eb1f2c37645be61d73953035360e768d81e6;
    uint256 constant PAYWITHJOY = 0x0000000000000000000000010000000000000000000000000000000000000000;
    uint256 constant PAYWITHETHER = 0x0000000000000000000000000000000000000000000000000000000000000000;

    event Log(uint256 msg);

    // function testDecodeData1 () public {
    //     JoysoDataDecoder aa = new JoysoDataDecoder();
    //     bool isBuy;
    //     address token;
    //     (isBuy, token) = aa.decodeData1(data1);
    //     Assert.equal(isBuy, true, "isBuy should be true");
    //     Assert.equal(token, 0xb2f7eb1f2c37645be61d73953035360e768d81e6, "token address should be 0xb2f7eb1f2c37645be61d73953035360e768d81e6");
    // }

    // function testDecodeData2 () public {
    //     JoysoDataDecoder aa = new JoysoDataDecoder();
    //     uint256 v_256;
    //     uint256 data;
    //     uint256 txFee;
    //     uint256 timeStamp;
    //     uint256 joyPrice;
    //     address userAddress;
    //     (data, v_256) = aa.retrieveV(data2V);
    //     Log(v_256);
    //     Assert.equal(v_256, (uint256)(0x1c), "v should be 1c");
    //     (txFee, timeStamp, joyPrice, userAddress) = aa.decodeData2(data);
    //     Assert.equal(txFee, 0x0014, "txFee should be 14");
    //     Assert.equal(timeStamp, 0x160004a1170, "timeStamp should be 160004a1170");
    //     Assert.equal(joyPrice, 0x3000000, "joyPrice should be 0x3000000");
    //     Assert.equal(userAddress, 0xb2f7eb1f2c37645be61d73953035360e768d81e6, "userAddress should be 0xb2f7eb1f2c37645be61d73953035360e768d81e6");
    // }

    function testDecodeWithdraw () public {
        JoysoDataDecoder aa = new JoysoDataDecoder();
        uint256 v_256;
        uint256 paymentMethod;
        uint256 tokenID;
        uint256 userID;
        v_256 = aa.retrieveV(data3V);
        Assert.equal(v_256, 0x1c, "v should be 1c");
        (paymentMethod, tokenID, userID) = aa.decodeWithdrawData(data3V);
        Assert.equal(paymentMethod, PAYWITHJOY, "paymentMethod should be JOY");
        Assert.equal(tokenID, 0x2, "tokenID should be 2");
        Assert.equal(userID, 0x1, "userID should be 1");
    }

    // function testDecodeData4 () public {
    //     JoysoDataDecoder aa = new JoysoDataDecoder();
    //     uint256 v_256;
    //     uint256 data;
    //     uint256 timeStamp;
    //     address userAddress;
    //     (data, v_256) = aa.retrieveV(data4V);
    //     Assert.equal(v_256, 0x1c, "v should be 1c");
    //     (timeStamp, userAddress) = aa.decodeData4(data); 
    //     Assert.equal(timeStamp, 0x160004a1170, "timeStamp should be 160004a1170");
    //     Assert.equal(userAddress, 0xb2f7eb1f2c37645be61d73953035360e768d81e6, "userAddress should be 0xb2f7eb1f2c37645be61d73953035360e768d81e6");
    // }
}