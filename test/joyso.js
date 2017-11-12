
'use strict'

const Joyso = artifacts.require("./Joyso.sol");
const TestToken = artifacts.require("./TestToken.sol")

contract('Joyso', function (accounts) {

    var admin = accounts[0]
    var user1 = accounts[1]
    var user2 = accounts[2]
    var ONE = web3.toWei(1, 'ether')
    const ETHER = "0x0000000000000000000000000000000000000000"

    it("should have equal balance when deposit ether", async function () {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        var balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(ONE, balance)
    })

    it("should have equal balance when deposit token", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user1)
        assert.equal(ONE, balance)
    })

    it("should have equal balance when depoit and transfer ether to user2", async function () {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.transfer(ETHER, user2, ONE, {from: user1})
        var balance = await joyso.getBalance.call(ETHER, user2)
        assert.equal(ONE, balance)        
    })

    it("should have equal balance when deposit and transfer token to user2", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.transfer(testToken.address, user2, ONE, {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(ONE, balance)
    })

    it("should takeByID scuessed from on-chain make", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.make(testToken.address, ETHER, ONE, ONE, 10000, 1, {from: user1})
        var query = await joyso.queryID.call(user1, testToken.address, ETHER, ONE, ONE, 10000, 1)
        var orderID = query[0]
        var orderStatus = query[1]
        assert.equal(1, orderStatus)
        await joyso.takeByID(orderID, ONE, {from: user2})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user2_token_balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(ONE, user1_ether_balance)
        assert.equal(ONE, user2_token_balance)
    })

    it("should update if the order maker has not enough balance", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.make(testToken.address, ETHER, ONE, ONE, 10000, 1, {from: user1})
        var query = await joyso.queryID.call(user1, testToken.address, ETHER, ONE, ONE, 10000, 1)
        var orderID = query[0]
        var orderStatus = query[1]
        var query = await joyso.orderBook.call(orderID)
        var orderBalance = query[8]
        assert.equal(1, orderStatus)
        assert.equal(ONE, orderBalance)
        await joyso.withdrawToken(testToken.address, ONE/2, {from: user1})
        await joyso.updateOrder(orderID)
        var query = await joyso.orderBook.call(orderID)
        var orderBalance = query[8]
        assert.equal(ONE/2, orderBalance)
    })

    it("should update the order if user balance is not enough.", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.make(testToken.address, ETHER, ONE, ONE, 10000, 1, {from: user1})
        await joyso.withdrawToken(testToken.address, ONE/2, {from: user1})
        var query = await joyso.queryID.call(user1, testToken.address, ETHER, ONE, ONE, 10000, 1)
        var orderID = query[0]
        var orderStatus = query[1]
        assert.equal(1, orderStatus)
        await joyso.takeByID(orderID, ONE, {from: user2})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user2_token_balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(ONE/2, user1_ether_balance)
        assert.equal(ONE/2, user2_token_balance)        
    })
})
