'use strict'

const Joyso = artifacts.require("./JoysoMock.sol")
const TestToken = artifacts.require("./TestToken.sol")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const debug = 1
    const joysoWallet = accounts[4]
    const ONE = web3.toWei(1, 'ether')
    const GASFEE = web3.toWei(0.001, 'ether')
    const ETHER = "0x0000000000000000000000000000000000000000"
    const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

    const genInputData = function (data, v, tokenID, userID) {
        Log("================= entering genInputData ==================\n")
        Log("data: " + data)
        Log("v: " + v)
        Log("tokenID: " + tokenID)
        Log("userID: " + userID)
        var temp = data.substring(0, 26)
        Log("temp:: " + temp)
        if (v == 27) {
            temp += '0'
        } else {
            temp += '1'
        }
        temp += _.padStart('0', 27, '0')
        temp += _.padStart(tokenID.toString(16), 4, '0')
        temp += _.padStart(userID.toString(16), 8, '0')
        Log("dataV: " + temp)
        Log("================== leaving genInputData ===================\n")
        return temp
    }

    const generateWithdraw = async function (amount, gasFee, paymentMethod, tokenAddress, userAddress, joysoAddress) {
        var array = []
        var joyso = await Joyso.at(joysoAddress)

        // user1 sign the withdraw msg
        /*
            -----------------------------------
            user withdraw singature (uint256)
            (this.address, amount, gasFee, data)
            -----------------------------------
            data [0 .. 7] (uint256) nonce --> does not used when withdraw
            data [23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            data [24..63] (address) tokenAddress
        */
        var data = "0x01234567"
        data += _.padStart('0', 15, '0')
        if (paymentMethod == 1) {
            data += '1'
        } else {
            data += '0'
        }

        var temp = String(tokenAddress).substring(2, 44)
        data += _.padStart(temp, 40, '0')
        var msg = await joyso.getWithdrawDataHash.call(amount, gasFee, data)
        var sig = web3.eth.sign(userAddress, msg).slice(2)
        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.toDecimal(sig.slice(128, 130)) + 27
        
        // withdraw input
        /*
            inputs[0] (uint256) amount;
            inputs[1] (uint256) gasFee;
            inputs[2] (uint256) dataV
            inputs[3] (bytes32) r
            inputs[4] (bytes32) s
            -----------------------------------
            dataV[0 .. 7] (uint256) nonce --> doesnt used when withdraw
            dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            dataV[24..24] (uint256) v --> 0:27, 1:28 should be uint8 when used
            dataV[52..55] (uint256) tokenId
            dataV[56..63] (uint256) userId        
        */

        var tokenId = await joyso.address2Id.call(tokenAddress)
        var userId = await joyso.address2Id.call(userAddress)

        var temp2 = data.substring(0, 26)
        if (v == 27) {
            temp2 += '0'
        } else {
            temp2 += '1'
        }
        temp2 += _.padStart('0', 27, '0')
        temp2 += _.padStart(tokenId.toString(16), 4, '0')
        temp2 += _.padStart(userId.toString(16), 8, '0')
        var dataV = temp2

        array[0] = amount
        array[1] = gasFee
        array[2] = dataV
        array[3] = r
        array[4] = s
        return array
    }

    const Log = function (log) {
        if (debug == 1) {
            console.log(log)
        } else {
            return true
        }
    }

    const displayTheBalance = async function (joysoAddress, tokenAddress, joyAddress) {
        var joyso = await Joyso.at(joysoAddress)
        var token = await TestToken.at(tokenAddress)
        var joy = await joyso.joyToken.call();
        console.log("joy token address: " + joy)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        var user1_joy_balance = await joyso.getBalance.call(joy, user1)
        var user2_joy_balance = await joyso.getBalance.call(joy, user2)
        var user3_joy_balance = await joyso.getBalance.call(joy, user3)
        var joyso_joy_balacne = await joyso.getBalance.call(joy, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user3_ether_balance: " + user3_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("user3_token_balance: " + user3_token_balance)
        Log("user1_joy_balance: " + user1_joy_balance)
        Log("user2_joy_balance: " + user2_joy_balance)
        Log("user3_joy_balance: " + user3_joy_balance)
        Log("joyso wallet ether balance: " + joyso_ether_balance) 
        Log("joyso_joy_balance: " + joyso_joy_balacne)     
    }
    
    const setupEnvironment = async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, ONE, {from:admin})
        await token.transfer(user2, ONE, {from:admin})
        await token.transfer(user3, ONE, {from:admin})
        await joy.transfer(user1, ONE, {from: admin})
        await joy.transfer(user2, ONE, {from: admin})
        await joy.transfer(user3, ONE, {from: admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await token.approve(joyso.address, ONE, {from: user2})
        await token.approve(joyso.address, ONE, {from: user3})
        await joy.approve(joyso.address, ONE, {from: user1})
        await joy.approve(joyso.address, ONE, {from: user2})
        await joy.approve(joyso.address, ONE, {from: user3})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.depositEther({from: user3, value: ONE})
        await joyso.depositToken(token.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user2})
        await joyso.depositToken(token.address, ONE, {from: user3})
        await joyso.depositToken(joy.address, ONE, {from: user1})
        await joyso.depositToken(joy.address, ONE, {from: user2})
        await joyso.depositToken(joy.address, ONE, {from: user3})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        array[2] = joy.address
        return array
    }

    const ether = function (amount) {
        return web3.toWei(amount, 'ether')
    }

    it("mock.js withdraw ether directly by user", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_ether_account_balance = await web3.eth.getBalance(user1)
        await joyso.withdraw(ETHER, ether(0.5), {from: user1})
        var user1_ether_balance_after = await joyso.getBalance.call(ETHER, user1)
        var user1_ether_account_balance_after = await web3.eth.getBalance(user1)
        assert.equal(user1_ether_balance - user1_ether_balance_after, ether(0.5))
        assert.isBelow(user1_ether_account_balance_after - user1_ether_account_balance, ether(0.5))
        assert.isAbove(user1_ether_account_balance_after - user1_ether_account_balance, ether(0.45))
    })

    it("mock.js withdraw token directly by user", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        var user1_ether_account_balance = await web3.eth.getBalance(user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user1_token_account_balance = await token.balanceOf.call(user1)
        await joyso.withdraw(token.address, ether(0.5), {from: user1})
        var user1_ether_account_balance_after = await web3.eth.getBalance(user1)
        var user1_token_balance_after = await joyso.getBalance.call(token.address, user1)
        var user1_token_account_balance_after = await token.balanceOf.call(user1)
        assert.equal(user1_token_balance - user1_token_balance_after, ether(0.5))
        assert.equal(user1_token_account_balance_after - user1_token_account_balance, ether(0.5))
        assert.isBelow(user1_ether_account_balance_after, user1_ether_account_balance)
        assert.isBelow(user1_ether_account_balance - user1_ether_account_balance_after, ether(0.1))
    })

    it("mock.js unlockMe 會使 withdraw 失效", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod/2 + 1)
        await joyso.unlockMe({from: user1})
        await joyso.setBlock(current_block + lockPeriod + 1)
        try {
            await joyso.withdraw(token.address, ether(0.5), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("mock.js withdraw ether should fail if no balance", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        try {
            await joyso.withdraw(ETHER, ether(2), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })
 
    it("mock.js withdraw token should fail if no balance", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        try {
            await joyso.withdraw(token.address, ether(2), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("mock.js withdraw directly should fail", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        try {
            await joyso.withdraw(ETHER, ether(0.5), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }        
    })
})