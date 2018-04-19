pragma solidity ^0.4.8;

import "../../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract TestToken is StandardToken {
    uint public constant INITIAL_SUPPLY = 10 ** (50 + 18);
    string public name = "Test";
    string public symbol = "TST";
    uint public decimals = 18;

    function TestToken(string _name, string _symbol, uint _decimals) public {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
}
