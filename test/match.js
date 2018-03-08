'use strict'

//const Joyso = artifacts.require("./Joyso.sol");
//const assertRevert = require("../test/helper/assertRevert")
const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso match', function (accounts) {

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

    it("case1, 詳見 google doc", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
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

        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.5 + 0.01 + 0.001))
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.5 - 0.01 - 0.0005))
        assert.equal(user1_token_balance2 - user1_token_balance, helper.ether(0.5))
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.5))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005))
    })

    it("case2, 詳見 google doc", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        var order3 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 3, 20, 10, 0, 0, token.address, ETHER, user3, joyso.address)
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

        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.5 + 0.01 + 0.001))
        assert.equal(user1_token_balance2 - user1_ether_balance, helper.ether(0.5))
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.25 - 0.01 - 0.00025))
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.25))
        assert.equal(user3_ether_balance2 - user3_ether_balance, helper.ether(0.25 - 0.01 - 0.00025))
        assert.equal(user3_token_balance - user3_token_balance2, helper.ether(0.25))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.001 + 0.01 + 0.00025 + 0.01 + 0.00025))
    })

    it("case3, 詳見 google doc", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.000112), helper.ether(0.000000000007), helper.ether(0.000001), 0x5a41e89b, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(helper.ether(0.000000000001), helper.ether(0.00001), helper.ether(0.000001), 0x5a41e7ba, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        var order3 = await helper.generateOrder(helper.ether(0.000000000005), helper.ether(0.000075), helper.ether(0.000001), 0x5a41e7e0, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
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

    it("case4", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
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

    it("case5", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateOrder(20000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(10000000, 20000000000000000, 15000000, 11, 10,  5, 0x3e801, 0, token.address, ETHER, user2, joyso.address)
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

    it("case6 trade all the user balance", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment2()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateOrder(10000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user2, joyso.address)
        var order1 = await  helper.generateOrder(10000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user2, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(10000000, 10000000000000000, 15000000, 11, 10,  5, 0x3e80, 0, token.address, ETHER, user1, joyso.address)
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

    it("taker paid Joy for fee", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 1000, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
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

        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.5))
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.5 - 0.01 - 0.0005))
        assert.equal(user1_token_balance2 - user1_token_balance, helper.ether(0.5))
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.5))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.0005))
        assert.equal(user1_joy_balance - user1_joy_balance2, helper.ether(0.001) / 10**5 / 1000 + helper.ether(0.01))
        assert.equal(joyso_joy_balance2 - joyso_joy_balance, helper.ether(0.001) / 10**5 / 1000 + helper.ether(0.01))
    })

    it("gasFee can only charge once for each order", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
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

        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.25 + 0.01 + 0.0005))
        assert.equal(user1_token_balance2 - user1_ether_balance, helper.ether(0.25))
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.25 - 0.01 - 0.00025))
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.25))
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.0005 + 0.01 + 0.00025))

        inputs = []
        var order3 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user3, joyso.address)
        Array.prototype.push.apply(inputs, order3)
        Array.prototype.push.apply(inputs, order2)

        await joyso.matchByAdmin(inputs, {from: admin})

        var user2_ether_balance3 = await joyso.getBalance(ETHER, user2)
        var user2_token_balance3 = await joyso.getBalance(token.address, user2)
        var user3_ether_balance3 = await joyso.getBalance(ETHER, user3)
        var user3_token_balance3 = await joyso.getBalance(token.address, user3)
        var joyso_ether_balance3 = await joyso.getBalance(ETHER, joysoWallet)
        
        assert.equal(user2_ether_balance3 - user2_ether_balance2, helper.ether(0.25 - 0.00025))
        assert.equal(user2_token_balance2 - user2_token_balance3, helper.ether(0.25))
        assert.equal(user3_ether_balance2 - user3_ether_balance3, helper.ether(0.25 + 0.01 + 0.0005))
        assert.equal(user3_token_balance3 - user3_token_balance2, helper.ether(0.25))
        assert.equal(joyso_ether_balance3 - joyso_ether_balance2, helper.ether(0.00025 + 0.01 + 0.0005))
    })

    it("gasFee (JOY) can only charge once for each order", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01), 2, 20, 10, 1000, 0, token.address, ETHER, user2, joyso.address)
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

        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.25 + 0.01 + 0.0005))
        assert.equal(user1_token_balance2 - user1_ether_balance, helper.ether(0.25))
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.25))
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.25))
        assert.equal(user2_joy_balance.minus(user2_joy_balance2), helper.ether(0.01) + helper.ether(0.00025)/ 10**5 / 1000)
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.0005))
        assert.equal(joyso_joy_balance2.minus(joyso_joy_balance), helper.ether(0.01) + helper.ether(0.00025)/ 10**5/ 1000)

        inputs = []
        var order3 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user3, joyso.address)
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
        
        assert.equal(user2_ether_balance3 - user2_ether_balance2, helper.ether(0.25))
        assert.equal(user2_token_balance2 - user2_token_balance3, helper.ether(0.25))
        assert.equal(user2_joy_balance2.minus(user2_joy_balance3), helper.ether(0.00025)/10**5/1000)
        assert.equal(user3_ether_balance2 - user3_ether_balance3, helper.ether(0.25 + 0.01 + 0.0005))
        assert.equal(user3_token_balance3 - user3_token_balance2, helper.ether(0.25))
        assert.equal(joyso_ether_balance3 - joyso_ether_balance2, helper.ether(0.01 + 0.0005))
        assert.equal(joyso_joy_balance3.minus(joyso_joy_balance2), helper.ether(0.00025)/10**5/1000)
    })

    it("it should fail if taker's signature is wrong.", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        inputs[5] = 1234 //s

        var order2 = await helper.generateOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
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

    it("it should fail if the maker's signature is wrong", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
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

    it("it should fail if the price taker's price is worse than maker's", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateOrder(helper.ether(0.1),helper.ether(0.5), helper.ether(0.01),
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