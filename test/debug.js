'use strict'

const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('debug.js', function (accounts) {

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

    it("case1, details in google doc", async function () {
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

        await joyso.matchTokenOrderByAdmin(inputs, {from: admin, gas: 4700000})
        var user1_ether_balance2 = await joyso.getBalance(ETHER, user1)
        var user2_ether_balance2 = await joyso.getBalance(ETHER, user2)
        var user1_token_balance2 = await joyso.getBalance(token.address, user1)
        var user2_token_balance2 = await joyso.getBalance(token.address, user2)
        var joyso_ether_balance2 = await joyso.getBalance(ETHER, joysoWallet)

        assert.equal(user1_ether_balance - user1_ether_balance2, helper.ether(0.5 + 0.01 + 0.001), "user1_ether")
        assert.equal(user2_ether_balance2 - user2_ether_balance, helper.ether(0.5 - 0.01 - 0.0005), "user2_ether")
        assert.equal(user1_token_balance2 - user1_token_balance, helper.ether(0.5), "user1_token")
        assert.equal(user2_token_balance - user2_token_balance2, helper.ether(0.5), "user2_token")
        assert.equal(joyso_ether_balance2 - joyso_ether_balance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005), "joyso_ether")
    })
})
