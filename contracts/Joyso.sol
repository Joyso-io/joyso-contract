pragma solidity ^0.4.15;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable {
    using SafeMath for uint256;

    mapping (address => mapping (address => uint)) public balances;
    mapping (address => mapping (bytes32 => bool)) public orderBook;

    //events
    event Deposit (address token, address sender, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Transfer (address token, address sender, uint256 amount, uint256 senderBalance, address reveiver, uint256 receriverBalance);

    /** Deposit or depositToken allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.
      * You can still trade if did not deposit.  
      */
    function deposit () public payable {
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);

        Deposit(0, msg.sender, msg.value, balances[0][msg.sender]);
    }

    // Besure to approve the contract to move your erc20 token 
    function depositToken (address token, uint256 amount) public {
        require(token != 0);
        require(Token(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);

        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function withdraw (uint256 amount) public {
        require(balances[0][msg.sender] >= amount);
        balances[0][msg.sender] = balances[0][msg.sender].sub(amount);
        require(msg.sender.call.value(amount)());

        Withdraw(0, msg.sender, amount, balances[0][msg.sender]);
    }

    function withdrawToken (address token, uint256 amount) public {
        require (token!=0);
        require (balances[token][msg.sender] >= amount);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        require (Token(token).transfer(msg.sender, amount));

        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);
    }

    /** Transfer funds in contract.
      * using token = 0x to transfer ether.
      */
    function transfer (address token, address receiver, uint256 amount) public {
        require (balances[token][msg.sender] >= amount);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        balances[token][receiver] = balances[token][receiver].add(amount);

        Transfer(token, msg.sender, amount, balances[token][msg.sender], receiver, balances[token][receiver]);
    }

    function make (address tokenSell, address tokenGet, uint256 price, uint256 expires, uint256 nonce) public {
        bytes32 hash = keccak256(tokenSell, tokenGet, price, expires, nonce);
        orderBook[msg.sender][hash] = true;

        //event
    }

    function take (address tokenSell, address tokenGet, uint256 price, uint256 expires, uint nonce, 
                   address seller, uint8 v, bytes32 r, bytes32 s, uint amount) public {
        bytes32 hash = keccak256(tokenSell, tokenGet, price, expires, nonce);
        require(validate(hash, seller, v, r, s));

    }

    function cancel () public {

    }

    // helper functions
    function getBalance (address token, address account) public constant returns (uint256) {
        return balances[token][account];
    }

    function testOrder () public constant {

    }

    function validate (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public returns (bool) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hash);
        return ecrecover(prefixedHash, v, r, s) == sender;
    }
}