pragma solidity ^0.4.15;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable {
    using SafeMath for uint256;

    mapping (address => mapping (address => uint256)) public balances;
    mapping (address => mapping (bytes32 => bool)) public orderBook;
    mapping (address => mapping (uint256 => bool)) public dependency;
    mapping (bytes32 => uint256) public remain;

    //events
    event Deposit (address token, address sender, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Transfer (address token, address sender, uint256 amount, uint256 senderBalance, address reveiver, uint256 receriverBalance);

    /** Event for take fails
      * 1: the order is filled 
      * 2: maker's balance is not enough
      * 3:
      */
    event Fail(uint8 index, address maker, address tokenSell, address tokenBuy, uint256 price, uint256 amount, uint256 expires, uint256 nonce);
 
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
      * Using token = 0x to transfer ether.
      */
    function transfer (address token, address receiver, uint256 amount) public {
        require (balances[token][msg.sender] >= amount);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        balances[token][receiver] = balances[token][receiver].add(amount);

        Transfer(token, msg.sender, amount, balances[token][msg.sender], receiver, balances[token][receiver]);
    }

    function make (address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce) public {
        // simple check first, if these not pass, there is no need to watse more gas 
        require(balances[tokenSell][msg.sender] >= amount);
        require(block.number <= expires);
        require(nonce == 0 || dependency[msg.sender][nonce] == false); // nonce = 0 to ignore dependency check 

        bytes32 hash = keccak256(msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
        assert(orderBook[msg.sender][hash] = false); // This should be a new order.
        orderBook[msg.sender][hash] = true;
        dependency[msg.sender][nonce] = true;
        assert(remain[hash] == 0); // a new order should ramain nothing. 
        remain[hash] = amount;

        //event
    }

    function take (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce, 
                uint8 v, bytes32 r, bytes32 s, uint256 amountTake, bool turnToOrder) public 
    {
        // simple check first, if these not pass, there is no need to waste more gas
        require(block.number <= expires);
        require(balances[tokenBuy][msg.sender] >= amountTake);
        require(amountTake <= amountBuy);
        require(nonce == 0 || dependency[maker][nonce] == false);    // check dependency

        bytes32 hash = keccak256(maker, tokenSell, tokenBuy, amountTake, amountBuy, expires, nonce);
        if (!orderBook[maker][hash]) {
            /** this order did not show on blockchain yet. 
              * if signature is right, put it on the chain. 
              * check the dependency and balance first, we dont need to put the invalid order on chain
              */  
            require(verify(hash, maker, v, r, s));             // verify the signature
            require(balances[tokenSell][maker] <= amountSell); // this is a new order, check maker's balance
            orderBook[maker][hash] = true;
            dependency[maker][nonce] = true;
            // we should put every filled order on-chain.
            // assert(remain[hash] == 0);
            remain[hash] = amount;
        }

        // check if the order is filled
        if (remain[hash] == 0) {
            Fail(1, maker, tokenSell, tokenBuy, price, amount, expires, nonce);
            return;
        }

        // check if the order is valid, if not, fill the order and return Failed event
        if (balances[tokenSell][maker] <= remain[hash]) {
            remain[hash] == 0;
            Fail(2, maker, tokenSell, tokenBuy, price, amount, expires, nonce);
            return;
        }

        if (!trade(maker, tokenSell, tokenBuy, price, takeAmount)) {
        }

    }

    function cancel () public {

    }

    // helper functions
    function getBalance (address token, address account) public constant returns (uint256) {
        return balances[token][account];
    }

    function testOrder () public constant {

    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public returns (bool) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hash);
        return ecrecover(prefixedHash, v, r, s) == sender;
    }

    // internal function
    /** Trade function directly trade between two parties.
      * Besure to check anything then enter this function.  
      */
    function trade (address maker, address tokenSell, address tokenBuy, uint256 price, uint256 takeAmount) private returns (bool) {
        balances[tokenSell][maker].sub(takeAmount)
    }
}