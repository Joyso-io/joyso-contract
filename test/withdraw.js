'use strict'

const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('joyso withdraw', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const joysoWallet = accounts[4]
    const ETHER = "0x0000000000000000000000000000000000000000"
    const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

    it("withdraw token, pay by ether", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)
        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user1_account_token_balance = await token.balanceOf(user1)

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, token.address, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_ether_balance_after = await joyso.getBalance(ETHER, user1)
        var joyso_ether_balance_after = await joyso.getBalance(ETHER, joysoWallet)
        var user1_token_balance_after = await joyso.getBalance(token.address, user1)
        var user1_account_token_balance_after = await token.balanceOf(user1)

        assert.equal(user1_ether_balance - user1_ether_balance_after, helper.ether(0.02))
        assert.equal(user1_account_token_balance_after - user1_account_token_balance, helper.ether(0.5))
        assert.equal(user1_token_balance - user1_token_balance_after, helper.ether(0.5))
        assert.equal(joyso_ether_balance_after - joyso_ether_balance, helper.ether(0.02))
    })

    it("withdraw joy, pay by ether", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)
        var user1_token_balance = await joyso.getBalance(joy.address, user1)
        var user1_account_token_balance = await joy.balanceOf(user1)

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, joy.address, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_ether_balance_after = await joyso.getBalance(ETHER, user1)
        var joyso_ether_balance_after = await joyso.getBalance(ETHER, joysoWallet)
        var user1_token_balance_after = await joyso.getBalance(joy.address, user1)
        var user1_account_token_balance_after = await joy.balanceOf(user1)

        assert.equal(user1_ether_balance - user1_ether_balance_after, helper.ether(0.02))
        assert.equal(user1_account_token_balance_after - user1_account_token_balance, helper.ether(0.5))
        assert.equal(user1_token_balance - user1_token_balance_after, helper.ether(0.5))
        assert.equal(joyso_ether_balance_after - joyso_ether_balance, helper.ether(0.02))
    })

    it("withdraw ether, pay by ether", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var joyso_ether_balance = await joyso.getBalance(ETHER, joysoWallet)
        var user1_account_ether_balance = await web3.eth.getBalance(user1)

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, ETHER, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_ether_balance_after = await joyso.getBalance(ETHER, user1)
        var joyso_ether_balance_after = await joyso.getBalance(ETHER, joysoWallet)
        var user1_account_ether_balance_after = await web3.eth.getBalance(user1)

        assert.equal(user1_ether_balance - user1_ether_balance_after, helper.ether(0.52))
        assert.equal(user1_account_ether_balance_after - user1_account_ether_balance, helper.ether(0.5))
        assert.equal(joyso_ether_balance_after - joyso_ether_balance, helper.ether(0.02))
    })

    it("withdraw token, pay by JOY", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user1_joy_balance = await joyso.getBalance(joy.address, user1)
        var joyso_joy_balance = await joyso.getBalance(joy.address, joysoWallet)
        var user1_account_token_balance = await token.balanceOf(user1)

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 1, token.address, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_token_balance_after = await joyso.getBalance(token.address, user1)
        var user1_joy_balance_after = await joyso.getBalance(joy.address, user1)
        var joyso_joy_balance_after = await joyso.getBalance(joy.address, joysoWallet)
        var user1_account_token_balance_after = await token.balanceOf(user1)

        assert.equal(user1_token_balance - user1_token_balance_after, helper.ether(0.5))
        assert.equal(user1_joy_balance - user1_joy_balance_after, helper.ether(0.02))
        assert.equal(user1_account_token_balance_after - user1_account_token_balance, helper.ether(0.5))
        assert.equal(joyso_joy_balance_after - joyso_joy_balance, helper.ether(0.02))
    })

    it("withdraw joy, pay by JOY", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var inputs = await helper.generateWithdraw(430743357366569795, 2000000000000000, 1, joy.address, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_joy_balance = await joyso.getBalance(joy.address, user1)
    })

    it("withdraw ether, pay by JOY", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var user1_account_ether_balance_original = await web3.eth.getBalance(user1)
        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), 2000000000000000, 1, ETHER, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_ether_balance = await joyso.getBalance(ETHER, user1)
        var user1_account_ether_balance = await web3.eth.getBalance(user1)
        assert.equal(user1_account_ether_balance - user1_account_ether_balance_original, helper.ether(0.5), "account ether balance should be equal")
        assert.equal(user1_ether_balance, helper.ether(0.5), "contract ether balance should be equal")
    })

    it("withdraw token, pay by token", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var user1_token_balance = await joyso.getBalance(token.address, user1)
        var user1_account_token_balance = await token.balanceOf(user1)
        var joyso_token_balance = await joyso.getBalance(token.address, joysoWallet)

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 2, token.address, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        var user1_token_balance_after = await joyso.getBalance(token.address, user1)
        var user1_account_token_balance_after = await token.balanceOf(user1)
        var joyso_token_balance_after = await joyso.getBalance(token.address, joysoWallet)

        assert.equal(user1_token_balance - user1_token_balance_after, helper.ether(0.52))
        assert.equal(joyso_token_balance_after - joyso_token_balance, helper.ether(0.02))
        assert.equal(user1_account_token_balance_after - user1_account_token_balance, helper.ether(0.5))
    })

    it("it should fail if use the same withdraw hash", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var inputs = await helper.generateWithdraw(430743357366569795, 2000000000000000, 1, joy.address, user1, joyso.address)
        await joyso.withdrawByAdmin(inputs, {from:admin})

        try {
            await joyso.withdrawByAdmin(inputs, {from:admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("it should fail if the signature is wrong", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var inputs = await helper.generateWithdraw(430743357366569795, 2000000000000000, 1, joy.address, user1, joyso.address)
        inputs[4] = 12345 // s

        try {
            await joyso.withdrawByAdmin(inputs, {from:admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("withdraw token, pay by ether. Should fail if no token balance.", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(2), helper.ether(0.02), 0, token.address, user1, joyso.address)

        try {
            await joyso.withdrawByAdmin(inputs, {from:admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("withdraw token, pay by ether. Should fail if no ether balance.", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(2), 0, token.address, user1, joyso.address)

        try {
            await joyso.withdrawByAdmin(inputs, {from:admin})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })
})
