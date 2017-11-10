
'use strict'

const Joyso = artifacts.require("./Joyso.sol");
const TestToken = artifacts.require("./TestToken.sol")

contract('Joyso', function (accounts) {

    var admin = accounts[0]
    var user1 = accounts[1]
    var user2 = accounts[2]
    const ETHER = "0x0000000000000000000000000000000000000000"

    it("should have equal balance when deposit ether", async function () {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: web3.toWei(1, 'ether')})
        var balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(web3.toWei(1, 'ether'), balance)
    })

    it("should have equal balance when deposit token", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, web3.toWei(100, 'ether'), {from: admin})
        await testToken.approve(joyso.address, web3.toWei(1, 'ether'), {from: user1})
        await joyso.depositToken(testToken.address, web3.toWei(1, 'ether'), {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user1)
        assert.equal(web3.toWei(1, 'ether'), balance)
    })

    it("should have equal balance when depoit and transfer ether to user2", async function () {
        var joyso = await Joyso.new({from: admin})
        await joyso.depositEther({from: user1, value: web3.toWei(1, 'ether')})
        await joyso.transfer(ETHER, user2, web3.toWei(1, 'ether'), {from: user1})
        var balance = await joyso.getBalance.call(ETHER, user2)
        assert.equal(web3.toWei(1, 'ether'), balance)        
    })

    it("should have equal balance when deposit and transfer token to user2", async function () {
        var joyso = await Joyso.new({from: admin})
        var testToken = await TestToken.new('tt', 'tt', 18, {from: admin})
        await testToken.transfer(user1, web3.toWei(100, 'ether'), {from: admin})
        await testToken.approve(joyso.address, web3.toWei(1, 'ether'), {from: user1})
        await joyso.depositToken(testToken.address, web3.toWei(1, 'ether'), {from: user1})
        await joyso.transfer(testToken.address, user2, web3.toWei(1, 'ether'), {from: user1})
        var balance = await joyso.getBalance.call(testToken.address, user2)
        assert.equal(web3.toWei(1, 'ether'), balance)
    })


})
