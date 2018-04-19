pragma solidity 0.4.19;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../Migratable.sol";


contract NewJoyso is Migratable {
    mapping (address => mapping (address => uint256)) public balances;

    function migrate(address user, uint256 amount, address tokenAddr) external payable returns (bool) {
        if (tokenAddr == address(0)) {
            require(amount == msg.value);
        } else {
            require(ERC20(tokenAddr).transferFrom(msg.sender, this, amount));
        }

        balances[tokenAddr][user] += amount;
        return true;
    }

    function getBalance(address token, address account) external view returns (uint256) {
        return balances[token][account];
    }
}
