pragma solidity ^0.4.19;

interface TToken {
    function balanceOf(address who) public view returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    function allowance(address owner, address spender) public view returns (uint256);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract TestMigrate {
    mapping (address => mapping (address => uint256)) public balances;

    function migrate(address[2] users, uint256[2] amounts, address tokenAddr) external payable returns (bool) {        
        uint256 ll = users.length;
        uint256 sum = 0;
        require (ll == amounts.length);
        for (uint256 i = 0; i < ll; i++) {
            balances[tokenAddr][users[i]] += amounts[i];
            sum += amounts[i];
        }

        if(tokenAddr == address(0)) {
            require (sum == msg.value);
        } else {
            require(TToken(tokenAddr).transferFrom(msg.sender, this, sum));
        }

        return true;
    }
    
    function migrateSingle(address user, uint256 amount, address tokenAddr) external payable returns (bool) {
        if(tokenAddr == address(0)) {
            require (amount == msg.value);
        } else {
            require (TToken(tokenAddr).transferFrom(msg.sender, this, amount));
        } 

        balances[tokenAddr][user] += amount;
        return true;
    }
    
    function getBalance (address token, address account) external view returns (uint256) {
        return balances[token][account];
    }
}
