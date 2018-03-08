'use strict'

//const Joyso = artifacts.require("./Joyso.sol");
//const assertRevert = require("../test/helper/assertRevert")
const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso misc.js', function (accounts) {

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

    it("it should fail if not admin send the match", async function () {
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

        try {
            await joyso.matchByAdmin(inputs, {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    })

    it("deposit should fail, if the deposit token is not registered ", async function () {
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

    it("it should fail if the token is not approved to the joyso contract", async function () {
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

    it("registerToken's index should more than 1", async function () {
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

    it("the same token can not registered twice ", async function () {
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

    it("add new admin", async function () {
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
        await joyso.addToAdmin(user1, true, {from:admin})
        await joyso.matchByAdmin(inputs, {from: user1})
    })

    it("for case1, maker and taker order exchage the place should still success", async function () {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var inputs = []
        var order1 = await helper.generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)

        var order2 = await helper.generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        Array.prototype.push.apply(inputs, order1)
        await joyso.matchByAdmin(inputs, {from: admin})
    })    

    
})