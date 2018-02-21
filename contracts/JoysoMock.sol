pragma solidity ^0.4.17;
import "./Joyso.sol";

contract JoysoMock is Joyso {
  uint256 public _block;

  function JoysoMock(address _joysoWallet, address _joyToken) public Joyso(_joysoWallet, _joyToken) {
    _block = 10;
  }

  function getBlock () public view returns (uint256) {
    return _block;
  }

  function setBlock (uint256 _b) public {
    _block = _b;
  } 
}
