
'use strict'

const Joyso = artifacts.require("./Joyso.sol");
const TestToken = artifacts.require("./TestToken.sol")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')

contract('Joyso', function (accounts) {

    var admin = accounts[0]
    var user1 = accounts[1]
    var user2 = accounts[2]
    var ONE = web3.toWei(1, 'ether')
    const ETHER = "0x0000000000000000000000000000000000000000"

    const retriveSignature = function(signedData) {
        console.log("hello1")
        let sig = signedData.substr(2, signedData.length);
        console.log(2)
        let r = '0x' + signedData.substr(0, 64);
        let s = '0x' + signedData.substr(64, 64);
        console.log(3)
        let v = web3.toDecimal(signedData.substr(128, 2)) + 27;
        console.log(r)
        console.log(s)
        console.log(v)
        return {sha, v, r, s};
    }
      

    it("deposit ether 後餘是否正確", async function () {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        var balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(ONE, balance)
    })

    it("deposit token 後餘額是否正確", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user1)
        assert.equal(ONE, balance)
    })

    it("withdraw ether 後餘額是否正確", async function() {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        var balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(ONE, balance)
        await joyso.withdrawEther(ONE/2, {from: user1})
        var balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(ONE/2, balance)
    })

    it("withdraw token 後餘額是否正確", async function() {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user1)
        assert.equal(ONE, balance)
        await joyso.withdrawToken(testToken.address, ONE/2, {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user1)
        assert.equal(ONE/2, balance)
    })

    it("合約裡個人餘額轉移(transfer) ether 後餘額是否正確", async function () {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.transfer(ETHER, user2, ONE, {from: user1})
        var balance = await joyso.getBalance.call(ETHER, user2)
        assert.equal(ONE, balance)        
    })

    it("合約裡個人餘額轉移(transfer) token 後餘額是否正確", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.transfer(testToken.address, user2, ONE, {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(ONE, balance)
    })

    it("deposit/withdraw/transfer 整合 1")
    it("deposit/withdraw/transfer 整合 2")
    it("deposit/withdraw/transfer 整合 3")

    it("透過智能合約下單(make)，並呼叫 takeByID 是否成功交易", async function () {
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
        var query = await joyso.orderBook.call(orderID)        
        var orderBalance = query[8]
        var orderStatus = query[9]
        assert.equal(0, orderBalance)
        assert.equal(2, orderStatus) 
    })

    it("maker餘額不足，呼叫updateOrder可更新order餘額", async function () {
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
        var query = await joyso.orderBook.call(orderID)        
        var orderBalance = query[8]
        var orderStatus = query[9]
        assert.equal(ONE/2, orderBalance)
    })

    it("take執行當下若maker餘額不足可以把餘額交易掉", async function () {
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
        var query = await joyso.orderBook.call(orderID)        
        var orderBalance = query[8]
        var orderStatus = query[9]
        assert.equal(0, orderBalance)
        assert.equal(2, orderStatus)       
    })

    it("amoutTake多的時候可以把餘額全交易掉", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.make(testToken.address, ETHER, ONE/2, ONE/2, 10000, 1, {from: user1})
        var query = await joyso.queryID.call(user1, testToken.address, ETHER, ONE/2, ONE/2, 10000, 1)
        var orderID = query[0]
        var orderStatus = query[1]
        assert.equal(1, orderStatus)
        await joyso.takeByID(orderID, ONE, {from: user2})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user2_token_balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(ONE/2, user1_ether_balance)
        assert.equal(ONE/2, user2_token_balance)
        var query = await joyso.orderBook.call(orderID)
        var orderBalance = query[8]
        var orderStatus = query[9]
        assert.equal(0, orderBalance)
        assert.equal(2, orderStatus)     
    })

    it("離線簽章的order可以使用take來取單", async function() {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, ONE, {from: admin})
        await testToken.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(testToken.address, ONE, {from: user1})
        await joyso.depositEther({from: user2, value: ONE})

        // const args = [user1, testToken.address, ETHER, ONE, ONE, 10000, 10]
        // const argTypes = ['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'uint256']
        // const msg = ABI.soliditySHA3(argTypes, args)
        // const sig = web3.eth.sign(user1, util.bufferToHex(msg))
        // const {v, r, s} = util.fromRpcSig(sig)
        // console.log(1)

        var query = await joyso.queryID.call(user1, testToken.address, ETHER, ONE, ONE, 10000, 10)
        var queryID = query[0]
        var orderStatus = query[1]
        assert.equal(0, orderStatus)
        const sig = web3.eth.sign(user1, util.bufferToHex(queryID))
        const {v, r, s} = util.fromRpcSig(sig)
        
        await joyso.take(user1, testToken.address, ETHER, ONE, ONE, 10000, 10, v, util.bufferToHex(r), util.bufferToHex(s), ONE, {from: user2})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user2_token_balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(ONE, user1_ether_balance)
        assert.equal(ONE, user2_token_balance)

        var query = await joyso.queryID.call(user1, testToken.address, ETHER, ONE, ONE, 10000, 10)
        var orderID = query[0]
        var query = await joyso.orderBook.call(orderID)        
        var orderBalance = query[8]
        var orderStatus = query[9]
        assert.equal(0, orderBalance)
        assert.equal(2, orderStatus)          
    })

    it("maker餘額不足時，離線簽章的order仍可把maker餘額交易掉")
    it("穿單(multiTake)")
    it("make/take 整合1")
    it("make/take 整合2")
    it("make/take 整合3")
})
