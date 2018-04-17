'use strict'

//const Joyso = artifacts.require("./Joyso.sol");
//const assertRevert = require("../test/helper/assertRevert")
const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('tokenMatch.js', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const joysoWallet = accounts[4]
    const ETHER = "0x0000000000000000000000000000000000000000"
    const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

    it("try token base match", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateTokenOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance = await joyso.getBalance(ETHER, user2)
        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user2_token_balance = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)

        await joyso.matchTokenOrderByAdmin(inputs, {from: admin})
        var user1_ether_balance2 = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance2 = await joyso.getBalance(ETHER, user2)
        var user1_token_balance2 = await joyso.getBalance(token.address, user1)
        var user2_token_balance2 = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance2 = await joyso.getBalance(ETHER, joysoWallet)

        //await helper.displayTheBalance(joyso.address, token.address, 0)
        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.5 + 0.01 + 0.001), "user1_ether")
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.5 - 0.01 - 0.0005), "user2_ether")
        assert.equal(user1_token_balance2 - user1_token_balance, helper.ether(0.5), "user1_token")
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.5), "user2_token")
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005), "joyso_ether")
    })

    it("token by token match", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, joy.address, token.address, user1, joyso.address)
        var order2 = await helper.generateTokenOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, joy.address, user2, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        Array.prototype.push.apply(inputs, order2)

        var user1_joy_balance = await joyso.getBalance(joy.address, user1)
        var user2_joy_balance = await joyso.getBalance(joy.address, user2)
        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user2_token_balance = await joyso.getBalance(token.address, user2)
        var joyso_joy_balance = await joyso.getBalance(joy.address, joysoWallet)

        await joyso.matchTokenOrderByAdmin(inputs, {from: admin})
        var user1_joy_balance2 = await joyso.getBalance(joy.address, user1)
        var user2_joy_balance2 = await joyso.getBalance(joy.address, user2)
        var user1_token_balance2 = await joyso.getBalance(token.address, user1)
        var user2_token_balance2 = await joyso.getBalance(token.address, user2)
        var joyso_joy_balance2 = await joyso.getBalance(joy.address, joysoWallet)

        assert.equal(user1_joy_balance - user1_joy_balance2, helper.ether(0.5 + 0.01 + 0.001), "user1_base")
        assert.equal(user2_joy_balance2 - user2_joy_balance, helper.ether(0.5 - 0.01 - 0.0005), "user2_base")
        assert.equal(user1_token_balance2 - user1_token_balance, helper.ether(0.5), "user1_token")
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.5), "user2_token")
        assert.equal(joyso_joy_balance2 - joyso_joy_balance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005), "joyso_base")
    })

    it("try token base match, taker is a sell order", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)

        var order2 = await helper.generateTokenOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        Array.prototype.push.apply(inputs, order1)

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance = await joyso.getBalance(ETHER, user2)
        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user2_token_balance = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)

        await joyso.matchTokenOrderByAdmin(inputs, {from: admin})
        var user1_ether_balance2 = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance2 = await joyso.getBalance(ETHER, user2)
        var user1_token_balance2 = await joyso.getBalance(token.address, user1)
        var user2_token_balance2 = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance2 = await joyso.getBalance(ETHER, joysoWallet)

        //await helper.displayTheBalance(joyso.address, token.address, 0)
        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.5 + 0.01 + 0.0005), "user1_ether")
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.5 - 0.01 - 0.001), "user2_ether")
        assert.equal(user1_token_balance2 - user1_token_balance, helper.ether(0.5), "user1_token")
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.5), "user2_token")
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005), "joyso_ether")
    })

    it("it should fail if taker's signature is wrong.", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        inputs[5] = 1234 //s

        var order2 = await helper.generateTokenOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        try {
            await joyso.matchTokenOrderByAdmin(inputs, {from: admin, gas: 4700000})
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
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateTokenOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        inputs[11] = 1234 //s

        try {
            await joyso.matchTokenOrderByAdmin(inputs, {from: admin, gas: 4700000})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("a filled taker order should not be trade again", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateTokenOrder(helper.ether(0.5),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        await joyso.matchTokenOrderByAdmin(inputs, {from: admin})

        try {
            await joyso.matchTokenOrderByAdmin(inputs, {from: admin, gas: 4700000})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("a filled maker order should not be trade again", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateTokenOrder(helper.ether(0.7),helper.ether(0.7), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        await joyso.matchTokenOrderByAdmin(inputs, {from: admin})

        var order3 = await helper.generateTokenOrder(helper.ether(0.1), helper.ether(0.1), helper.ether(0.01),
        0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        inputs = []
        Array.prototype.push.apply(inputs, order3)
        Array.prototype.push.apply(inputs, order2)

        try {
            await joyso.matchTokenOrderByAdmin(inputs)
            assert.fail('Expected revert not received');
        } catch (error) {
        }
    })

    it("it should fail if the price taker's price is worse than maker's", async function () {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                    0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await helper.generateTokenOrder(helper.ether(0.1),helper.ether(0.5), helper.ether(0.01),
                                    0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        try {
            await joyso.matchTokenOrderByAdmin(inputs, {from: admin, gas: 4700000})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })
})