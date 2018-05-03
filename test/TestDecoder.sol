pragma solidity 0.4.19;
import "../contracts/JoysoDataDecoder.sol";
import "truffle/Assert.sol";


contract TestDecoder is JoysoDataDecoder {
    uint256 constant ORDER_V = 0x0181bfeb0014000a000000001000000000000000000000000000000200000001;

    function testDecodeOrderData () public {
        Assert.equal(decodeOrderUserId(ORDER_V), 1, "userId should be 1");
    }
}
