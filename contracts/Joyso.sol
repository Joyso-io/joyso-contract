pragma solidity ^0.4.17;

import "./lib/SafeMath.sol";
import "./lib/Ownable.sol";
import {StandardToken as Token} from "./lib/StandardToken.sol";

/** @title Joyso contract 
  * 
  */
contract Joyso is Ownable {
    using SafeMath for uint256;
    uint256 constant TIME_LOCK_PERIOD = 100000;

    mapping (address => mapping (address => uint256)) public balances;
    mapping (bytes32 => uint256) public orderBalance;
    mapping (address => uint256) public timeLock;
    mapping (address => bool) public isAdmin;
    mapping (bytes32 => bool) public fee_paid;
    mapping (bytes32 => JoysoOrder) public orderBook;
    mapping (bytes32 => bool) public withdrawn;

    uint256 public withdrawFee;

    modifier onlyAdmin {
        require(msg.sender == owner || isAdmin[msg.sender]);
        _;
    }

    //events
    event Deposit (address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Transfer (address token, address sender, uint256 amount, uint256 senderBalance, address reveiver, uint256 receriverBalance);
    event TradeScuessed (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy);
    event Cancel(bytes32 orderID);

    /** Event for take fails
      * 1: the order is filled or canceled 
      * 3: scuess the trade but fail in turn to order
      */
    event Fail(uint8 index, address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 expires, uint256 nonce);
 
    function Joyso (uint256 _withdrawFee) {
        withdrawFee = _withdrawFee;
    }

    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.  
      */
    function depositToken (address token, uint256 amount) public {
        require(Token(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        timeLock[msg.sender] = block.number + TIME_LOCK_PERIOD;
        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function depositEther () public payable {
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);
        timeLock[msg.sender] = block.number + TIME_LOCK_PERIOD;
        Deposit(0, msg.sender, msg.value, balances[0][msg.sender]);
    }

    function withdrawUser (address token, uint256 amount) public {
        require(block.number > timeLock[msg.sender]);
        require(balances[token][msg.sender] >= amount);
        balances[token][msg.sender].sub(amount);
        if(token == 0) {
            msg.sender.transfer(amount);
        } else {
            require(Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);       
    }

    // user send the transaction, user pay the fee, need the admin's signatue to insure the tx schedule
    function withdrawAdmin (address token, uint256 amount, address admin, uint8 v, bytes32 r, bytes32 s, uint256 nonce) public {
        bytes32 hash = sha3(msg.sender, token, amount, nonce);
        require (verify(hash, admin, v, r, s));
        require (!withdrawn[hash]);
        withdrawn[hash] = ture;
        require (balances[token][user] >= amount);
        balances[token][msg.sender].sub(amount);
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require (Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);       
    }

    // admin send the transaction, collect fees from user
    function adminWithdraw (address token, uint256 amount, address user, uint8 v, bytes32 r, bytes32 s, uint256 nonce, uint256 withdrawFee) onlyAdmin public {
        require (withdrawFee < 50 finney);
        bytes32 hash = sha3(user, token, amount, nonce);
        require (!withdrawn[hash]);
        require (verify(hash, user, v, r, s));
        require (balances[token][user] >= amount + withdrawFee[token]);
        balances[token][user].sub(amount);
        balances[token][fee_collector].add(withdrawFee);
        withdrawn[hash] = true;
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require( Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, user, amount, balances[token][user]);       
    }

    function match (address[] maker, address token1, address token2, uint256[] amountSell, uint256[] amountBuy, uint256[] nonce,
        uint8[] v, bytes32[] r, bytes32[] s) onlyAdmin public 
        // TODO: be sure the maker's ratio is better for taker 
        /**
          * array[0]: taker, sell token2, buy token1
          * array[1]: maker1, sell token1, buy token2
          * array[2]: maker2, sell token1, buy token2
          */
    {
        bytes32 hash = queryID(maker[0], token2, token1, amountSell[0], amountBuy[0], nonce[0]);
        require (verify(hash, maker[0], v[0], r[0], s[0]));
        uint256 tosb = amoutSell[0]; // taker order sell balance
        uint256 tobb = 0; // taker order buy balance

        for (uint256 i = 0; i < maker.length - 1; i++) {
            if (tosb <= 0) 
                break;
            bytes32 makeHash = queryID(maker[i], token1, token2, amountSell[i], amountBuy[i], nonce[i]);
            if (!verify(makeHash, maker[i], v[i], r[i], s[i])) 
                continue; // Should we need the event if verify fail???
            (tosb, tobb) = internalTrade(maker[i], token1, token2, amountSell[i], amountBuy[i], makeHash, tosb, tobb);
        }

        // update the taker's balance
    }

    // helper functions
    function getBalance (address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function queryID (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 nonce) 
        public view returns (bytes32 hash) 
    {
        hash = keccak256(maker, tokenSell, tokenBuy, amountSell, amountBuy, nonce);
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        // bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        // bytes32 prefixedHash = keccak256(prefix, hash);
        // return ecrecover(prefixedHash, v, r, s) == sender;
        return ecrecover(hash, v, r, s) == sender;
    }

    function internalTrade (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, bytes32 makerHash, 
        uint256 tosb, uint256 tobb)
        private returns (uint256 tosb, uint256 tobb)
    {
        uint256 orderBuyBalance = amountBuy.sub(orderBalance[makerHash]);
        uint256 orderSellBalance = orderBuyBalance.mul(amountSell).div(amountBuy);
        if (tosb >= orderBuyBalance) { 
            tosb = tosb.sub(orderBuyBalance);
            tobb = tobb.add(orderSellBalance);

            // fill the orderBalance 
            orderBalance[makerHash] = amountBuy;

            // update the maker balance 
            balances[tokenSell][maker] = balances[tokenSell].sub(orderSellBalance);
            balances[tokenBuy][maker] = balances[tokenBuy].add(orderBuyBalance);
        } else { // tosb < orderBuyBalance
            uint256 actualBuyAmount = tosb.mul(amountSell).div(amountBuy);
            uint256 actualSellAmount =  actualBuyAmount.mul().div();
        }
    }
}