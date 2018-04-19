pragma solidity 0.4.19;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract TestMigrate {
    mapping (address => mapping (address => uint256)) public balances;

    function migrate(address[2] users, uint256[2] amounts, address tokenAddr) external payable returns (bool) {
        uint256 ll = users.length;
        uint256 sum = 0;
        require(ll == amounts.length);
        for (uint256 i = 0; i < ll; i++) {
            balances[tokenAddr][users[i]] += amounts[i];
            sum += amounts[i];
        }

        if (tokenAddr == address(0)) {
            require(sum == msg.value);
        } else {
            require(ERC20(tokenAddr).transferFrom(msg.sender, this, sum));
        }

        return true;
    }

    function migrateSingle(address user, uint256 amount, address tokenAddr) external payable returns (bool) {
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
