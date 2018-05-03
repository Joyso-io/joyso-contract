pragma solidity 0.4.19;

/**
 * @title JoysoDataDecoder
 * @author Will, Emn178
 * @notice decode the joyso compressed data
 **/
contract JoysoDataDecoder {
    function decodeOrderUserId(uint256 data) internal pure returns (uint256) {
        return data & 0x00000000000000000000000000000000000000000000000000000000ffffffff;
    }

    function retrieveV(uint256 data) internal pure returns (uint256) {
        // [24..24] v 0:27 1:28
        return data & 0x000000000000000000000000f000000000000000000000000000000000000000 == 0 ? 27 : 28;
    }
}
