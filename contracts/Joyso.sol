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
    mapping (bytes32 => uint256) public orderFills;
    mapping (address => uint256) public lastActive;
    mapping (address => bool) public isAdmin;
    mapping (bytes32 => bool) public withdrawn;

    address public joysoWallet;

    modifier onlyAdmin {
        require(msg.sender == owner || isAdmin[msg.sender]);
        _;
    }

    //events
    event Deposit (address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
 
    function Joyso (address _joysoWallet) {
        joysoWallet = _joysoWallet;
    }

    /** Deposit allow user to store the funds in Joyso contract.
      * It is more convenient to transfer funds or to trade in contract.
      * Besure to approve the contract to move your erc20 token if depositToken.  
      */
    function depositToken (address token, uint256 amount) public {
        require(Token(token).transferFrom(msg.sender, this, amount));
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
        lastActive[msg.sender] = block.number;
        Deposit(token, msg.sender, amount, balances[token][msg.sender]);
    }

    function depositEther () public payable {
        balances[0][msg.sender] = balances[0][msg.sender].add(msg.value);
        lastActive[msg.sender] = block.number;
        Deposit(0, msg.sender, msg.value, balances[0][msg.sender]);
    }

    function withdraw (address token, uint256 amount) public {
        require(block.number > lastActive[msg.sender] + TIME_LOCK_PERIOD);
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
    function withdrawWithApproval (address token, uint256 amount, address admin, uint8 v, bytes32 r, bytes32 s, uint256 timestamp) public {
        require (isAdmin[admin]);
        bytes32 hash = keccak256("Joyso", msg.sender, token, amount, timestamp);
        require (block.timestamp < timestamp + 10 minutes);
        require (verify(hash, admin, v, r, s));
        require (!withdrawn[hash]);
        withdrawn[hash] = true;
        require (balances[token][msg.sender] >= amount);
        balances[token][msg.sender].sub(amount);
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require (Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, msg.sender, amount, balances[token][msg.sender]);       
    }

    // admin send the transaction, collect fees from user
    function withdrawByAdmin (address token, uint256 amount, address user, uint8 v, bytes32 r, bytes32 s, uint256 timestamp, uint256 withdrawFee) onlyAdmin public {
        require (withdrawFee < 50 finney);
        bytes32 hash = keccak256("Joyso", token, amount, timestamp);
        require (!withdrawn[hash]);
        require (verify(hash, user, v, r, s));
        require (balances[token][user] >= amount + withdrawFee);
        balances[token][user].sub(amount);
        balances[token][joysoWallet].add(withdrawFee);
        withdrawn[hash] = true;
        if (token == 0) {
            msg.sender.transfer(amount);
        } else {
            require( Token(token).transfer(msg.sender, amount));
        }
        Withdraw(token, user, amount, balances[token][user]);       
    }

    function makeMatches (address[] inputAddresses, uint256[] inputInts, uint8[] v, bytes32[] r, bytes32[] s) onlyAdmin public 
        // TODO: be sure the maker's ratio is better for taker 
        /**
          * inputAddresses
          * inputAddresses[0]: token1 
          * inputAddresses[1]: token2
          * inputAddresses[2]: taker, sell token2, buy token1
          * inputAddresses[3]: maker1, sell token1, buy token2
          * inputAddresses[4]: maker2, sell token1, buy token2
          *
          * inputInts
          * inputInts[0]: amountSell of taker order
          * inputInts[1]: amountBuy of taker order 
          * inputInts[2]: timestamp of taker order
          * inputInts[3*i]: amountSell of order i 
          * inputInts[3*i+1]: amountBuy of order i 
          * inputInts[3*i+2]: timestamp of order i 
          */
    {
        // keccak256(token2, token1, amountSell_taker, amountBuy_taker, timestamp)
        bytes32 hash = keccak256(inputAddresses[1], inputAddresses[0], inputInts[0], inputInts[1], inputInts[2]);
        require (verify(hash, inputAddresses[2], v[0], r[0], s[0]));
        // every take order must first time on chain
        require(orderFills[hash] == 0);
        uint256 tosb = inputInts[0]; // taker order sell balance
        uint256 tobb = 0; // taker order buy balance

        for (uint256 i = 0; i < inputAddresses.length - 1; i++) {
            // TODO: we should guerentee the maker's price is better than taker's price
            // TODO: should we guerentee the maker's price is better than the next maker's price?
            if (tosb <= 0) 
                break;
            bytes32 makeHash = keccak256(inputAddresses[i+3], inputAddresses[0], inputAddresses[1], inputInts[3*i], inputInts[3*i+1], inputInts[3*i+2]);
            if (!verify(makeHash, inputAddresses[i+3], v[i], r[i], s[i])) 
                continue; // Should we need the event if verify fail???
            (tosb, tobb) = internalTrade(inputAddresses[i+3], inputAddresses[0], inputAddresses[1], inputInts[3*i], inputInts[3*i+1], makeHash, tosb, tobb);
        }

        // update taker blance
        updateBalance(tosb, tobb, inputAddresses[2], hash, inputAddresses[0], inputAddresses[1], inputInts[0]);
    }

    // helper functions
    function getBalance (address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function queryOrderId (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, uint256 nonce) 
        public view returns (bytes32 hash) 
    {
        return keccak256("Joyso", maker, tokenSell, tokenBuy, amountSell, amountBuy, nonce);
    }

    function verify (bytes32 hash, address sender, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        // bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        // bytes32 prefixedHash = keccak256(prefix, hash);
        // return ecrecover(prefixedHash, v, r, s) == sender;
        return ecrecover(hash, v, r, s) == sender;
    }

    function updateBalance(uint256 tosb, uint256 tobb, address user, bytes32 hash, address token1, address token2, uint256 amountSell) private {
        // update take order 
        // every take order must first time on chain
        orderFills[hash] = tobb;

        // update the taker's balance
        balances[token2][user] = balances[token2][user].sub(amountSell.sub(tosb));
        balances[token1][user] = balances[token1][user].add(tobb);
    }

    function internalTrade (address maker, address tokenSell, address tokenBuy, uint256 amountSell, uint256 amountBuy, bytes32 makerHash, 
        uint256 _tosb, uint256 _tobb)
        private returns (uint256 tosb, uint256 tobb)
    {
        // uint256 orderBuyBalance = amountBuy.sub(orderFills[makerHash]);
        // uint256 orderSellBalance = amountBuy.sub(orderFills[makerHash].mul(amountSell).div(amountBuy);
        // TODO: maybe we should check maker's balance here 
        if (_tosb >= amountBuy.sub(orderFills[makerHash])) { 
            tosb = _tosb.sub(amountBuy.sub(orderFills[makerHash]));
            tobb = _tobb.add(amountBuy.sub(orderFills[makerHash].mul(amountSell).div(amountBuy)));

            // fill the orderBalance 
            orderFills[makerHash] = amountBuy;

            // update the maker balance 
            balances[tokenSell][maker] = balances[tokenSell][maker].sub(amountBuy.sub(orderFills[makerHash].mul(amountSell).div(amountBuy)));
            balances[tokenBuy][maker] = balances[tokenBuy][maker].add(amountBuy.sub(orderFills[makerHash]));
        } else { // tosb < orderBuyBalance
            
            // fill the order balance
            orderFills[makerHash] = orderFills[makerHash].add(tosb);
            uint256 actualBuy = tosb.mul(amountSell).div(amountBuy);

            // update the maker balance
            balances[tokenSell][maker] = balances[tokenSell][maker].sub(tosb);
            balances[tokenBuy][maker] = balances[tokenBuy][maker].add(actualBuy);

            // update the tobb/tosb and return
            tobb = _tobb.add(actualBuy);
            tosb = 0;
        }
    }
}