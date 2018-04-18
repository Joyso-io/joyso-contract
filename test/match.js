'use strict';

const Joyso = artifacts.require('./Joyso.sol');
const TestToken = artifacts.require('./TestToken.sol');
const helper = require('./helper.js');

contract('match.js', accounts => {
  const admin = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const user3 = accounts[3];
  const joysoWallet = accounts[4];
  const ETHER = '0x0000000000000000000000000000000000000000';
  const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

  it('case1, details in google doc', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);

    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const user2EtherBalance = await joyso.getBalance(ETHER, user2);
    const user1TokenBalance = await joyso.getBalance(token.address, user1);
    const user2TokenBalance = await joyso.getBalance(token.address, user2);
    const joysoEtherBalance = await joyso.getBalance(ETHER, joysoWallet);

    await joyso.matchByAdmin(inputs, { from: admin, gas: 4700000 });

    const user1EtherBalance2 = await joyso.getBalance(ETHER, user1);
    const user2EtherBalance2 = await joyso.getBalance(ETHER, user2);
    const user1TokenBalance2 = await joyso.getBalance(token.address, user1);
    const user2TokenBalance2 = await joyso.getBalance(token.address, user2);
    const joysoEtherBalance2 = await joyso.getBalance(ETHER, joysoWallet);

    assert.equal(user1EtherBalance - user1EtherBalance2, helper.ether(0.5 + 0.01 + 0.001));
    assert.equal(user2EtherBalance2 - user2EtherBalance, helper.ether(0.5 - 0.01 - 0.0005));
    assert.equal(user1TokenBalance2 - user1TokenBalance, helper.ether(0.5));
    assert.equal(user2TokenBalance - user2TokenBalance2, helper.ether(0.5));
    assert.equal(joysoEtherBalance2 - joysoEtherBalance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005));
  });

  it('case2, details in google doc', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);
    const order3 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 3, 20, 10, 0, 0, token.address, ETHER, user3, joyso.address);
    Array.prototype.push.apply(inputs, order3);

    const user1EtherBalance = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance = await joyso.getBalance.call(token.address, user2);
    const user3EtherBalance = await joyso.getBalance.call(ETHER, user3);
    const user3TokenBalance = await joyso.getBalance.call(token.address, user3);
    const joysoEtherBalance = await joyso.getBalance.call(ETHER, joysoWallet);

    await joyso.matchByAdmin(inputs, { from: admin });

    const user1EtherBalance2 = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance2 = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance2 = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance2 = await joyso.getBalance.call(token.address, user2);
    const user3EtherBalance2 = await joyso.getBalance.call(ETHER, user3);
    const user3TokenBalance2 = await joyso.getBalance.call(token.address, user3);
    const joysoEtherBalance2 = await joyso.getBalance.call(ETHER, joysoWallet);

    assert.equal(user1EtherBalance - user1EtherBalance2, helper.ether(0.5 + 0.01 + 0.001));
    assert.equal(user1TokenBalance2 - user1TokenBalance, helper.ether(0.5));
    assert.equal(user2EtherBalance2 - user2EtherBalance, helper.ether(0.25 - 0.01 - 0.00025));
    assert.equal(user2TokenBalance - user2TokenBalance2, helper.ether(0.25));
    assert.equal(user3EtherBalance2 - user3EtherBalance, helper.ether(0.25 - 0.01 - 0.00025));
    assert.equal(user3TokenBalance - user3TokenBalance2, helper.ether(0.25));
    assert.equal(joysoEtherBalance2 - joysoEtherBalance, helper.ether(0.01 + 0.001 + 0.01 + 0.00025 + 0.01 + 0.00025));
  });

  it('case3, details in google doc', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.000112), helper.ether(0.000000000007), helper.ether(0.000001), 0x5a41e89b, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(helper.ether(0.000000000001), helper.ether(0.00001), helper.ether(0.000001), 0x5a41e7ba, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);
    const order3 = await helper.generateOrder(helper.ether(0.000000000005), helper.ether(0.000075), helper.ether(0.000001), 0x5a41e7e0, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order3);

    await joyso.matchByAdmin(inputs, { from: admin });

    const user1EtherBalance = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance = await joyso.getBalance.call(token.address, user2);
    const joysoWalletBalance = await joyso.getBalance.call(ETHER, joysoWallet);
    assert.equal(user1EtherBalance, web3.toWei(0.99991383, 'ether'), 'user1_ether_balance');
    assert.equal(user1TokenBalance, web3.toWei(1.000000000006, 'ether'), 'user1 token balance');
    assert.equal(user2EtherBalance, web3.toWei(1.000082915, 'ether'), 'user2 ether balance');
    assert.equal(user2TokenBalance, web3.toWei(0.999999999994, 'ether'), 'user2 token balance');
    assert.equal(joysoWalletBalance, web3.toWei(0.000003255, 'ether'), 'joysoWallet ether balance');
  });

  it('case4', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(200000000000000, 1000000, 1000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(150, 15000000000, 1000000000000, 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    await joyso.matchByAdmin(inputs, { from: admin });

    try {
      await joyso.matchByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('case5', async () => {
    let joyso, token, joy;
    let temp = await helper.setupEnvironment();
    joyso = await Joyso.at(temp[0]);
    token = await TestToken.at(temp[1]);
    joy = await TestToken.at(temp[2]);

    let inputs = [];
    let order1 = await helper.generateOrder(20000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    let order2 = await helper.generateOrder(10000000, 20000000000000000, 15000000, 11, 10, 5, 0x3e801, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    await joyso.matchByAdmin(inputs, { from: admin });

    try {
      await joyso.matchByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('case6 trade all the user balance', async () => {
    const temp = await helper.setupEnvironment2();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(10000000000000000, 10000000, 1500000000000000, 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(10000000, 10000000000000000, 15000000, 11, 10, 5, 0x3e80, 0, token.address, ETHER, user1, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    await joyso.matchByAdmin(inputs, { from: admin });

    try {
      await joyso.matchByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('taker paid Joy for fee', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);
    const joy = await TestToken.at(temp[2]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 1000, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);

    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const user2EtherBalance = await joyso.getBalance(ETHER, user2);
    const user1TokenBalance = await joyso.getBalance(token.address, user1);
    const user2TokenBalance = await joyso.getBalance(token.address, user2);
    const user1JoyBalance = await joyso.getBalance(joy.address, user1);
    const joysoEtherBalance = await joyso.getBalance(ETHER, joysoWallet);
    const joysoJoyBalance = await joyso.getBalance(joy.address, joysoWallet);

    await joyso.matchByAdmin(inputs, { from: admin, gas: 4700000 });

    const user1EtherBalance2 = await joyso.getBalance(ETHER, user1);
    const user2EtherBalance2 = await joyso.getBalance(ETHER, user2);
    const user1TokenBalance2 = await joyso.getBalance(token.address, user1);
    const user2TokenBalance2 = await joyso.getBalance(token.address, user2);
    const user1JoyBalance2 = await joyso.getBalance(joy.address, user1);
    const joysoEtherBalance2 = await joyso.getBalance(ETHER, joysoWallet);
    const joysoJoyBalance2 = await joyso.getBalance(joy.address, joysoWallet);

    assert.equal(user1EtherBalance - user1EtherBalance2, helper.ether(0.5));
    assert.equal(user2EtherBalance2 - user2EtherBalance, helper.ether(0.5 - 0.01 - 0.0005));
    assert.equal(user1TokenBalance2 - user1TokenBalance, helper.ether(0.5));
    assert.equal(user2TokenBalance - user2TokenBalance2, helper.ether(0.5));
    assert.equal(joysoEtherBalance2 - joysoEtherBalance, helper.ether(0.01 + 0.0005));
    assert.equal(user1JoyBalance - user1JoyBalance2, helper.ether(0.001) / 10 ** 5 / 1000 + helper.ether(0.01));
    assert.equal(joysoJoyBalance2 - joysoJoyBalance, helper.ether(0.001) / 10 ** 5 / 1000 + helper.ether(0.01));
  });

  it('gasFee can only charge once for each order', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    let inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    const user1EtherBalance = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance = await joyso.getBalance.call(token.address, user2);
    const joysoEtherBalance = await joyso.getBalance.call(ETHER, joysoWallet);

    await joyso.matchByAdmin(inputs, { from: admin });

    const user1EtherBalance2 = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance2 = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance2 = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance2 = await joyso.getBalance.call(token.address, user2);
    const user3EtherBalance2 = await joyso.getBalance.call(ETHER, user3);
    const user3TokenBalance2 = await joyso.getBalance.call(token.address, user3);
    const joysoEtherBalance2 = await joyso.getBalance.call(ETHER, joysoWallet);

    assert.equal(user1EtherBalance - user1EtherBalance2, helper.ether(0.25 + 0.01 + 0.0005));
    assert.equal(user1TokenBalance2 - user1TokenBalance, helper.ether(0.25));
    assert.equal(user2EtherBalance2 - user2EtherBalance, helper.ether(0.25 - 0.01 - 0.00025));
    assert.equal(user2TokenBalance - user2TokenBalance2, helper.ether(0.25));
    assert.equal(joysoEtherBalance2 - joysoEtherBalance, helper.ether(0.01 + 0.0005 + 0.01 + 0.00025));

    inputs = [];
    const order3 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user3, joyso.address);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order2);

    await joyso.matchByAdmin(inputs, { from: admin });

    const user2EtherBalance3 = await joyso.getBalance(ETHER, user2);
    const user2TokenBalance3 = await joyso.getBalance(token.address, user2);
    const user3EtherBalance3 = await joyso.getBalance(ETHER, user3);
    const user3TokenBalance3 = await joyso.getBalance(token.address, user3);
    const joysoEtherBalance3 = await joyso.getBalance(ETHER, joysoWallet);

    assert.equal(user2EtherBalance3 - user2EtherBalance2, helper.ether(0.25 - 0.00025));
    assert.equal(user2TokenBalance2 - user2TokenBalance3, helper.ether(0.25));
    assert.equal(user3EtherBalance2 - user3EtherBalance3, helper.ether(0.25 + 0.01 + 0.0005));
    assert.equal(user3TokenBalance3 - user3TokenBalance2, helper.ether(0.25));
    assert.equal(joysoEtherBalance3 - joysoEtherBalance2, helper.ether(0.00025 + 0.01 + 0.0005));
  });

  it('gasFee (JOY) can only charge once for each order', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);
    const joy = await TestToken.at(temp[2]);

    let inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01), 2, 20, 10, 1000, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    const user1EtherBalance = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance = await joyso.getBalance.call(token.address, user2);
    const user2JoyBalance = await joyso.getBalance.call(joy.address, user2);
    const joysoEtherBalance = await joyso.getBalance.call(ETHER, joysoWallet);
    const joysoJoyBalance = await joyso.getBalance.call(joy.address, joysoWallet);

    await joyso.matchByAdmin(inputs, { from: admin });

    const user1EtherBalance2 = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance2 = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance2 = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance2 = await joyso.getBalance.call(token.address, user2);
    const user2JoyBalance2 = await joyso.getBalance.call(joy.address, user2);
    const user3EtherBalance2 = await joyso.getBalance.call(ETHER, user3);
    const user3TokenBalance2 = await joyso.getBalance.call(token.address, user3);
    const joysoEtherBalance2 = await joyso.getBalance.call(ETHER, joysoWallet);
    const joysoJoyBalance2 = await joyso.getBalance.call(joy.address, joysoWallet);

    assert.equal(user1EtherBalance - user1EtherBalance2, helper.ether(0.25 + 0.01 + 0.0005));
    assert.equal(user1TokenBalance2 - user1TokenBalance, helper.ether(0.25));
    assert.equal(user2EtherBalance2 - user2EtherBalance, helper.ether(0.25));
    assert.equal(user2TokenBalance - user2TokenBalance2, helper.ether(0.25));
    assert.equal(user2JoyBalance.minus(user2JoyBalance2), helper.ether(0.01) + helper.ether(0.00025) / 10 ** 5 / 1000);
    assert.equal(joysoEtherBalance2 - joysoEtherBalance, helper.ether(0.01 + 0.0005));
    assert.equal(joysoJoyBalance2.minus(joysoJoyBalance), helper.ether(0.01) + helper.ether(0.00025) / 10 ** 5 / 1000);

    inputs = [];
    const order3 = await helper.generateOrder(helper.ether(0.25), helper.ether(0.25), helper.ether(0.01), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user3, joyso.address);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order2);

    await joyso.matchByAdmin(inputs, { from: admin });

    const user2EtherBalance3 = await joyso.getBalance(ETHER, user2);
    const user2TokenBalance3 = await joyso.getBalance(token.address, user2);
    const user2JoyBalance3 = await joyso.getBalance(joy.address, user2);
    const user3EtherBalance3 = await joyso.getBalance(ETHER, user3);
    const user3TokenBalance3 = await joyso.getBalance(token.address, user3);
    const joysoEtherBalance3 = await joyso.getBalance(ETHER, joysoWallet);
    const joysoJoyBalance3 = await joyso.getBalance(joy.address, joysoWallet);

    assert.equal(user2EtherBalance3 - user2EtherBalance2, helper.ether(0.25));
    assert.equal(user2TokenBalance2 - user2TokenBalance3, helper.ether(0.25));
    assert.equal(user2JoyBalance2.minus(user2JoyBalance3), helper.ether(0.00025) / 10 ** 5 / 1000);
    assert.equal(user3EtherBalance2 - user3EtherBalance3, helper.ether(0.25 + 0.01 + 0.0005));
    assert.equal(user3TokenBalance3 - user3TokenBalance2, helper.ether(0.25));
    assert.equal(joysoEtherBalance3 - joysoEtherBalance2, helper.ether(0.01 + 0.0005));
    assert.equal(joysoJoyBalance3.minus(joysoJoyBalance2), helper.ether(0.00025) / 10 ** 5 / 1000);
  });

  it("it should fail if taker's signature is wrong.", async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    inputs[5] = 1234; // s

    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    try {
      await joyso.matchByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it("it should fail if the maker's signature is wrong", async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);

    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);
    inputs[11] = 1234; // s

    try {
      await joyso.matchByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it("it should fail if the price taker's price is worse than maker's", async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);

    const order2 = await helper.generateOrder(helper.ether(0.1), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    try {
      await joyso.matchByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('split a taker order into two transactions', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    let inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.000112), helper.ether(0.000000000007), helper.ether(0.000001), 0x5a41e89b, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    const order2 = await helper.generateOrder(helper.ether(0.000000000001), helper.ether(0.00001), helper.ether(0.000001), 0x5a41e7ba, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    await joyso.matchByAdmin(inputs, { from: admin });

    const order3 = await helper.generateOrder(helper.ether(0.000000000005), helper.ether(0.000075), helper.ether(0.000001), 0x5a41e7e0, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    inputs = [];
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order3);
    await joyso.matchByAdmin(inputs, { from: admin });

    const user1EtherBalance = await joyso.getBalance.call(ETHER, user1);
    const user1TokenBalance = await joyso.getBalance.call(token.address, user1);
    const user2EtherBalance = await joyso.getBalance.call(ETHER, user2);
    const user2TokenBalance = await joyso.getBalance.call(token.address, user2);
    const joysoWalletBalance = await joyso.getBalance.call(ETHER, joysoWallet);
    assert.equal(user1EtherBalance, web3.toWei(0.99991383, 'ether'), 'user1_ether_balance');
    assert.equal(user1TokenBalance, web3.toWei(1.000000000006, 'ether'), 'user1 token balance');
    assert.equal(user2EtherBalance, web3.toWei(1.000082915, 'ether'), 'user2 ether balance');
    assert.equal(user2TokenBalance, web3.toWei(0.999999999994, 'ether'), 'user2 token balance');
    assert.equal(joysoWalletBalance, web3.toWei(0.000003255, 'ether'), 'joysoWallet ether balance');
  });
});
