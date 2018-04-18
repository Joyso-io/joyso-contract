'use strict';

const Joyso = artifacts.require('./Joyso.sol');
const TestToken = artifacts.require('./TestToken.sol');
const helper = require('./helper.js');

contract('joyso withdraw', accounts => {
  const admin = accounts[0];
  const user1 = accounts[1];
  const joysoWallet = accounts[4];
  const ETHER = '0x0000000000000000000000000000000000000000';

  it('withdraw token, pay by ether', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const joysoEtherBalance = await joyso.getBalance(ETHER, joysoWallet);
    const user1TokenBalance = await joyso.getBalance(token.address, user1);
    const user1AccountTokenBalance = await token.balanceOf(user1);

    const inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, token.address, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    const user1EtherBalanceAfter = await joyso.getBalance(ETHER, user1);
    const joysoEtherBalanceAfter = await joyso.getBalance(ETHER, joysoWallet);
    const user1TokenBalanceAfter = await joyso.getBalance(token.address, user1);
    const user1AccountTokenBalanceAfter = await token.balanceOf(user1);

    assert.equal(user1EtherBalance - user1EtherBalanceAfter, helper.ether(0.02));
    assert.equal(user1AccountTokenBalanceAfter - user1AccountTokenBalance, helper.ether(0.5));
    assert.equal(user1TokenBalance - user1TokenBalanceAfter, helper.ether(0.5));
    assert.equal(joysoEtherBalanceAfter - joysoEtherBalance, helper.ether(0.02));
  });

  it('withdraw joy, pay by ether', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const joy = await TestToken.at(temp[2]);

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const joysoEtherBalance = await joyso.getBalance(ETHER, joysoWallet);
    const user1TokenBalance = await joyso.getBalance(joy.address, user1);
    const user1AccountTokenBalance = await joy.balanceOf(user1);

    const inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, joy.address, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    const user1EtherBalanceAfter = await joyso.getBalance(ETHER, user1);
    const joysoEtherBalanceAfter = await joyso.getBalance(ETHER, joysoWallet);
    const user1TokenBalanceAfter = await joyso.getBalance(joy.address, user1);
    const user1AccountTokenBalanceAfter = await joy.balanceOf(user1);

    assert.equal(user1EtherBalance - user1EtherBalanceAfter, helper.ether(0.02));
    assert.equal(user1AccountTokenBalanceAfter - user1AccountTokenBalance, helper.ether(0.5));
    assert.equal(user1TokenBalance - user1TokenBalanceAfter, helper.ether(0.5));
    assert.equal(joysoEtherBalanceAfter - joysoEtherBalance, helper.ether(0.02));
  });

  it('withdraw ether, pay by ether', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const joysoEtherBalance = await joyso.getBalance(ETHER, joysoWallet);
    const user1AccountEtherBalance = await web3.eth.getBalance(user1);

    const inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, ETHER, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    const user1EtherBalanceAfter = await joyso.getBalance(ETHER, user1);
    const joysoEtherBalanceAfter = await joyso.getBalance(ETHER, joysoWallet);
    const user1AccountEtherBalanceAfter = await web3.eth.getBalance(user1);

    assert.equal(user1EtherBalance - user1EtherBalanceAfter, helper.ether(0.52));
    assert.equal(user1AccountEtherBalanceAfter - user1AccountEtherBalance, helper.ether(0.5));
    assert.equal(joysoEtherBalanceAfter - joysoEtherBalance, helper.ether(0.02));
  });

  it('withdraw token, pay by JOY', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);
    const joy = await TestToken.at(temp[2]);

    const user1TokenBalance = await joyso.getBalance(token.address, user1);
    const user1JoyBalance = await joyso.getBalance(joy.address, user1);
    const joysoJoyBalance = await joyso.getBalance(joy.address, joysoWallet);
    const user1AccountTokenBalance = await token.balanceOf(user1);

    const inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 1, token.address, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    const user1TokenBalanceAfter = await joyso.getBalance(token.address, user1);
    const user1JoyBalanceAfter = await joyso.getBalance(joy.address, user1);
    const joysoJoyBalanceAfter = await joyso.getBalance(joy.address, joysoWallet);
    const user1AccountTokenBalanceAfter = await token.balanceOf(user1);

    assert.equal(user1TokenBalance - user1TokenBalanceAfter, helper.ether(0.5));
    assert.equal(user1JoyBalance - user1JoyBalanceAfter, helper.ether(0.02));
    assert.equal(user1AccountTokenBalanceAfter - user1AccountTokenBalance, helper.ether(0.5));
    assert.equal(joysoJoyBalanceAfter - joysoJoyBalance, helper.ether(0.02));
  });

  it('withdraw joy, pay by JOY', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const joy = await TestToken.at(temp[2]);

    const inputs = await helper.generateWithdraw(430743357366569795, 2000000000000000, 1, joy.address, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });
  });

  it('withdraw ether, pay by JOY', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);

    const user1AccountEtherBalanceOriginal = await web3.eth.getBalance(user1);
    const inputs = await helper.generateWithdraw(helper.ether(0.5), 2000000000000000, 1, ETHER, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    const user1EtherBalance = await joyso.getBalance(ETHER, user1);
    const user1AccountEtherBalance = await web3.eth.getBalance(user1);
    assert.equal(user1AccountEtherBalance - user1AccountEtherBalanceOriginal, helper.ether(0.5), 'account ether balance should be equal');
    assert.equal(user1EtherBalance, helper.ether(0.5), 'contract ether balance should be equal');
  });

  it('withdraw token, pay by token', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const user1TokenBalance = await joyso.getBalance(token.address, user1);
    const user1AccountTokenBalance = await token.balanceOf(user1);
    const joysoTokenBalance = await joyso.getBalance(token.address, joysoWallet);

    const inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 2, token.address, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    const user1TokenBalanceAfter = await joyso.getBalance(token.address, user1);
    const user1AccountTokenBalanceAfter = await token.balanceOf(user1);
    const joysoTokenBalanceAfter = await joyso.getBalance(token.address, joysoWallet);

    assert.equal(user1TokenBalance - user1TokenBalanceAfter, helper.ether(0.52));
    assert.equal(joysoTokenBalanceAfter - joysoTokenBalance, helper.ether(0.02));
    assert.equal(user1AccountTokenBalanceAfter - user1AccountTokenBalance, helper.ether(0.5));
  });

  it('it should fail if use the same withdraw hash', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const joy = await TestToken.at(temp[2]);

    const inputs = await helper.generateWithdraw(430743357366569795, 2000000000000000, 1, joy.address, user1, joyso.address);
    await joyso.withdrawByAdmin(inputs, { from: admin });

    try {
      await joyso.withdrawByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('it should fail if the signature is wrong', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const joy = await TestToken.at(temp[2]);

    const inputs = await helper.generateWithdraw(430743357366569795, 2000000000000000, 1, joy.address, user1, joyso.address);
    inputs[4] = 12345; // s

    try {
      await joyso.withdrawByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('withdraw token, pay by ether. Should fail if no token balance.', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = await helper.generateWithdraw(helper.ether(2), helper.ether(0.02), 0, token.address, user1, joyso.address);

    try {
      await joyso.withdrawByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('withdraw token, pay by ether. Should fail if no ether balance.', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    const inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(2), 0, token.address, user1, joyso.address);

    try {
      await joyso.withdrawByAdmin(inputs, { from: admin });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });
});
