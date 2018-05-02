pragma solidity 0.4.19;

/**
 * @title Migratable
 * @dev an interface for joyso to migrate to the new version
 */
contract Migratable {
    function migrate(address user, uint256 amount, address tokenAddr) external payable returns (bool);
}
