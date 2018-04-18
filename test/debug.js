'use strict';

const Joyso = artifacts.require('./Joyso.sol');
const TestToken = artifacts.require('./TestToken.sol');
const helper = require('./helper.js');

contract('debug.js', accounts => {
  const admin = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const joysoWallet = accounts[4];
  const ETHER = '0x0000000000000000000000000000000000000000';
  const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

  it('case1, details in google doc', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = [];
    const order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);

    const order2 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const user2EtherBalance = await joyso.getBalance(ETHER, user2);
    const user1TokenBalance = await joyso.getBalance(token.address, user1);
    const user2TokenBalance = await joyso.getBalance(token.address, user2);
    const joysoEtherBalance = await joyso.getBalance(ETHER, joysoWallet);

    await joyso.matchTokenOrderByAdmin(inputs, { from: admin, gas: 4700000 });
    const user1EtherBalance2 = await joyso.getBalance(ETHER, user1);
    const user2EtherBalance2 = await joyso.getBalance(ETHER, user2);
    const user1TokenBalance2 = await joyso.getBalance(token.address, user1);
    const user2TokenBalance2 = await joyso.getBalance(token.address, user2);
    const joysoEtherBalance2 = await joyso.getBalance(ETHER, joysoWallet);

    assert.equal(user1EtherBalance - user1EtherBalance2, helper.ether(0.5 + 0.01 + 0.001), 'user1_ether');
    assert.equal(user2EtherBalance2 - user2EtherBalance, helper.ether(0.5 - 0.01 - 0.0005), 'user2_ether');
    assert.equal(user1TokenBalance2 - user1TokenBalance, helper.ether(0.5), 'user1_token');
    assert.equal(user2TokenBalance - user2TokenBalance2, helper.ether(0.5), 'user2_token');
    assert.equal(joysoEtherBalance2 - joysoEtherBalance, helper.ether(0.01 + 0.01 + 0.001 + 0.0005), 'joyso_ether');
  });
});
