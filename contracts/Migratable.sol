pragma solidity 0.4.19;

contract Migratable {
    function migrate(address user, uint256 amount, address tokenAddr) external payable returns (bool);
}
