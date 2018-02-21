'use strict'

//const Joyso = artifacts.require("./Joyso.sol");
//const assertRevert = require("../test/helper/assertRevert")
const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso', function (accounts) {

    const admin = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const debug = 1
    const joysoWallet = accounts[4]
    const ONE = web3.toWei(1, 'ether')
    const GASFEE = web3.toWei(0.001, 'ether')
    const ETHER = "0x0000000000000000000000000000000000000000"
    const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;

    const genInputData = function (data, v, tokenID, userID) {
        Log("================= entering genInputData ==================\n")
        Log("data: " + data)
        Log("v: " + v)
        Log("tokenID: " + tokenID)
        Log("userID: " + userID)
        var temp = data.substring(0, 26)
        Log("temp:: " + temp)
        if (v == 27) {
            temp += '0'
        } else {
            temp += '1'
        }
        temp += _.padStart('0', 27, '0')
        temp += _.padStart(tokenID.toString(16), 4, '0')
        temp += _.padStart(userID.toString(16), 8, '0')
        Log("dataV: " + temp)
        Log("================== leaving genInputData ===================\n")
        return temp
    }

    const genOrderInputDataWithoutV = function (nonce, takerFee, makerFee, joyPrice, tokenSellId, tokenBuyId, userId) {
        Log("================= entering genOrderInputDataWithoutV ==================\n")
        Log("nonce: " + nonce)
        Log("takerFee: " + takerFee)
        Log("makerFee: " + makerFee)
        Log("joyPrice: " + joyPrice)
        Log("tokenSellId: " + tokenSellId)
        Log("tokenBuyId: " + tokenBuyId)
        Log("userId: " + userId)
        var temp = '0x'
        temp += _.padStart(nonce.toString(16), 8, '0')
        temp += _.padStart(takerFee.toString(16), 4, '0')
        temp += _.padStart(makerFee.toString(16), 4, '0')
        temp += _.padStart(joyPrice.toString(16), 7, '0')
        temp += _.padStart('0', 25, '0')
        temp += _.padStart(tokenSellId.toString(16), 4, '0')
        temp += _.padStart(tokenBuyId.toString(16), 4, '0')
        temp += _.padStart(userId.toString(16), 8, '0')
        Log("result: " + temp)
        Log("================== leaving genInputData ===================\n")
        return temp
    }

    const genOrderDataInUserSigned = function (data, isBuy, tokenAddress) {
        Log("generating the data in the user should signed")
        Log("input data: " + data)
        Log("isBuy: " + isBuy)
        Log("tokenAddress: " + tokenAddress)
        var temp = data.substring(0, 25)
        if (isBuy == ORDER_ISBUY) {
            temp += '1'
        } else {
            temp += '0'
        }
        temp += tokenAddress.substring(2, 42)
        Log("result: " + temp)
        return temp
    }

    const genOrderInputData = function (dataWithoutV, v) {
        Log("================= entering genOrderInputData ==================\n")
        Log("dataWithoutV: " + dataWithoutV)
        Log("v: " + v)
        if (v == 27) {
            var temp = dataWithoutV
        } else {
            var temp = dataWithoutV.substring(0, 26)
            temp += '1'
            temp += dataWithoutV.substring(27, 66)
        }

        Log("result: " + temp)
        Log("================== leaving genInputData ===================\n")
        return temp        
    }

    const Log = function (log) {
        if (debug == 1) {
            console.log(log)
        } else {
            return true
        }
    }

    const generateOrder = async function (amountSell, amountBuy, gasFee, nonce, takerFee, makerFee, 
    joyPrice, isBuy, tokenSell, tokenBuy, user, joysoAddress) {
        var array = []
        var joyso = await Joyso.at(joysoAddress)
        var tokenSellId = await joyso.address2Id.call(tokenSell)
        var tokenBuyId = await joyso.address2Id.call(tokenBuy)
        var token = tokenSell
        if(isBuy == ORDER_ISBUY) {
            token = tokenBuy
        }
        var userId = await joyso.address2Id.call(user)
        var inputDataWithoutV = genOrderInputDataWithoutV(nonce, takerFee, makerFee, joyPrice, 
            tokenSellId, tokenBuyId, userId)
        //var letUserSignData = await joyso.genUserSignedOrderData.call(inputDataWithoutV, isBuy, token)
        var letUserSignData = genOrderDataInUserSigned(inputDataWithoutV, isBuy, token) 
        var userShouldSignIt = await joyso.getOrderDataHash.call(amountSell, amountBuy, gasFee, letUserSignData)
        var sig = web3.eth.sign(user, userShouldSignIt).slice(2)
        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.toDecimal(sig.slice(128, 130)) + 27
        var inputData = genOrderInputData(inputDataWithoutV, v)
        array[0] = amountSell
        array[1] = amountBuy
        array[2] = gasFee
        array[3] = inputData
        array[4] = r
        array[5] = s
        return array
    }

    const displayTheBalance = async function (joysoAddress, tokenAddress, joyAddress) {
        var joyso = await Joyso.at(joysoAddress)
        var token = await TestToken.at(tokenAddress)
        var joy = await joyso.joyToken.call();
        console.log("joy token address: " + joy)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        var user1_joy_balance = await joyso.getBalance.call(joy, user1)
        var user2_joy_balance = await joyso.getBalance.call(joy, user2)
        var user3_joy_balance = await joyso.getBalance.call(joy, user3)
        var joyso_joy_balacne = await joyso.getBalance.call(joy, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user3_ether_balance: " + user3_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("user3_token_balance: " + user3_token_balance)
        Log("user1_joy_balance: " + user1_joy_balance)
        Log("user2_joy_balance: " + user2_joy_balance)
        Log("user3_joy_balance: " + user3_joy_balance)
        Log("joyso wallet ether balance: " + joyso_ether_balance) 
        Log("joyso_joy_balance: " + joyso_joy_balacne)     
    }
    
    const setupEnvironment = async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, ONE, {from:admin})
        await token.transfer(user2, ONE, {from:admin})
        await token.transfer(user3, ONE, {from:admin})
        await joy.transfer(user1, ONE, {from: admin})
        await joy.transfer(user2, ONE, {from: admin})
        await joy.transfer(user3, ONE, {from: admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await token.approve(joyso.address, ONE, {from: user2})
        await token.approve(joyso.address, ONE, {from: user3})
        await joy.approve(joyso.address, ONE, {from: user1})
        await joy.approve(joyso.address, ONE, {from: user2})
        await joy.approve(joyso.address, ONE, {from: user3})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.depositEther({from: user3, value: ONE})
        await joyso.depositToken(token.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user2})
        await joyso.depositToken(token.address, ONE, {from: user3})
        await joyso.depositToken(joy.address, ONE, {from: user1})
        await joyso.depositToken(joy.address, ONE, {from: user2})
        await joyso.depositToken(joy.address, ONE, {from: user3})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        array[2] = joy.address
        return array
    }

    const ether = function (amount) {
        return web3.toWei(amount, 'ether')
    }

    const generateWithdraw = async function (amount, gasFee, paymentMethod, tokenAddress, userAddress, joysoAddress) {
        var array = []
        var joyso = await Joyso.at(joysoAddress)

        // user1 sign the withdraw msg
        /*
            -----------------------------------
            user withdraw singature (uint256)
            (this.address, amount, gasFee, data)
            -----------------------------------
            data [0 .. 7] (uint256) nonce --> does not used when withdraw
            data [23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            data [24..63] (address) tokenAddress
        */
        var data = "0x01234567"
        data += _.padStart('0', 15, '0')
        if (paymentMethod == 1) {
            data += '1'
        } else {
            data += '0'
        }

        var temp = String(tokenAddress).substring(2, 44)
        data += _.padStart(temp, 40, '0')
        var msg = await joyso.getWithdrawDataHash.call(amount, gasFee, data)
        var sig = web3.eth.sign(userAddress, msg).slice(2)
        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.toDecimal(sig.slice(128, 130)) + 27
        
        // withdraw input
        /*
            inputs[0] (uint256) amount;
            inputs[1] (uint256) gasFee;
            inputs[2] (uint256) dataV
            inputs[3] (bytes32) r
            inputs[4] (bytes32) s
            -----------------------------------
            dataV[0 .. 7] (uint256) nonce --> doesnt used when withdraw
            dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            dataV[24..24] (uint256) v --> 0:27, 1:28 should be uint8 when used
            dataV[52..55] (uint256) tokenId
            dataV[56..63] (uint256) userId        
        */

        var tokenId = await joyso.address2Id.call(tokenAddress)
        var userId = await joyso.address2Id.call(userAddress)

        var temp2 = data.substring(0, 26)
        if (v == 27) {
            temp2 += '0'
        } else {
            temp2 += '1'
        }
        temp2 += _.padStart('0', 27, '0')
        temp2 += _.padStart(tokenId.toString(16), 4, '0')
        temp2 += _.padStart(userId.toString(16), 8, '0')
        var dataV = temp2

        array[0] = amount
        array[1] = gasFee
        array[2] = dataV
        array[3] = r
        array[4] = s
        return array
    }

})