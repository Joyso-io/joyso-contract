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
        Log("joy token address: " + joy)
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

    const setupEnvironment2 = async function () {
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
        await joyso.depositEther({from: user2, value: 100000000000000000})
        await joyso.depositToken(token.address, 200000000, {from: user1})
        await joyso.depositToken(joy.address, 1000000000, {from: user1})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        array[2] = joy.address
        return array
    }
    
    const ether = function (amount) {
        return Number(web3.toWei(amount, 'ether'))
    }

    it("match.js 搓合, case1, 詳見 google doc", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await generateOrder(ether(0.5),ether(0.5), ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance = await joyso.getBalance(ETHER, user2)
        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user2_token_balance = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)

        await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})

        var user1_ether_balance2 = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance2 = await joyso.getBalance(ETHER, user2)
        var user1_token_balance2 = await joyso.getBalance(token.address, user1)
        var user2_token_balance2 = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance2 = await joyso.getBalance(ETHER, joysoWallet)

        assert.equal(user1_ether_balance - user1_ether_balance2, ether(0.5 + 0.01 + 0.001))
        assert.equal(user2_ether_balance2 - user2_ether_balance, ether(0.5 - 0.01 - 0.0005))
        assert.equal(user1_token_balance2 - user1_token_balance, ether(0.5))
        assert.equal(user2_token_balance - user2_token_balance2, ether(0.5))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, ether(0.01 + 0.01 + 0.001 + 0.0005))
    })

    it("match.js 搓合, case2, 詳見 google doc", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        var order3 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 3, 20, 10, 0, 0, token.address, ETHER, user3, joyso.address)
        Array.prototype.push.apply(inputs, order3)


        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        
        await joyso.matchByAdmin(inputs, {from: admin})

        var user1_ether_balance2 = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance2 = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance2 = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance2 = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance2 = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance2 = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance2 = await joyso.getBalance.call(ETHER, joysoWallet)

        assert.equal(user1_ether_balance - user1_ether_balance2, ether(0.5 + 0.01 + 0.001))
        assert.equal(user1_token_balance2 - user1_ether_balance, ether(0.5))
        assert.equal(user2_ether_balance2 - user2_ether_balance, ether(0.25 - 0.01 - 0.00025))
        assert.equal(user2_token_balance - user2_token_balance2, ether(0.25))
        assert.equal(user3_ether_balance2 - user3_ether_balance, ether(0.25 - 0.01 - 0.00025))
        assert.equal(user3_token_balance - user3_token_balance2, ether(0.25))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, ether(0.01 + 0.001 + 0.01 + 0.00025 + 0.01 + 0.00025))
    })

    it("match.js 搓合, case3, 詳見 google doc", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.000112), ether(0.000000000007), ether(0.000001), 0x5a41e89b, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(ether(0.000000000001), ether(0.00001), ether(0.000001), 0x5a41e7ba, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        var order3 = await generateOrder(ether(0.000000000005), ether(0.000075), ether(0.000001), 0x5a41e7e0, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order3)

        await joyso.matchByAdmin(inputs, {from: admin})

        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        assert.equal(user1_ether_balance, web3.toWei(0.99991383, 'ether'), "user1_ether_balance")
        assert.equal(user1_token_balance, web3.toWei(1.000000000006, 'ether'), "user1 token balance")
        assert.equal(user2_ether_balance, web3.toWei(1.000082915, 'ether'), "user2 ether balance")
        assert.equal(user2_token_balance, web3.toWei(0.999999999994, 'ether'), "user2 token balance")
        assert.equal(joysoWallet_balance, web3.toWei(0.000003255, 'ether'), "joysoWallet ether balance")
    })

    it("match.js 搓合, case4", async function () {
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

        await joyso.matchByAdmin(inputs, {from: admin})

        try {
            await joyso.matchByAdmin(inputs, {from: admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("match.js 搓合, case5", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(20000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(10000000, 20000000000000000, 15000000, 11, 10,  5, 0x3e801, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        await joyso.matchByAdmin(inputs, {from: admin})

        try {
            await joyso.matchByAdmin(inputs, {from: admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("match.js 搓合, case6 帳戶初始餘額全交易", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment2()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(10000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user2, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(10000000, 10000000000000000, 15000000, 11, 10,  5, 0x3e80, 0, token.address, ETHER, user1, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        await joyso.matchByAdmin(inputs, {from: admin})

        try {
            await joyso.matchByAdmin(inputs, {from: admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("match.js 搓合, taker 以 Joy 付 fee", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01),
                                    0x0000001, 20, 10, 1000, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await generateOrder(ether(0.5),ether(0.5), ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance = await joyso.getBalance(ETHER, user2)
        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user2_token_balance = await joyso.getBalance(token.address, user2)
        var user1_joy_balance = await joyso.getBalance(joy.address, user1)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)
        var joyso_joy_balance = await joyso.getBalance(joy.address, joysoWallet)

        await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})

        var user1_ether_balance2 = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance2 = await joyso.getBalance(ETHER, user2)
        var user1_token_balance2 = await joyso.getBalance(token.address, user1)
        var user2_token_balance2 = await joyso.getBalance(token.address, user2)
        var user1_joy_balance2 = await joyso.getBalance(joy.address, user1)
        var joyso_ether_balance2 = await joyso.getBalance(ETHER, joysoWallet)
        var joyso_joy_balance2 = await joyso.getBalance(joy.address, joysoWallet)

        assert.equal(user1_ether_balance - user1_ether_balance2, ether(0.5))
        assert.equal(user2_ether_balance2 - user2_ether_balance, ether(0.5 - 0.01 - 0.0005))
        assert.equal(user1_token_balance2 - user1_token_balance, ether(0.5))
        assert.equal(user2_token_balance - user2_token_balance2, ether(0.5))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, ether(0.01 + 0.0005))
        assert.equal(user1_joy_balance - user1_joy_balance2, ether(0.001) / 10**5 / 1000 + ether(0.01))
        assert.equal(joyso_joy_balance2 - joyso_joy_balance, ether(0.001) / 10**5 / 1000 + ether(0.01))
    })

    it("match.js 搓合, gasFee 只收一次", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(ether(0.5), ether(0.5), ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var joyso_ether_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        
        await joyso.matchByAdmin(inputs, {from: admin})

        var user1_ether_balance2 = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance2 = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance2 = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance2 = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance2 = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance2 = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance2 = await joyso.getBalance.call(ETHER, joysoWallet)

        assert.equal(user1_ether_balance - user1_ether_balance2, ether(0.25 + 0.01 + 0.0005))
        assert.equal(user1_token_balance2 - user1_ether_balance, ether(0.25))
        assert.equal(user2_ether_balance2 - user2_ether_balance, ether(0.25 - 0.01 - 0.00025))
        assert.equal(user2_token_balance - user2_token_balance2, ether(0.25))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, ether(0.01 + 0.0005 + 0.01 + 0.00025))

        inputs = []
        var order3 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user3, joyso.address)
        Array.prototype.push.apply(inputs, order3)
        Array.prototype.push.apply(inputs, order2)

        await joyso.matchByAdmin(inputs, {from: admin})

        var user2_ether_balance3 = await joyso.getBalance(ETHER, user2)
        var user2_token_balance3 = await joyso.getBalance(token.address, user2)
        var user3_ether_balance3 = await joyso.getBalance(ETHER, user3)
        var user3_token_balance3 = await joyso.getBalance(token.address, user3)
        var joyso_ether_balance3 = await joyso.getBalance(ETHER, joysoWallet)
        
        assert.equal(user2_ether_balance3 - user2_ether_balance2, ether(0.25 - 0.00025))
        assert.equal(user2_token_balance2 - user2_token_balance3, ether(0.25))
        assert.equal(user3_ether_balance2 - user3_ether_balance3, ether(0.25 + 0.01 + 0.0005))
        assert.equal(user3_token_balance3 - user3_token_balance2, ether(0.25))
        assert.equal(joyso_ether_balance3 - joyso_ether_balance2, ether(0.00025 + 0.01 + 0.0005))
    })

    it("match.js 搓合, gasFee (Joy) 只收一次", async function () {
        var joyso, token, joy
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(ether(0.5), ether(0.5), ether(0.01), 2, 20, 10, 1000, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user2_joy_balance = await joyso.getBalance.call(joy.address, user2)
        var joyso_ether_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        var joyso_joy_balance = await joyso.getBalance.call(joy.address, joysoWallet)
        
        await joyso.matchByAdmin(inputs, {from: admin})

        var user1_ether_balance2 = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance2 = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance2 = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance2 = await joyso.getBalance.call(token.address, user2)
        var user2_joy_balance2 = await joyso.getBalance.call(joy.address, user2)
        var user3_ether_balance2 = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance2 = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance2 = await joyso.getBalance.call(ETHER, joysoWallet)
        var joyso_joy_balance2 = await joyso.getBalance.call(joy.address, joysoWallet)

        assert.equal(user1_ether_balance - user1_ether_balance2, ether(0.25 + 0.01 + 0.0005))
        assert.equal(user1_token_balance2 - user1_ether_balance, ether(0.25))
        assert.equal(user2_ether_balance2 - user2_ether_balance, ether(0.25))
        assert.equal(user2_token_balance - user2_token_balance2, ether(0.25))
        assert.equal(user2_joy_balance.minus(user2_joy_balance2), ether(0.01) + ether(0.00025)/ 10**5 / 1000)
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, ether(0.01 + 0.0005))
        assert.equal(joyso_joy_balance2.minus(joyso_joy_balance), ether(0.01) + ether(0.00025)/ 10**5/ 1000)

        inputs = []
        var order3 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user3, joyso.address)
        Array.prototype.push.apply(inputs, order3)
        Array.prototype.push.apply(inputs, order2)

        await joyso.matchByAdmin(inputs, {from: admin})

        var user2_ether_balance3 = await joyso.getBalance(ETHER, user2)
        var user2_token_balance3 = await joyso.getBalance(token.address, user2)
        var user2_joy_balance3 = await joyso.getBalance(joy.address, user2)
        var user3_ether_balance3 = await joyso.getBalance(ETHER, user3)
        var user3_token_balance3 = await joyso.getBalance(token.address, user3)
        var joyso_ether_balance3 = await joyso.getBalance(ETHER, joysoWallet)
        var joyso_joy_balance3 = await joyso.getBalance(joy.address, joysoWallet)
        
        assert.equal(user2_ether_balance3 - user2_ether_balance2, ether(0.25))
        assert.equal(user2_token_balance2 - user2_token_balance3, ether(0.25))
        assert.equal(user2_joy_balance2.minus(user2_joy_balance3), ether(0.00025)/10**5/1000)
        assert.equal(user3_ether_balance2 - user3_ether_balance3, ether(0.25 + 0.01 + 0.0005))
        assert.equal(user3_token_balance3 - user3_token_balance2, ether(0.25))
        assert.equal(joyso_ether_balance3 - joyso_ether_balance2, ether(0.01 + 0.0005))
        assert.equal(joyso_joy_balance3.minus(joyso_joy_balance2), ether(0.00025)/10**5/1000)
    })

    it("match.js 搓合, case1, taker 簽章錯誤應失敗", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        inputs[5] = 1234 //s

        var order2 = await generateOrder(ether(0.5),ether(0.5), ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        try {
            await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("match.js 搓合, case1, maker 簽章錯誤應失敗", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await generateOrder(ether(0.5),ether(0.5), ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        inputs[11] = 1234 //s

        try {
            await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("match.js 搓合, 價錢劣於雙方預期應失敗", async function () {
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await generateOrder(ether(0.1),ether(0.5), ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        try {
            await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })
})