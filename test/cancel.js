'use strict';

const Joyso = artifacts.require('./Joyso.sol');
const TestToken = artifacts.require('./testing/TestToken.sol');
const helper = require('./support/helper.js');

contract('cancel.js', accounts => {
  const admin = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const ETHER = '0x0000000000000000000000000000000000000000';
  let joyso, joy, token;

  beforeEach(async () => {
    const temp = await helper.setupEnvironment();
    joyso = Joyso.at(temp[0]);
    token = TestToken.at(temp[1]);
    joy = TestToken.at(temp[2]);
  });

  it('cancelByAdmin should update the user nonce', async () => {
    const inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address);
    const tx = await joyso.cancelByAdmin.sendTransaction(inputs, { from: admin, gas: 4700000 });
    const txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('gas: ' + txReceipt.gasUsed);

    const user1Nonce = await joyso.userNonce.call(user1);
    assert.equal(user1Nonce, 0x1234);
  });

  it('nonce should more than current nonce', async () => {
    let inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address);
    await joyso.cancelByAdmin(inputs, { from: admin });

    inputs = await helper.generateCancel(helper.ether(0.001), 0x123, 0, user1, joyso.address);
    try {
      await joyso.cancelByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });

  it('pay joy for fee to cancel the order', async () => {
    const joyBalance = await joyso.getBalance(joy.address, user1);

    const inputs = await helper.generateCancel(1000000, 0x1234, 1, user1, joyso.address);
    await joyso.cancelByAdmin(inputs, { from: admin });

    const joyBalance2 = await joyso.getBalance(joy.address, user1);
    assert.equal(joyBalance.sub(joyBalance2), 1000000);
  });

  it('cancel should fail if user\'s signature is wrong', async () => {
    const inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address);
    inputs[3] = 111;

    try {
      await joyso.cancelByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });

  it('cancel should fail if user\'s balance is not enough', async () => {
    let inputs = await helper.generateCancel(helper.ether(10), 0x1234, 0, user1, joyso.address);

    try {
      await joyso.cancelByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }

    inputs = await helper.generateCancel(helper.ether(10), 0x1234, 1, user2, joyso.address);
    try {
      await joyso.cancelByAdmin(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });

  it('match should fail if the taker order\'s nonce is less than userNonce', async () => {
    let inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address);
    await joyso.cancelByAdmin(inputs, { from: admin });

    inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);
    inputs.push(...order1);

    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);

    try {
      await joyso.matchByAdmin_TwH36(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });

  it('match should fail if the maker order\'s nonce is less than userNonce', async () => {
    let inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user2, joyso.address);
    await joyso.cancelByAdmin(inputs, { from: admin });

    inputs = [];
    const order1 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);
    inputs.push(...order1);

    const order2 = await helper.generateOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);

    try {
      await joyso.matchByAdmin_TwH36(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });

  it('tokenMatch should fail if the taker order\'s nonce is less than userNonce', async () => {
    let inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user1, joyso.address);
    await joyso.cancelByAdmin(inputs, { from: admin });

    inputs = [];
    const order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);
    inputs.push(...order1);

    const order2 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);

    try {
      await joyso.matchTokenOrderByAdmin_k44j(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });

  it('match should fail if the maker order\'s nonce is less than userNonce', async () => {
    let inputs = await helper.generateCancel(helper.ether(0.001), 0x1234, 0, user2, joyso.address);
    await joyso.cancelByAdmin(inputs, { from: admin });

    inputs = [];
    const order1 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000001, 20, 10, 0, true, ETHER, token.address, user1, joyso.address);
    inputs.push(...order1);

    const order2 = await helper.generateTokenOrder(helper.ether(0.5), helper.ether(0.5), helper.ether(0.01),
      0x0000002, 20, 10, 0, false, token.address, ETHER, user2, joyso.address);
    inputs.push(...order2);

    try {
      await joyso.matchTokenOrderByAdmin_k44j(inputs, { from: admin, gas: 4700000 });
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected 'revert', got ${error} instead`);
    }
  });
});
