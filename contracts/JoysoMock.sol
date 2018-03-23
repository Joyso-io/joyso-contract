pragma solidity 0.4.19;
import "./Joyso.sol";

contract JoysoMock is Joyso {
  uint256 public _time;

  function JoysoMock(address _joysoWallet, address _joyToken) public Joyso(_joysoWallet, _joyToken) {
    _time = 10;
  }

  function getTime () public view returns (uint256) {
    return _time;
  }

  function setTime (uint256 _t) public {
    _time = _t;
  } 
}
