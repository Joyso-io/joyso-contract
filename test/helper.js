'use strict'

const Joyso = artifacts.require("./Joyso.sol")
const JoysoMock = artifacts.require("./JoysoMock.sol")
const TestToken = artifacts.require("./TestToken.sol")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const web3Utils = require('web3-utils')
const _ = require('lodash')

const ETHER = "0x0000000000000000000000000000000000000000"
const ORDER_ISBUY = 1461501637330902918203684832716283019655932542976;
const admin = web3.eth.accounts[0]
const user1 = web3.eth.accounts[1]
const user2 = web3.eth.accounts[2]
const user3 = web3.eth.accounts[3]
const joysoWallet = web3.eth.accounts[4]

const genOrderInputDataWithoutV = function (nonce, takerFee, makerFee, joyPrice, isBuy, tokenSellId, tokenBuyId, userId) {
    var temp = '0x'
    temp += _.padStart(nonce.toString(16), 8, '0')
    temp += _.padStart(takerFee.toString(16), 4, '0')
    temp += _.padStart(makerFee.toString(16), 4, '0')
    temp += _.padStart(joyPrice.toString(16), 7, '0')
    if (isBuy == ORDER_ISBUY) {
        temp += _.padStart('1', 1, '0')
    } else {
        temp += _.padStart('0', 1, '0')
    }
    temp += _.padStart('0', 24, '0')
    temp += _.padStart(tokenSellId.toString(16), 4, '0')
    temp += _.padStart(tokenBuyId.toString(16), 4, '0')
    temp += _.padStart(userId.toString(16), 8, '0')
    return temp
}

const genTokenOrderInputDataWithoutV = function (nonce, takerFee, makerFee, joyPrice, isBuy, tokenSellId, tokenBuyId, userId) {
    var temp = '0x'
    temp += _.padStart(nonce.toString(16), 8, '0')
    temp += _.padStart(takerFee.toString(16), 4, '0')
    temp += _.padStart(makerFee.toString(16), 4, '0')
    //temp += _.padStart(joyPrice.toString(16), 7, '0')
    temp += _.padStart('0', 7, '0')
    if (isBuy == ORDER_ISBUY) {
        temp += _.padStart('1', 1, '0')
    } else {
        temp += _.padStart('0', 1, '0')
    }
    //temp += _.padStart('0', 24, '0')
    temp += _.padStart(joyPrice.toString(16), 24, '0')
    temp += _.padStart(tokenSellId.toString(16), 4, '0')
    temp += _.padStart(tokenBuyId.toString(16), 4, '0')
    temp += _.padStart(userId.toString(16), 8, '0')
    return temp
}

const genOrderDataInUserSigned = function (data, isBuy, tokenAddress) {
    var temp = data.substring(0, 25)
    if (isBuy == ORDER_ISBUY) {
        temp += '1'
    } else {
        temp += '0'
    }
    temp += tokenAddress.substring(2, 42)
    return temp
}

const genOrderInputData = function (dataWithoutV, v) {
    if (v == 27) {
        var temp = dataWithoutV
    } else {
        var temp = dataWithoutV.substring(0, 26)
        temp += '1'
        temp += dataWithoutV.substring(27, 66)
    }

    return temp        
}

module.exports = {
    generateCancel : async function (gasFee, nonce, paymentMethod, user, joysoAddress) {
        var array = []
        var joyso = await Joyso.at(joysoAddress)
        var userId = await joyso.userAddress2Id.call(user)
        var temp = '0x'
        temp += _.padStart(nonce.toString(16), 8, '0')
        temp += _.padStart('0', 15, '0')
        if (paymentMethod == 1) {
          temp += '1'
        } else if (paymentMethod == 2) {
          temp += '2'
        } else {
          temp += '0'
        }
        temp += _.padStart('0', 40, '0')
    
        var msg = await joyso.getCancelDataHash.call(gasFee, temp)
        var sig = web3.eth.sign(user, msg).slice(2)
        var r = `0x${sig.slice(0, 64)}`
        var s = `0x${sig.slice(64, 128)}`
        var v = web3.toDecimal(sig.slice(128, 130)) + 27
    
        var temp2 = temp.substring(0, 26)
        if (v == 27) {
          temp2 += '0'
        } else {
          temp2 += '1'
        }
        temp2 += _.padStart('0', 31, '0')
        temp2 += _.padStart(userId.toString(16), 8, '0')
        var dataV = temp2
    
        array[0] = gasFee
        array[1] = dataV
        array[2] = r
        array[3] = s
        return array
    },
    
    generateWithdraw : async function (amount, gasFee, paymentMethod, tokenAddress, userAddress, joysoAddress) {
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
        } else if (paymentMethod == 2) {
            data += '2'
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

        var tokenId = await joyso.tokenAddress2Id.call(tokenAddress)
        var userId = await joyso.userAddress2Id.call(userAddress)

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
    },

    generateMigrate : async function (gasFee, paymentMethod, tokenAddress, userAddress, joysoAddress, newContractAddress) {
        var array = []
        var joyso = await Joyso.at(joysoAddress)


        // user1 sign the migrate msg
        /*
            -----------------------------------
            user migrate singature (uint256)
            (this.address, newAddress, gasFee, data)
            -----------------------------------
            data [0 .. 7] (uint256) nonce --> does not used when migrate
            data [23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            data [24..63] (address) tokenAddress
        */
        var data = "0x01234567"
        data += _.padStart('0', 15, '0')
        if (paymentMethod == 1) {
            data += '1'
        } else if (paymentMethod == 2) {
            data += '2'
        } else {
            data += '0'
        }

        var temp = String(tokenAddress).substring(2, 44)
        data += _.padStart(temp, 40, '0')
        var msg = await joyso.getMigrateDataHash.call(newContractAddress, gasFee, data)
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
            dataV[0 .. 7] (uint256) nonce --> doesnt used when migrate
            dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            dataV[24..24] (uint256) v --> 0:27, 1:28 should be uint8 when used
            dataV[52..55] (uint256) tokenId
            dataV[56..63] (uint256) userId        
        */

        var tokenId = await joyso.tokenAddress2Id.call(tokenAddress)
        var userId = await joyso.userAddress2Id.call(userAddress)

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

        array[0] = gasFee
        array[1] = dataV
        array[2] = r
        array[3] = s
        return array
    },

    generateOrder : async function (amountSell, amountBuy, gasFee, nonce, takerFee, makerFee, 
        joyPrice, isBuy, tokenSell, tokenBuy, user, joysoAddress) {
            var array = []
            var joyso = await Joyso.at(joysoAddress)
            var tokenSellId = await joyso.tokenAddress2Id.call(tokenSell)
            var tokenBuyId = await joyso.tokenAddress2Id.call(tokenBuy)
            var token = tokenSell
            if(isBuy == ORDER_ISBUY) {
                token = tokenBuy
            }
            var userId = await joyso.userAddress2Id.call(user)
            var inputDataWithoutV = genOrderInputDataWithoutV(nonce, takerFee, makerFee, joyPrice, 0,
                tokenSellId, tokenBuyId, userId)
            //var letUserSignData = await joyso.genUserSignedOrderData.call(inputDataWithoutV, isBuy, token)
            var letUserSignData = genOrderDataInUserSigned(inputDataWithoutV, isBuy, token) 
            //var userShouldSignIt = await joyso.getOrderDataHash.call(amountSell, amountBuy, gasFee, letUserSignData)
            var userShouldSignIt = await web3Utils.soliditySha3({type: "address", value: joyso.address}, 
                                                                amountSell,
                                                                amountBuy,
                                                                gasFee,
                                                                letUserSignData
                                                            )
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
    },

    generateTokenOrder : async function (amountSell, amountBuy, gasFee, nonce, takerFee, makerFee, 
        joyPrice, isBuy, tokenSell, tokenBuy, user, joysoAddress) {
            var array = []
            var joyso = await Joyso.at(joysoAddress)
            var tokenSellId = await joyso.tokenAddress2Id.call(tokenSell)
            var tokenBuyId = await joyso.tokenAddress2Id.call(tokenBuy)
            var userId = await joyso.userAddress2Id.call(user)
            var token = tokenSell
            var baseToken = tokenBuy
            if (isBuy == ORDER_ISBUY) {
                token = tokenBuy
                baseToken = tokenSell
            }
            var inputDataWithoutV = genTokenOrderInputDataWithoutV(nonce, takerFee, makerFee, joyPrice, isBuy,
                tokenSellId, tokenBuyId, userId)
            var letUserSignData = genOrderDataInUserSigned(inputDataWithoutV, isBuy, token) 
            //var userShouldSignIt = await joyso.getOrderDataHash.call(amountSell, amountBuy, gasFee, letUserSignData)
            var userShouldSignIt = await web3Utils.soliditySha3({type: "address", value: joyso.address}, 
                                                                amountSell,
                                                                amountBuy,
                                                                gasFee,
                                                                letUserSignData,
                                                                {type: "address", value: baseToken},
                                                                joyPrice)
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
    },

    setupEnvironment : async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, this.ether(1), {from:admin})
        await token.transfer(user2, this.ether(1), {from:admin})
        await token.transfer(user3, this.ether(1), {from:admin})
        await joy.transfer(user1, this.ether(1), {from: admin})
        await joy.transfer(user2, this.ether(1), {from: admin})
        await joy.transfer(user3, this.ether(1), {from: admin})
        await token.approve(joyso.address, this.ether(1), {from: user1})
        await token.approve(joyso.address, this.ether(1), {from: user2})
        await token.approve(joyso.address, this.ether(1), {from: user3})
        await joy.approve(joyso.address, this.ether(1), {from: user1})
        await joy.approve(joyso.address, this.ether(1), {from: user2})
        await joy.approve(joyso.address, this.ether(1), {from: user3})
        await joyso.depositEther({from: user1, value: this.ether(1)})
        await joyso.depositEther({from: user2, value: this.ether(1)})
        await joyso.depositEther({from: user3, value: this.ether(1)})
        await joyso.depositToken(token.address, this.ether(1), {from: user1})
        await joyso.depositToken(token.address, this.ether(1), {from: user2})
        await joyso.depositToken(token.address, this.ether(1), {from: user3})
        await joyso.depositToken(joy.address, this.ether(1), {from: user1})
        await joyso.depositToken(joy.address, this.ether(1), {from: user2})
        await joyso.depositToken(joy.address, this.ether(1), {from: user3})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        array[2] = joy.address
        return array
    },

    setupMockEnvironment : async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await JoysoMock.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, this.ether(1), {from:admin})
        await token.transfer(user2, this.ether(1), {from:admin})
        await token.transfer(user3, this.ether(1), {from:admin})
        await joy.transfer(user1, this.ether(1), {from: admin})
        await joy.transfer(user2, this.ether(1), {from: admin})
        await joy.transfer(user3, this.ether(1), {from: admin})
        await token.approve(joyso.address, this.ether(1), {from: user1})
        await token.approve(joyso.address, this.ether(1), {from: user2})
        await token.approve(joyso.address, this.ether(1), {from: user3})
        await joy.approve(joyso.address, this.ether(1), {from: user1})
        await joy.approve(joyso.address, this.ether(1), {from: user2})
        await joy.approve(joyso.address, this.ether(1), {from: user3})
        await joyso.depositEther({from: user1, value: this.ether(1)})
        await joyso.depositEther({from: user2, value: this.ether(1)})
        await joyso.depositEther({from: user3, value: this.ether(1)})
        await joyso.depositToken(token.address, this.ether(1), {from: user1})
        await joyso.depositToken(token.address, this.ether(1), {from: user2})
        await joyso.depositToken(token.address, this.ether(1), {from: user3})
        await joyso.depositToken(joy.address, this.ether(1), {from: user1})
        await joyso.depositToken(joy.address, this.ether(1), {from: user2})
        await joyso.depositToken(joy.address, this.ether(1), {from: user3})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        array[2] = joy.address
        return array
    },
    setupEnvironment2 : async function () {
        var joy = await TestToken.new('tt', 'tt', 18, {from: admin})
        var joyso = await Joyso.new(joysoWallet, joy.address, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, this.ether(1), {from:admin})
        await token.transfer(user2, this.ether(1), {from:admin})
        await token.transfer(user3, this.ether(1), {from:admin})
        await joy.transfer(user1, this.ether(1), {from: admin})
        await joy.transfer(user2, this.ether(1), {from: admin})
        await joy.transfer(user3, this.ether(1), {from: admin})
        await token.approve(joyso.address, this.ether(1), {from: user1})
        await token.approve(joyso.address, this.ether(1), {from: user2})
        await token.approve(joyso.address, this.ether(1), {from: user3})
        await joy.approve(joyso.address, this.ether(1), {from: user1})
        await joy.approve(joyso.address, this.ether(1), {from: user2})
        await joy.approve(joyso.address, this.ether(1), {from: user3})
        await joyso.depositEther({from: user2, value: 100000000000000000})
        await joyso.depositToken(token.address, 200000000, {from: user1})
        await joyso.depositToken(joy.address, 1000000000, {from: user1})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        array[2] = joy.address
        return array
    },

    ether : function (amount) {
        return Number(web3.toWei(amount, 'ether'))
    },

    displayTheBalance : async function (joysoAddress, tokenAddress, joyAddress) {
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
        console.log("user1_ether_balance: " + user1_ether_balance)
        console.log("user2_ether_balance: " + user2_ether_balance)
        console.log("user3_ether_balance: " + user3_ether_balance)
        console.log("user1_token_balance: " + user1_token_balance)
        console.log("user2_token_balance: " + user2_token_balance)
        console.log("user3_token_balance: " + user3_token_balance)
        console.log("user1_joy_balance: " + user1_joy_balance)
        console.log("user2_joy_balance: " + user2_joy_balance)
        console.log("user3_joy_balance: " + user3_joy_balance)
        console.log("joyso wallet ether balance: " + joyso_ether_balance) 
        console.log("joyso_joy_balance: " + joyso_joy_balacne)     
    }
}
