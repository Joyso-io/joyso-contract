'use strict';

const Joyso = artifacts.require('./JoysoMock.sol');
const TestToken = artifacts.require('./TestToken.sol');
const helper = require('./helper.js');

contract('Joyso mock', accounts => {
  const user1 = accounts[1];
  const ETHER = '0x0000000000000000000000000000000000000000';

  it('withdraw ether directly by user', async () => {
    const temp = await helper.setupMockEnvironment();
    const joyso = await Joyso.at(temp[0]);

    await joyso.lockMe({ from: user1 });
    const currentTime = await joyso.getTime.call();
    const lockPeriod = await joyso.lockPeriod.call();
    await joyso.setTime(currentTime + lockPeriod + 1);
    const user1EtherBalance = await joyso.getBalance.call(ETHER, user1);
    const user1EtherAccountBalance = await web3.eth.getBalance(user1);
    await joyso.withdraw(ETHER, helper.ether(0.5), { from: user1 });
    const user1EtherBalanceAfter = await joyso.getBalance.call(ETHER, user1);
    const user1EtherAccountBalanceAfter = await web3.eth.getBalance(user1);
    assert.equal(user1EtherBalance - user1EtherBalanceAfter, helper.ether(0.5));
    assert.isBelow(user1EtherAccountBalanceAfter - user1EtherAccountBalance, helper.ether(0.5));
    assert.isAbove(user1EtherAccountBalanceAfter - user1EtherAccountBalance, helper.ether(0.45));
  });

  it('withdraw token directly by user', async () => {
    const temp = await helper.setupMockEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    await joyso.lockMe({ from: user1 });
    const currentTime = await joyso.getTime.call();
    const lockPeriod = await joyso.lockPeriod.call();
    await joyso.setTime(currentTime + lockPeriod + 1);
    const user1EtherAccountBalance = await web3.eth.getBalance(user1);
    const user1TokenBalance = await joyso.getBalance.call(token.address, user1);
    const user1TokenAccountBalance = await token.balanceOf.call(user1);
    await joyso.withdraw(token.address, helper.ether(0.5), { from: user1 });
    const user1EtherAccountBalanceAfter = await web3.eth.getBalance(user1);
    const user1TokenBalanceAfter = await joyso.getBalance.call(token.address, user1);
    const user1TokenAccountBalanceAfter = await token.balanceOf.call(user1);
    assert.equal(user1TokenBalance - user1TokenBalanceAfter, helper.ether(0.5));
    assert.equal(user1TokenAccountBalanceAfter - user1TokenAccountBalance, helper.ether(0.5));
    assert.isBelow(user1EtherAccountBalanceAfter, user1EtherAccountBalance);
    assert.isBelow(user1EtherAccountBalance - user1EtherAccountBalanceAfter, helper.ether(0.1));
  });

  it('unlockMe should reset the user lock', async () => {
    const temp = await helper.setupMockEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    await joyso.lockMe({ from: user1 });
    const currentTime = await joyso.getTime.call();
    const lockPeriod = await joyso.lockPeriod.call();
    await joyso.setTime(currentTime + lockPeriod / 2 + 1);
    await joyso.unlockMe({ from: user1 });
    await joyso.setTime(currentTime + lockPeriod + 1);
    try {
      await joyso.withdraw(token.address, helper.ether(0.5), { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('withdraw ether should fail if no balance', async () => {
    const temp = await helper.setupMockEnvironment();
    const joyso = await Joyso.at(temp[0]);

    await joyso.lockMe({ from: user1 });
    const currentTime = await joyso.getTime.call();
    const lockPeriod = await joyso.lockPeriod.call();
    await joyso.setTime(currentTime + lockPeriod + 1);
    try {
      await joyso.withdraw(ETHER, helper.ether(2), { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('withdraw token should fail if no balance', async () => {
    const temp = await helper.setupMockEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    await joyso.lockMe({ from: user1 });
    const currentTime = await joyso.getTime.call();
    const lockPeriod = await joyso.lockPeriod.call();
    await joyso.setTime(currentTime + lockPeriod + 1);
    try {
      await joyso.withdraw(token.address, helper.ether(2), { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });

  it('withdraw directly should fail', async () => {
    const temp = await helper.setupMockEnvironment();
    const joyso = await Joyso.at(temp[0]);

    try {
      await joyso.withdraw(ETHER, helper.ether(0.5), { from: user1 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  });
});
