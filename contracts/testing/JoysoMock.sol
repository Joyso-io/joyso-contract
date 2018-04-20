pragma solidity 0.4.19;

import "../Joyso.sol";


contract JoysoMock is Joyso {
    uint256 public time;

    function JoysoMock(address _joysoWallet, address _joyToken) public Joyso(_joysoWallet, _joyToken) {
        time = 10;
    }

    function getTime() internal view returns (uint256) {
        return time;
    }

    function setTime(uint256 _t) public {
        time = _t;
    }
}
