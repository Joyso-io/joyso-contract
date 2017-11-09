pragma solidity ^0.4.15;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable {
    using SafeMath for uint256;

    struct order {
        bytes32 hashID;
        address owner;
        address tokenSell;
        address tokenBuy;
        uint256 amountSell;
        uint256 amountBuy;
        uint256 expires;
        uint256 nonce;
        bool status;
    }

    mapping (address => mapping (address => uint256)) public balances;
    mapping (address => mapping (uint256 => bool)) public dependency;
    mapping (bytes32 => order) public orderBook;


    //events
    event Deposit (address token, address sender, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Transfer (address token, address sender, uint256 amount, uint256 senderBalance, address reveiver, uint256 receriverBalance);
    event TradeScuessed (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy);
    event NewOrder(address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce);

    /** Event for take fails
      * 1: the order is filled 
      * 2: maker's balance is not enough
      * 3: scuess the trade but fail in turn to order
      */
    event Fail(uint8 index, address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce);
 
    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.  
      */
    function deposit (address token, uint256 amount) public payable {
        require(token != 0 || msg.value != 0);
        if (token != 0) {
            require(Token(token).transferFrom(msg.sender, this, amount));
        }
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function withdraw (address token, uint256 amount) public {
        require (balances[token][msg.sender] >= amount);
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        if (token == 0) {
            require (msg.sender.call.value(amount)());
        } else {
            require (Token(token).transfer(msg.sender, amount));
        }
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
        require(balances[tokenSell][msg.sender] >= amountSell);
        require(block.number <= expires);
        bytes32 hash = keccak256(msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
        assert(orderBook[hash].hashID == 0); // This should be a new order.
        orderBook[hash] = (hash, msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce, 1);
        NewOrder(msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
    }

    /** if the remaing tokens of order is not enough, 
      * taker can turn the remaing token to the new order
      * by specify the turnToOrder, 
      * if number is larger than current block height, it will be set to the expire
      * else means do not want to tune to the new order. 
      */ 
    function take (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce, 
                uint8 v, bytes32 r, bytes32 s, uint256 amountTake, uint256 turnToOrder) public 
    {
        bytes32 hash = keccak256(maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);

        // simple check first, if these not pass, there is no need to waste more gas
        require(simpleCheck(maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce, amountTake, hash));
 
        require(updateOrder(maker, hash, v, r, s, amountBuy));
        
        //uint256 amountToBuy = calculateOrder(amountTake, balances[tokenSell][maker].mul(amountBuy).div(amountSell), remain[hash]);

        trade(hash, maker, tokenSell, tokenBuy, amountSell, amountBuy, amountTake);
        // turnsToOrder(tokenBuy, tokenSell, amountTake, amountToBuy, amountSell, amountBuy, turnToOrder);
        TradeScuessed(maker, tokenSell, tokenBuy, amountSell, amountBuy);
    }

    // helper functions
    function getBalance (address token, address account) public constant returns (uint256) {
        return balances[token][account];
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public returns (bool) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hash);
        return ecrecover(prefixedHash, v, r, s) == sender;
    }

    function checkOrder (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, 
                uint256 expires, uint256 nonce, uint8 v, bytes32 r, bytes32 s)  constant returns (bool)
    {
        //simple check first 
        if (block.number > expires || 
            dependency[maker][nonce] == true) // check dependency
        {
            return false;
        }
        bytes32 hash = keccak256(maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
        if (orderBook[maker][hash] || verify(hash, maker, v, r, s) ) { 
            return true;             
        } 
        
        return false;
    }

    function simpleCheck (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce, uint256 amountTake, bytes32 hash) 
        public constant returns (bool) 
    {
        if (block.number < expires && 
            balances[tokenBuy][msg.sender] >= amountTake  
             // && balances[tokenSell][maker].mul(amountBuy).div(amountSell) <= remain[hash]
            ) {
                return true;
            }
        return false;
    }

    // internal function
    /** Trade function directly trade between two parties.
      * Besure to check anything then enter this function.  
      */
    function trade (bytes32 hash, address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 amountToBuy) 
        private 
    {
        // update order first
        remain[hash] = remain[hash].sub(amountToBuy);
    
        // update maker/taker's balance
        uint256 amountToSell = amountToBuy.mul(amountSell).div(amountBuy);
        balances[tokenSell][maker] = balances[tokenSell][maker].sub(amountToSell);
        balances[tokenSell][msg.sender] = balances[tokenSell][msg.sender].add(amountToSell);
        balances[tokenBuy][msg.sender] = balances[tokenBuy][msg.sender].sub(amountToBuy);
        balances[tokenBuy][maker] = balances[tokenBuy][maker].add(amountToBuy);
    }

    function turnsToOrder (address tokenSell, address tokenBuy, uint256 amountTake, uint256 amountToBuy, uint256 amountSell, uint256 amountBuy, uint256 turnToOrder) 
        private 
    {
        if (amountTake <= amountToBuy && turnToOrder < block.number) {
            return;
        }
        uint256 amountSellInNewOrder = amountTake.sub(amountToBuy);
        uint256 amountBuyInNewOrder = amountTake.sub(amountToBuy).mul(amountSell).div(amountBuy);
        bytes32 newHash = keccak256(msg.sender, tokenSell, tokenBuy, amountSellInNewOrder, amountBuyInNewOrder, turnToOrder, 0);

        // check if the hash is exist
        if (orderBook[msg.sender][newHash] == true) {
            Fail(3, msg.sender, tokenSell, tokenBuy, amountSellInNewOrder, amountBuyInNewOrder, turnToOrder, 0);
            return;
        }
        orderBook[msg.sender][newHash] = true;
        remain[newHash] = amountBuyInNewOrder;
        NewOrder(msg.sender, tokenSell, tokenBuy, amountSellInNewOrder, amountBuyInNewOrder, turnToOrder, 0);
        return; 
    }

    function updateOrder (address maker, bytes32 hash, uint8 v, bytes32 r, bytes32 s, uint256 amountBuy) private returns (bool) {
        if (!orderBook[maker][hash]) {
            /** this order did not show on blockchain yet. 
              * if signature is right, put it on the chain. 
              * check the dependency and balance first, we dont need to put the invalid order on chain
              */  
            require(verify(hash, maker, v, r, s));             // verify the signature
            orderBook[maker][hash] = true;
            // we should put every filled order on-chain.
            // assert(remain[hash] == 0);
            remain[hash] = amountBuy;
        }
    }

    /** calculates the minmum trade amount
      * check maker balance 
      * check order remain 
      * check amountTake
      */
    function calculateOrder (uint256 amountTake, uint256 makerBalance, uint256 remains) private returns (uint256 amountToBuy) {
        amountToBuy = amountTake;
        if (amountToBuy > remains) {
            amountToBuy = remains;
        }
        if (amountToBuy > makerBalance) {
            amountToBuy = makerBalance;
        }
    }

}