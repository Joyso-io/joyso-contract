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

});
