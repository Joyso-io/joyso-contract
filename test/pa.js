'use strict';

const Joyso = artifacts.require('./Joyso.sol');
const TestToken = artifacts.require('./TestToken.sol');
const helper = require('./helper.js');

contract('gas analysis', accounts => {
  const admin = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const ETHER = '0x0000000000000000000000000000000000000000';
  const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

  it('case 1 ', async () => {
    const temp = await helper.setupEnvironment();
    const joyso = await Joyso.at(temp[0]);
    const token = await TestToken.at(temp[1]);

    for (let i = 0; i < 50; i++) {
      await joyso.increaseQueue.sendTransaction({ from: admin, gas: 4700000 });
    }

    let inputs = [];
    let order1 = await helper.generateOrder(helper.ether(0.005), helper.ether(0.005), helper.ether(0.001),
      0x0000001, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    Array.prototype.push.apply(inputs, order1);

    let order2 = await helper.generateOrder(helper.ether(0.005), helper.ether(0.005), helper.ether(0.001),
      0x0000002, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order2);

    let tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    let txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('2 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.005), helper.ether(0.005), helper.ether(0.0001), 3, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 4, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 5, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('3 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.005), helper.ether(0.005), helper.ether(0.0001), 6, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 7, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 8, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 9, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('4 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.005), helper.ether(0.005), helper.ether(0.0001), 10, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 11, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 12, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 13, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order5 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 14, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    Array.prototype.push.apply(inputs, order5);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('5 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.005), helper.ether(0.005), helper.ether(0.0001), 15, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 16, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 17, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 18, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order5 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 19, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order6 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 20, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    Array.prototype.push.apply(inputs, order5);
    Array.prototype.push.apply(inputs, order6);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('6 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.006), helper.ether(0.006), helper.ether(0.0001), 21, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 22, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 23, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 24, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order5 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 25, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order6 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 26, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order7 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 27, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    Array.prototype.push.apply(inputs, order5);
    Array.prototype.push.apply(inputs, order6);
    Array.prototype.push.apply(inputs, order7);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('7 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.007), helper.ether(0.007), helper.ether(0.0001), 28, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 29, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 30, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 31, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order5 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 32, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order6 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 33, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order7 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 34, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order8 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 35, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    Array.prototype.push.apply(inputs, order5);
    Array.prototype.push.apply(inputs, order6);
    Array.prototype.push.apply(inputs, order7);
    Array.prototype.push.apply(inputs, order8);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('8 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.008), helper.ether(0.008), helper.ether(0.0001), 36, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 37, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 38, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 39, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order5 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 40, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order6 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 41, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order7 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 42, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order8 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 43, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    let order9 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 44, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    Array.prototype.push.apply(inputs, order5);
    Array.prototype.push.apply(inputs, order6);
    Array.prototype.push.apply(inputs, order7);
    Array.prototype.push.apply(inputs, order8);
    Array.prototype.push.apply(inputs, order9);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('9 order match: ' + txReceipt.gasUsed);

    inputs = [];
    order1 = await helper.generateOrder(helper.ether(0.009), helper.ether(0.009), helper.ether(0.0001), 45, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address);
    order2 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 46, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order3 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 47, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order4 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 48, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order5 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 49, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order6 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 50, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order7 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 51, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order8 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 52, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    order9 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 53, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    const order10 = await helper.generateOrder(helper.ether(0.001), helper.ether(0.001), helper.ether(0.0001), 54, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address);
    Array.prototype.push.apply(inputs, order1);
    Array.prototype.push.apply(inputs, order2);
    Array.prototype.push.apply(inputs, order3);
    Array.prototype.push.apply(inputs, order4);
    Array.prototype.push.apply(inputs, order5);
    Array.prototype.push.apply(inputs, order6);
    Array.prototype.push.apply(inputs, order7);
    Array.prototype.push.apply(inputs, order8);
    Array.prototype.push.apply(inputs, order9);
    Array.prototype.push.apply(inputs, order10);
    tx = await joyso.matchByAdmin_TwH36.sendTransaction(inputs, { from: admin, gas: 4700000 });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('10 order match: ' + txReceipt.gasUsed);

    inputs = [];
    inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, ETHER, user1, joyso.address);
    tx = await joyso.withdrawByAdmin_Unau.sendTransaction(inputs, { from: admin });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('withdraw by admin (ether): ' + txReceipt.gasUsed);

    inputs = [];
    inputs = await helper.generateWithdraw(helper.ether(0.5), helper.ether(0.02), 0, token.address, user1, joyso.address);
    tx = await joyso.withdrawByAdmin_Unau.sendTransaction(inputs, { from: admin });
    txReceipt = await web3.eth.getTransactionReceipt(tx);
    console.log('withdraw by admin (token): ' + txReceipt.gasUsed);
  });
});
