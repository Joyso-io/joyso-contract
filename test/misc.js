'use strict';

const Joyso = artifacts.require('./Joyso.sol');
const TestToken = artifacts.require('./testing/TestToken.sol');
const helper = require('./support/helper.js');

contract('Joyso misc.js', function (accounts) {
  const admin = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const joysoWallet = accounts[4];
  const ONE = web3.toWei(1, 'ether');
  const ETHER = '0x0000000000000000000000000000000000000000';

  it('it should fail if not admin send the match', async function () {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);
    inputs.push(...order1);
    const order2 = await helper.generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);

    try {
      await joyso.matchByAdmin_TwH36(inputs, { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('deposit should fail, if the deposit token is not registered ', async function () {
    const joy = await TestToken.new('tt', 'tt', 18, { from: admin });
    const joyso = await Joyso.new(joysoWallet, joy.address, { from: admin });
    const token = await TestToken.new('tt', 'tt', 18, { from: admin });
    await token.transfer(user1, ONE, { from: admin });
    await token.approve(joyso.address, ONE, { from: user1 });

    try {
      await joyso.depositToken(token.address, ONE, { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('it should fail if the token is not approved to the joyso contract', async function () {
    const joy = await TestToken.new('tt', 'tt', 18, { from: admin });
    const joyso = await Joyso.new(joysoWallet, joy.address, { from: admin });
    const token = await TestToken.new('tt', 'tt', 18, { from: admin });
    await token.transfer(user1, ONE, { from: admin });
    await joyso.registerToken(token.address, 0x57, { from: admin });

    try {
      await joyso.depositToken(token.address, ONE, { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it("registerToken's index should more than 1", async function () {
    const joy = await TestToken.new('tt', 'tt', 18, { from: admin });
    const joyso = await Joyso.new(joysoWallet, joy.address, { from: admin });
    const token = await TestToken.new('tt', 'tt', 18, { from: admin });
    await token.transfer(user1, ONE, { from: admin });

    try {
      await joyso.registerToken(token.address, 0x00, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('the same token can not registered twice ', async function () {
    const joy = await TestToken.new('tt', 'tt', 18, { from: admin });
    const joyso = await Joyso.new(joysoWallet, joy.address, { from: admin });
    const token = await TestToken.new('tt', 'tt', 18, { from: admin });
    await token.transfer(user1, ONE, { from: admin });
    await joyso.registerToken(token.address, 0x57, { from: admin });

    try {
      await joyso.registerToken(token.address, 0x56, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('add new admin', async function () {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);
    inputs.push(...order1);
    const order2 = await helper.generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);
    await joyso.addToAdmin(user1, true, { from: admin });
    await joyso.matchByAdmin_TwH36(inputs, { from: user1 });
  });

  it('for case1, maker and taker order exchage the place should still success', async function () {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);

    const order2 = await helper.generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);
    inputs.push(...order1);
    await joyso.matchByAdmin_TwH36(inputs, { from: admin });
  });

  it("register token can not use other token's index", async function () {
    const joy = await TestToken.new('tt', 'tt', 18, { from: admin });
    const joyso = await Joyso.new(joysoWallet, joy.address, { from: admin });
    const token = await TestToken.new('tt', 'tt', 18, { from: admin });
    const token2 = await TestToken.new('tt', 'tt', 18, { from: admin });
    await token.transfer(user1, ONE, { from: admin });
    await joyso.registerToken(token.address, 0x57, { from: admin });

    try {
      await joyso.registerToken(token2.address, 0x57, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('owner collectFee', async function () {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);
    const joy = await TestToken.at(temp[2]);

    const inputs = [];
    const order1 = await helper.generateOrder(10000000000000000, 10000000, 150000000000000000, 10, 20, 10, 0, true, ETHER, token.address, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(10000000, 10000000000000000, 1500000000, 11, 10, 5, 0x3e80, 0, token.address, ETHER, user1, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    const adminEtherBalance = await web3.eth.getBalance(admin);
    const adminJOYBalance = await joy.balanceOf(admin);

    await joyso.matchByAdmin_TwH36(inputs, { from: admin });
    // collectFee from user should fail
    try {
      await joyso.collectFee(ETHER, { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0 || error.message.search('assert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
    await joyso.collectFee(ETHER, { from: admin });
    await joyso.collectFee(joy.address, { from: admin });

    const adminEtherBalance1 = await web3.eth.getBalance(admin);
    const adminJOYBalance1 = await joy.balanceOf(admin);
    const joysoWalletContractEtherBalance1 = await joyso.getBalance(ETHER, joysoWallet);
    const joysoWalletContractJOYBalance1 = await joyso.getBalance(joy.address, joysoWallet);
    assert.isAbove(adminEtherBalance1.sub(adminEtherBalance), 0);
    assert.isAbove(adminJOYBalance1.sub(adminJOYBalance), 0);
    assert.equal(joysoWalletContractEtherBalance1, 0);
    assert.equal(joysoWalletContractJOYBalance1, 0);
  });

  it('transferForAdmin', async function () {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const joy = await TestToken.at(temp[2]);

    const user1JOYBalance = await joyso.getBalance(joy.address, user1);
    const user2JOYBalance = await joyso.getBalance(joy.address, user2);

    await joyso.addToAdmin(user1, true, { from: admin });
    await joyso.transferForAdmin(joy.address, user2, 500000, { from: user1 });

    const user1JOYBalance1 = await joyso.getBalance(joy.address, user1);
    const user2JOYBalance1 = await joyso.getBalance(joy.address, user2);

    assert.equal(user2JOYBalance1.sub(user2JOYBalance), 500000);
    assert.equal(user1JOYBalance.sub(user1JOYBalance1), 500000);
  });
});
