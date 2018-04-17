'use strict'

const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const TestMigrate = artifacts.require("./TestMigrate.sol")
const helper = require("./helper.js")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('test migrate.js', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const joysoWallet = accounts[4]
    const ETHER = "0x0000000000000000000000000000000000000000"

    it("test new version contract", async function () {
        var nc = await TestMigrate.new({from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from: admin})
        await token.transfer(user1, helper.ether(1), {from: admin})

        await token.approve(nc.address, helper.ether(1), {from: user1})

        var users = [user2, user3]
        var amounts = [helper.ether(0.5), helper.ether(0.5)]

        await nc.migrate(users, amounts, token.address, {from: user1})
        var user2_token_balance = await nc.getBalance(token.address, user2)
        var user3_token_balance = await nc.getBalance(token.address, user3)
        assert.equal(user2_token_balance, helper.ether(0.5))
        assert.equal(user3_token_balance, helper.ether(0.5))
    })

    it("combination of new and old contract", async function() {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var nc = await TestMigrate.new({from: admin})

        var inputs = [nc.address]
        var user1_migrate = await helper.generateMigrate(helper.ether(0.02), 0, 0, user1, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user1_migrate)

        var user1_nc_eth_balance0 = await nc.getBalance(0, user1)
        await joyso.migrate(inputs)
        var user1_nc_eth_balance1 = await nc.getBalance(0, user1)
        assert.equal(user1_nc_eth_balance1 - user1_nc_eth_balance0, helper.ether(1 - 0.02))
    })

    it("token migrate", async function() {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var nc = await TestMigrate.new({from: admin})

        var inputs = [nc.address]
        var user1_migrate = await helper.generateMigrate(helper.ether(0.02), 0, token.address, user1, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user1_migrate)

        var user1_nc_eth_balance0 = await nc.getBalance(token.address, user1)
        await joyso.migrate(inputs)
        var user1_nc_eth_balance1 = await nc.getBalance(token.address, user1)
        assert.equal(user1_nc_eth_balance1 - user1_nc_eth_balance0, helper.ether(1))
    })

    it("token migrate, pay by ether", async function() {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var nc = await TestMigrate.new({from: admin})

        var inputs = [nc.address]
        var user1_migrate = await helper.generateMigrate(helper.ether(0.02), 0, token.address, user1, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user1_migrate)

        var joysoWallet_eth = await joyso.getBalance(0, joysoWallet)
        var user1_nc_eth_balance0 = await nc.getBalance(token.address, user1)
        await joyso.migrate(inputs)
        var user1_nc_eth_balance1 = await nc.getBalance(token.address, user1)
        var joysoWallet_eth2 = await joyso.getBalance(0, joysoWallet)
        assert.equal(user1_nc_eth_balance1 - user1_nc_eth_balance0, helper.ether(1))
        assert.equal(joysoWallet_eth2 - joysoWallet_eth, helper.ether(0.02))
    })

    it("token migrate, pay by joy", async function() {
        var joyso, token, joy
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])
        joy = await TestToken.at(temp[2])

        var nc = await TestMigrate.new({from: admin})

        var inputs = [nc.address]
        var user1_migrate = await helper.generateMigrate(helper.ether(0.02), 1, token.address, user1, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user1_migrate)

        var joysoWallet_eth = await joyso.getBalance(joy.address, joysoWallet)
        var user1_nc_eth_balance0 = await nc.getBalance(token.address, user1)
        await joyso.migrate(inputs)
        var user1_nc_eth_balance1 = await nc.getBalance(token.address, user1)
        var joysoWallet_eth2 = await joyso.getBalance(joy.address, joysoWallet)
        assert.equal(user1_nc_eth_balance1 - user1_nc_eth_balance0, helper.ether(1))
        assert.equal(joysoWallet_eth2 - joysoWallet_eth, helper.ether(0.02))
    })

    it("token migrate, pay by token", async function() {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var nc = await TestMigrate.new({from: admin})

        var inputs = [nc.address]
        var user1_migrate = await helper.generateMigrate(helper.ether(0.02), 2, token.address, user1, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user1_migrate)

        var joysoWallet_eth = await joyso.getBalance(token.address, joysoWallet)
        var user1_nc_eth_balance0 = await nc.getBalance(token.address, user1)
        await joyso.migrate(inputs)
        var user1_nc_eth_balance1 = await nc.getBalance(token.address, user1)
        var joysoWallet_eth2 = await joyso.getBalance(token.address, joysoWallet)
        assert.equal(user1_nc_eth_balance1 - user1_nc_eth_balance0, helper.ether(1 - 0.02))
        assert.equal(joysoWallet_eth2 - joysoWallet_eth, helper.ether(0.02))
    })

    it("gas consumption ", async function() {
        var joyso, token
        var temp = await helper.setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var nc = await TestMigrate.new({from: admin})

        var inputs = [nc.address]
        var user1_migrate = await helper.generateMigrate(helper.ether(0.02), 0, 0, user1, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user1_migrate)

        var tx = await joyso.migrate.sendTransaction(inputs, {from: admin})
        var txReceipt = await web3.eth.getTransactionReceipt(tx)
        console.log("1 user migrate cost: ", txReceipt.gasUsed)

        inputs = [nc.address]
        var user2_migrate = await helper.generateMigrate(helper.ether(0.02), 0, 0, user2, joyso.address, nc.address)
        var user3_migrate = await helper.generateMigrate(helper.ether(0.02), 0, 0, user3, joyso.address, nc.address)
        Array.prototype.push.apply(inputs, user2_migrate)
        Array.prototype.push.apply(inputs, user3_migrate)
        tx = await joyso.migrate.sendTransaction(inputs, {from: admin})
        txReceipt = await web3.eth.getTransactionReceipt(tx)
        console.log("2 users migrate cost: ", txReceipt.gasUsed)
    })
})