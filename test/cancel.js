'use strict'

const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const helper = require("./helper.js")
const _ = require('lodash')

contract('cancel.js', function(accounts) {

  const admin = accounts[0]
  const user1 = accounts[1]
  const user2 = accounts[2]
  const user3 = accounts[3]
  const joysoWallet = accounts[4]
  const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;
  const ETHER = "0x0000000000000000000000000000000000000000"


  it("cancelByAdmin should update the user nonce", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    var user1_nonce = await joyso.userNonce.call(user1)
    assert.equal(user1_nonce, 0x1234)
  });

  it("nonce should more than current nonce", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    inputs = await helper.generateCancel(helper.ether(0.001), 0x123, 0, user1, joyso.address)
    try {
      await joyso.cancelByAdmin(inputs, {from: admin, gas: 4700000})
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }    
  });

  it("pay joy for fee to cancel the order", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var joy_balance = await joyso.getBalance(joy.address, user1)

    var inputs = []
    inputs = await helper.generateCancel(1000000, 0x1234, 1, user1, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    var joy_balance2 = await joyso.getBalance(joy.address, user1)
    assert.equal(joy_balance.sub(joy_balance2), 1000000)
  })

  it("cancel should fail if user's signature is wrong", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])
    
    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address)
    inputs[3] = 111
    
    try {
      await joyso.cancelByAdmin(inputs, {from: admin, gas: 4700000})
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }     
  })

  it("cancel should fail if user's balance is not enough", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])
    
    var inputs = []
    inputs = await helper.generateCancel(helper.ether(10), 0x1234, 0, user1, joyso.address)

    try {
      await joyso.cancelByAdmin(inputs, {from: admin, gas: 4700000})
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }

    inputs = await helper.generateCancel(helper.ether(10), 0x1234, 1, user2, joyso.address)
    try {
      await joyso.cancelByAdmin(inputs, {from: admin, gas: 4700000})
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  })

  it("match should fail if the taker order's nonce is less than userNonce", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    inputs = []
    var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
    Array.prototype.push.apply(inputs, order1)

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

  it("match should fail if the maker order's nonce is less than userNonce", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user2, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    inputs = []
    var order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
    Array.prototype.push.apply(inputs, order1)

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

  it("tokenMatch should fail if the taker order's nonce is less than userNonce", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    inputs = []
    var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
    Array.prototype.push.apply(inputs, order1)

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

  it("match should fail if the maker order's nonce is less than userNonce", async function() {
    var joyso, token, joy
    var temp = await helper.setupEnvironment()
    joyso = await Joyso.at(temp[0])
    token = await TestToken.at(temp[1])
    joy = await TestToken.at(temp[2])

    var inputs = []
    inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user2, joyso.address)
    await joyso.cancelByAdmin(inputs, {from: admin})

    inputs = []
    var order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
                                0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
    Array.prototype.push.apply(inputs, order1)

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
});
