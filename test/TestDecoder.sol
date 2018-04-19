pragma solidity 0.4.19;
import "../contracts/JoysoDataDecoder.sol";
import "truffle/Assert.sol";


contract TestDecoder is JoysoDataDecoder {
    uint256 constant ORDER_V = 0x0181bfeb0014000a000000001000000000000000000000000000000200000001;
    uint256 constant WITHDRAWDATA_V = 0x000181bfeb000000000000011000000000000000000000000000000200000001;
    uint256 constant data4V = 0x1c00000000000160004a1170b2f7eb1f2c37645be61d73953035360e768d81e6;
    uint256 constant PAYWITHJOY = 0x0000000000000000000000010000000000000000000000000000000000000000;
    uint256 constant PAYWITHETHER = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 constant ORDER_ISBUY = 0x0000000000000000000000010000000000000000000000000000000000000000;

    function testDecodeWithdraw () public {
        uint256 v_256;
        uint256 paymentMethod;
        uint256 tokenID;
        uint256 userID;
        v_256 = retrieveV(WITHDRAWDATA_V);
        Assert.equal(v_256, 0x1c, "v should be 1c");
        (paymentMethod, tokenID, userID) = decodeWithdrawData(WITHDRAWDATA_V);
        Assert.equal(paymentMethod, PAYWITHJOY, "paymentMethod should be JOY");
        Assert.equal(tokenID, 0x2, "tokenID should be 2");
        Assert.equal(userID, 0x1, "userID should be 1");
    }

    function testDecodeOrderData () public {
        var (tokenId, isBuy) = decodeOrderTokenIdAndIsBuy(ORDER_V);
        Assert.equal(tokenId, 0x2, "tokenId should be 2");
        Assert.equal(isBuy, ORDER_ISBUY, "this order is buy token");
        Assert.equal(decodeOrderNonce(ORDER_V), 0x0181bfeb, "the nonce should be 0x0181bfeb");
        Assert.equal(decodeOrderTakerFee(ORDER_V), 0x0014, "taker fee should be 0x0014");
        Assert.equal(decodeOrderMakerFee(ORDER_V), 0x000a, "maker fee should be 0x000a");
        Assert.equal(decodeOrderJoyPrice(ORDER_V), 0, "joyPrice should be 0");
        Assert.equal(decodeOrderUserId(ORDER_V), 1, "userId should be 1");
    }

}
