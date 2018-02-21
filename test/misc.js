'use strict'

//const Joyso = artifacts.require("./Joyso.sol");
//const assertRevert = require("../test/helper/assertRevert")
const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const debug = 0
    const joysoWallet = accounts[4]
    const ONE = web3.toWei(1, 'ether')
    const GASFEE = web3.toWei(0.001, 'ether')
    const ETHER = "0x0000000000000000000000000000000000000000"
    const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

    const genOrderInputDataWithoutV = function (nonce, takerFee, makerFee, joyPrice, tokenSellId, tokenBuyId, userId) {
        Log("================= entering genOrderInputDataWithoutV ==================\n")
        Log("nonce: " + nonce)
        Log("takerFee: " + takerFee)
        Log("makerFee: " + makerFee)
        Log("joyPrice: " + joyPrice)
        Log("tokenSellId: " + tokenSellId)
        Log("tokenBuyId: " + tokenBuyId)
        Log("userId: " + userId)
        var temp = '0x'
        temp += _.padStart(nonce.toString(16), 8, '0')
        temp += _.padStart(takerFee.toString(16), 4, '0')
        temp += _.padStart(makerFee.toString(16), 4, '0')
        temp += _.padStart(joyPrice.toString(16), 7, '0')
        temp += _.padStart('0', 25, '0')
        temp += _.padStart(tokenSellId.toString(16), 4, '0')
        temp += _.padStart(tokenBuyId.toString(16), 4, '0')
        temp += _.padStart(userId.toString(16), 8, '0')
        Log("result: " + temp)
        Log("================== leaving genInputData ===================\n")
        return temp
    }

    const genOrderDataInUserSigned = function (data, isBuy, tokenAddress) {
        Log("generating the data in the user should signed")
        Log("input data: " + data)
        Log("isBuy: " + isBuy)
        Log("tokenAddress: " + tokenAddress)
        var temp = data.substring(0, 25)
        if (isBuy == ORDER_ISBUY) {
            temp += '1'
        } else {
            temp += '0'
        }
        temp += tokenAddress.substring(2, 42)
        Log("result: " + temp)
        return temp
    }

    const genOrderInputData = function (dataWithoutV, v) {
        Log("================= entering genOrderInputData ==================\n")
        Log("dataWithoutV: " + dataWithoutV)
        Log("v: " + v)
        if (v == 27) {
            var temp = dataWithoutV
        } else {
            var temp = dataWithoutV.substring(0, 26)
            temp += '1'
            temp += dataWithoutV.substring(27, 66)
        }

        Log("result: " + temp)
        Log("================== leaving genInputData ===================\n")
        return temp        
    }

    const Log = function (log) {
        if (debug == 1) {
            console.log(log)
        } else {
            return true
        }
    }

    const generateOrder = async function (amountSell, amountBuy, gasFee, nonce, takerFee, makerFee, 
    joyPrice, isBuy, tokenSell, tokenBuy, user, joysoAddress) {
        var array = []
        var joyso = await Joyso.at(joysoAddress)
        var tokenSellId = await joyso.address2Id.call(tokenSell)
        var tokenBuyId = await joyso.address2Id.call(tokenBuy)
        var token = tokenSell
        if(isBuy == ORDER_ISBUY) {
            token = tokenBuy
        }
        var userId = await joyso.address2Id.call(user)
        var inputDataWithoutV = genOrderInputDataWithoutV(nonce, takerFee, makerFee, joyPrice, 
            tokenSellId, tokenBuyId, userId)
        //var letUserSignData = await joyso.genUserSignedOrderData.call(inputDataWithoutV, isBuy, token)
        var letUserSignData = genOrderDataInUserSigned(inputDataWithoutV, isBuy, token) 
        var userShouldSignIt = await joyso.getOrderDataHash.call(amountSell, amountBuy, gasFee, letUserSignData)
        var sig = web3.eth.sign(user, userShouldSignIt).slice(2)
        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.toDecimal(sig.slice(128, 130)) + 27
        var inputData = genOrderInputData(inputDataWithoutV, v)
        array[0] = amountSell
        array[1] = amountBuy
        array[2] = gasFee
        array[3] = inputData
        array[4] = r
        array[5] = s
        return array
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

    it("misc.js 非Admin搓合 應失敗 ", async function () {
        Log("*************************** Start case4 *******************************")
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        try {
            await joyso.matchByAdmin(inputs, {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("misc.js token未註冊 deposit應失敗 ", async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await token.transfer(user1, ONE, {from:admin})
        await token.approve(joyso.address, ONE, {from: user1})

        try {
            await joyso.depositToken(token.address, ONE, {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("misc.js token未approve, transferFrom會失敗 deposit應失敗 ", async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await token.transfer(user1, ONE, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})

        try {
            await joyso.depositToken(token.address, ONE, {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("misc.js registerToken index 需要大於 1 ", async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await token.transfer(user1, ONE, {from:admin})

        try {
            await joyso.registerToken(token.address, 0x00, {from: admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("misc.js registerToken 同一token不能註冊兩次 ", async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await token.transfer(user1, ONE, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})

        try {
            await joyso.registerToken(token.address, 0x56, {from: admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("misc.js 新增 Admin 可用於搓合 ", async function () {
        Log("*************************** Start case4 *******************************")
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        await joyso.addToAdmin(user1, true, {from:admin})
        await joyso.matchByAdmin(inputs, {from: user1})
    })

    it("misc.js case1, taker/maker對調應成功 ", async function () {
        Log("*************************** Start case4 *******************************")
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)

        var order2 = await generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        Array.prototype.push.apply(inputs, order1)
        await joyso.matchByAdmin(inputs, {from: admin})
    })    

    
})