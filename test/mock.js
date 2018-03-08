'use strict'

const Joyso = artifacts.require("./JoysoMock.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso mock', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const debug = 1
    const joysoWallet = accounts[4]
    const ETHER = "0x0000000000000000000000000000000000000000"
    const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

    it("withdraw ether directly by user", async function () {
        var joyso, token, joy
        var temp = await helper.setupMockEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_ether_account_balance = await web3.eth.getBalance(user1)
        await joyso.withdraw(ETHER, helper.ether(0.5), {from: user1})
        var user1_ether_balance_after = await joyso.getBalance.call(ETHER, user1)
        var user1_ether_account_balance_after = await web3.eth.getBalance(user1)
        assert.equal(user1_ether_balance - user1_ether_balance_after, helper.ether(0.5))
        assert.isBelow(user1_ether_account_balance_after - user1_ether_account_balance, helper.ether(0.5))
        assert.isAbove(user1_ether_account_balance_after - user1_ether_account_balance, helper.ether(0.45))
    })

    it("withdraw token directly by user", async function () {
        var joyso, token, joy
        var temp = await helper.setupMockEnvironment()
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
        await joyso.withdraw(token.address, helper.ether(0.5), {from: user1})
        var user1_ether_account_balance_after = await web3.eth.getBalance(user1)
        var user1_token_balance_after = await joyso.getBalance.call(token.address, user1)
        var user1_token_account_balance_after = await token.balanceOf.call(user1)
        assert.equal(user1_token_balance - user1_token_balance_after, helper.ether(0.5))
        assert.equal(user1_token_account_balance_after - user1_token_account_balance, helper.ether(0.5))
        assert.isBelow(user1_ether_account_balance_after, user1_ether_account_balance)
        assert.isBelow(user1_ether_account_balance - user1_ether_account_balance_after, helper.ether(0.1))
    })

    it("unlockMe should reset the user lock", async function () {
        var joyso, token, joy
        var temp = await helper.setupMockEnvironment()
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
            await joyso.withdraw(token.address, helper.ether(0.5), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("withdraw ether should fail if no balance", async function () {
        var joyso, token, joy
        var temp = await helper.setupMockEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        try {
            await joyso.withdraw(ETHER, helper.ether(2), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })
 
    it("withdraw token should fail if no balance", async function () {
        var joyso, token, joy
        var temp = await helper.setupMockEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        await joyso.lockMe({from: user1})
        var current_block = await joyso.getBlock.call()
        var lockPeriod = await joyso.lockPeriod.call()
        await joyso.setBlock(current_block + lockPeriod + 1)
        try {
            await joyso.withdraw(token.address, helper.ether(2), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("withdraw directly should fail", async function () {
        var joyso, token, joy
        var temp = await helper.setupMockEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        try {
            await joyso.withdraw(ETHER, helper.ether(0.5), {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }        
    })
})