pragma solidity ^0.4.17;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable {
    using SafeMath for uint256;

    struct JoysoOrder {
        bytes32 orderID;
        address owner;
        address tokenSell;
        address tokenBuy;
        uint256 amountSell;
        uint256 amountBuy;
        uint256 expires;
        uint256 nonce;
        uint256 balance;
        /** status = 0: off-chain
            status = 1: onchain and still avaliable
            status = 2: onchain but finished
         **/ 
        uint256 status; 
    }

    mapping (address => mapping (address => uint256)) public balances;
    mapping (address => mapping (uint256 => bool)) public dependency;
    mapping (bytes32 => JoysoOrder) public orderBook;


    //events
    event Deposit (address token, address sender, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Transfer (address token, address sender, uint256 amount, uint256 senderBalance, address reveiver, uint256 receriverBalance);
    event TradeScuessed (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy);
    event NewOrder(bytes32 orderID, address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce);
    event Cancel(bytes32 orderID);

    /** Event for take fails
      * 1: the order is filled or canceled 
      * 3: scuess the trade but fail in turn to order
      */
    event Fail(uint8 index, address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce);
 
    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.  
      */
    function deposit (address token, uint256 amount) public payable {
        require((token != 0 && msg.value == 0) || msg.value == amount);
        if (msg.value == 0) {
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
        assert(orderBook[hash].orderID == 0); // This should be a new order.
        orderBook[hash] = JoysoOrder(hash, msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce, amountBuy, 1);
        NewOrder(hash, msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
    }

    function takeByID (bytes32 orderID, uint256 amountTake) public {

        JoysoOrder memory thisOrder = orderBook[orderID];
        require(balances[thisOrder.tokenBuy][msg.sender] >= amountTake);
        require(thisOrder.expires >= block.number);
        require(thisOrder.status == 1);

        // update order balance
        updateOrder(orderID);

        // trade
        amountTake = trade(orderID, amountTake);
        TradeScuessed(thisOrder.owner, thisOrder.tokenSell, thisOrder.tokenBuy, thisOrder.amountSell, thisOrder.amountBuy);
    }

    function take (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce,
        uint8 v, bytes32 r, bytes32 s, uint256 amountTake) public 
    {
        require(balances[tokenBuy][msg.sender] >= amountTake);
        require(expires >= block.number);

        bytes32 orderID;
        uint256 orderStatus;
        (orderID, orderStatus) = queryID(maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);

        if (orderStatus == 2) {
            Fail(1, maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
            return;
        }

        if (orderStatus == 0) {
            require (verify(orderID, maker, v, r, s));
            orderBook[orderID] = JoysoOrder(orderID, maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce, amountBuy, 1);
        }

        // update order balance
        updateOrder(orderID);
        
        // trade
        amountTake = trade(orderID, amountTake);
        TradeScuessed(maker, tokenSell, tokenBuy, amountSell, amountBuy);
    }

    function multiTake (address[] maker, address tokenSell, address tokenBuy, uint256[] amountSell, uint256[] amountBuy, uint256[] expires, uint256[] nonce,
        uint8[] v, bytes32[] r, bytes32[] s, uint256 amountTake) public 
    {
        require(balances[tokenBuy][msg.sender] >= amountTake);

        // check length 
        uint256 length = maker.length;
        require(amountSell.length == length && 
            amountBuy.length == length && 
            expires.length == length && 
            nonce.length == length &&
            v.length == length &&
            r.length == length && 
            s.length == length);

        for (uint256 i = 0; i < length; i++){
            if (amountTake <= 0) break;
            amountTake = internalTrade(maker[i], tokenSell, tokenBuy, amountSell[i], amountBuy[i], expires[i], nonce[i],
                                    v[i], r[i], s[i], amountTake);
        }
    }

    function cancel (address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce) public {
        bytes32 orderID;
        uint256 orderStatus;
        (orderID, orderStatus) = queryID(msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
        orderBook[orderID] = JoysoOrder(orderID, msg.sender, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce, 0, 2);
        Cancel(orderID);
    }

    function updateOrder (bytes32 orderID) public {
        JoysoOrder memory thisOrder = orderBook[orderID];
        if (balances[thisOrder.tokenSell][thisOrder.owner] == 0) {
            orderBook[orderID].status = 2;
            return;
        }
        if (balances[thisOrder.tokenSell][thisOrder.owner] <= thisOrder.amountSell) {
            if (balances[thisOrder.tokenSell][thisOrder.owner].mul(thisOrder.amountBuy).div(thisOrder.amountSell) <= thisOrder.balance) {
                orderBook[orderID].balance = balances[thisOrder.tokenSell][thisOrder.owner].mul(thisOrder.amountBuy).div(thisOrder.amountSell);
            }
        }
    }

    // helper functions
    function getBalance (address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function queryID (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce) 
        public view returns (bytes32 hash, uint256 status) 
    {
        hash = keccak256(maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
        status = orderBook[hash].status;
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hash);
        return ecrecover(prefixedHash, v, r, s) == sender;
    }

    // internal function
    /** This function directly trade between two parties.
      * Besure to check anything then enter this function.  
      */
    function trade (bytes32 orderID, uint256 amountTake) 
        private returns (uint256)
    {
        uint256 amountToBuy = amountTake;
        if (orderBook[orderID].balance > amountTake) {
            amountToBuy = orderBook[orderID].balance;
        }

        // update balance first
        orderBook[orderID].balance.sub(amountToBuy);
        if (orderBook[orderID].balance <= 0) {
            orderBook[orderID].status = 2;
        }
        JoysoOrder memory thisOrder = orderBook[orderID];
    
        // update maker/taker's balance
        uint256 amountToSell = amountToBuy.mul(thisOrder.amountSell).div(thisOrder.amountBuy);
        balances[thisOrder.tokenSell][thisOrder.owner] = balances[thisOrder.tokenSell][thisOrder.owner].sub(amountToSell);
        balances[thisOrder.tokenSell][msg.sender] = balances[thisOrder.tokenSell][msg.sender].add(amountToSell);
        balances[thisOrder.tokenBuy][msg.sender] = balances[thisOrder.tokenBuy][msg.sender].sub(amountToBuy);
        balances[thisOrder.tokenBuy][thisOrder.owner] = balances[thisOrder.tokenBuy][thisOrder.owner].add(amountToBuy);

        return amountTake - amountToBuy;
    }

    function internalTrade (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce,
        uint8 v, bytes32 r, bytes32 s, uint256 amountTake)
        private returns (uint256 reamin)
    {
        if (expires >= block.number) return;
        bytes32 orderID;
        uint256 orderStatus;
        (orderID, orderStatus) = queryID(maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce);
        if (orderStatus == 2) return;
        if (orderStatus == 0) {
            if (!verify(orderID, maker, v, r, s)) return;
            orderBook[orderID] = JoysoOrder(orderID, maker, tokenSell, tokenBuy, amountSell, amountBuy, expires, nonce, amountBuy, 1);
        }
        updateOrder(orderID);
        reamin = trade(orderID, amountTake);
    }
}