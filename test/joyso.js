
'use strict'

//const Joyso = artifacts.require("./Joyso.sol");
const Joyso = artifacts.require("./Joyso.sol")
const TestToken = artifacts.require("./TestToken.sol")
const util = require("ethereumjs-util")
const ABI = require('ethereumjs-abi')
const _ = require('lodash')

contract('Joyso', function (accounts) {

    var admin = accounts[0]
    var user1 = accounts[1]
    var user2 = accounts[2]
    var user3 = accounts[3]
    var debug = 1
    var joysoWallet = accounts[4]
    var ONE = web3.toWei(1, 'ether')
    var GASFEE = web3.toWei(0.001, 'ether')
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
            var temp = dataWithoutV.substring(0, 25)
            temp += '1'
            temp += dataWithoutV.substring(26, 66)
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

    it("withdrawbyAdmin --> 領TOKEN, 用ETHER付Fee", async function () {
        Log("*************************** Start test1 *******************************")
        var joyso = await Joyso.new(joysoWallet, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, ONE, {from:admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user1})
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(user1_token_balance, ONE)
        assert.equal(user1_ether_balance, ONE)

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
        var data = "0x11234567"
        data += _.padStart('0', 16, '0')
        Log(token.address)
        var temp = String(token.address).substring(2, 44)
        Log("temp: " + temp)
        data += _.padStart(temp, 40, '0')
        Log("signed data: " + data)
        var msg = await joyso.getWithdrawDataHash.call(ONE/2, GASFEE, data)
        Log('msg: ' + msg)
        var sig = web3.eth.sign(user1, msg).slice(2)
        Log('sig: ' + sig)
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
        var inputs = []
        inputs.push(ONE/2)
        inputs.push(GASFEE)
        var tokenID = await joyso.address2Id.call(token.address) // ether token id
        var userID = await joyso.address2Id.call(user1) // user1 user id
        var dataV = genInputData(data, v, tokenID, userID)
        inputs.push(dataV)
        inputs.push(r)
        inputs.push(s)

        // check sign information, this is used to test the input data
        // and parse function in the contract. 
        Log("dataV: " + dataV)
        Log("token.address: " + token.address)
        const data_checked_in_the_contract = await joyso.genUserSignedWithdrawData.call(dataV, token.address)
        Log("data checked in the contract: " + data_checked_in_the_contract.toString(16))
        var hash_in_the_contract = await joyso.getWithdrawDataHash.call(ONE/2, GASFEE, data_checked_in_the_contract)
        Log("hash in the contract: " + hash_in_the_contract.toString(16))

        await joyso.withdrawByAdmin(inputs, {from:admin})

        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        Log("ether balance: " + user1_ether_balance)
        Log("token balance: " + user1_token_balance)
        assert.equal(user1_token_balance, ONE/2)
        assert.equal(user1_ether_balance, ONE - GASFEE)            
    })

    it("withdrawbyAdmin --> 領ETHER, 用ETHER付Fee", async function () {
        Log("*************************** Start test2 *******************************")
        var joyso = await Joyso.new(joysoWallet, {from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        assert.equal(user1_ether_balance, ONE)

        // user1 sign the withdraw msg
        /*
            -----------------------------------
            user withdraw singature (uint256)
            (this.address, amount, gasFee, data)
            -----------------------------------
            data [0 .. 9] (uint256) nonce --> does not used when withdraw
            data [23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            data [24..63] (address) tokenAddress
        */
        var data = "0x0123456788"
        data += _.padStart('0', 14, '0')
        var temp = String(0).substring(2, 44)
        Log("temp: " + temp)
        data += _.padStart(temp, 40, '0')
        Log("signed data: " + data)
        var msg = await joyso.getWithdrawDataHash.call(ONE/2, GASFEE, data)
        const sig = web3.eth.sign(user1, util.bufferToHex(msg))
        const {v, r, s} = util.fromRpcSig(sig)

        // withdraw input
        /*
            inputs[0] (uint256) amount;
            inputs[1] (uint256) gasFee;
            inputs[2] (uint256) dataV
            inputs[3] (bytes32) r
            inputs[4] (bytes32) s
            -----------------------------------
            dataV[0 .. 9] (uint256) nonce --> doesnt used when withdraw
            dataV[23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            dataV[24..24] (uint256) v --> 0:27, 1:28 should be uint8 when used
            dataV[52..55] (uint256) tokenId
            dataV[56..63] (uint256) userId        
        */
        var inputs = []
        inputs.push(ONE/2)
        inputs.push(GASFEE)
        var tokenID = await joyso.address2Id.call(0) // ether token id
        var userID = await joyso.address2Id.call(user1) // user1 user id
        var dataV = genInputData(data, v, tokenID, userID)
        inputs.push(dataV)
        inputs.push(util.bufferToHex(r))
        inputs.push(util.bufferToHex(s))
        var v_256 = await joyso.retrieveV.call(dataV)
        Log("v_256: " + v_256)
        Log(inputs)

        // check sign information, this is used to test the input data
        // and parse function in the contract. 
        Log("dataV: " + dataV)
        const data_checked_in_the_contract = await joyso.genUserSignedWithdrawData.call(dataV, 0)
        Log("data checked in the contract: " + data_checked_in_the_contract.toString(16))
        var hash_in_the_contract = await joyso.getWithdrawDataHash.call(ONE/2, GASFEE, data_checked_in_the_contract)
        Log("hash in the contract: " + hash_in_the_contract.toString(16))

        await joyso.withdrawByAdmin(inputs, {from:admin})

        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        Log("ether balance: " + user1_ether_balance)
        assert.equal(user1_ether_balance, ONE/2 - GASFEE)            
    })

    it("搓合, case1, 詳見 google doc", async function () {
        Log("*************************** Start test3 *******************************")
        var joyso = await Joyso.new(joysoWallet, {from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.depositEther({from: user2, value: ONE})
        var token = await TestToken.new(joysoWallet, {from: admin})
        Log("token address: " + token.address)
        await token.transfer(user1, ONE, {from: admin})
        await token.transfer(user2, ONE, {from: admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await token.approve(joyso.address, ONE, {from: user2})
        await joyso.depositToken(token.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user2})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        assert.equal(user1_ether_balance, ONE)
        assert.equal(user1_token_balance, ONE)
        assert.equal(user2_ether_balance, ONE)
        assert.equal(user2_token_balance, ONE)

        // prepare order 1 
        var order1_amountSell = web3.toWei(0.5, 'ether')
        var order1_amountBuy = web3.toWei(0.5, 'ether')
        var order1_gasFee = web3.toWei(0.01, 'ether')
        var order1_nonce = 0x00000001
        var order1_takerFee = 0x000a
        var order1_makerFee = 0x0014
        var order1_JoyPrice = 0
        var order1_isBuy = ORDER_ISBUY // order1 is buying token, should be 0 when input to the contract 
        var order1_tokenSellId = await joyso.address2Id.call(ETHER)
        var order1_tokenBuyId = await joyso.address2Id.call(token.address)
        var order1_userId = await joyso.address2Id.call(user1)
        var order1_inputDataWithoutV = genOrderInputDataWithoutV(order1_nonce, order1_takerFee, order1_makerFee, order1_JoyPrice, 
                                            order1_tokenSellId, order1_tokenBuyId, order1_userId)
        var order1_letUserSignData = await joyso.genUserSignedOrderData.call(order1_inputDataWithoutV, order1_isBuy, token.address)
        var order1_UserShouldSignIt= await joyso.getOrderDataHash.call(order1_amountSell, order1_amountBuy, order1_gasFee, order1_letUserSignData)
        Log("order1_letUserSignData: " + order1_letUserSignData.toString(16))
        Log("order1_UserShouldSignIt: " + order1_UserShouldSignIt)
        var order1_sig = web3.eth.sign(user1, order1_UserShouldSignIt).slice(2)
        var order1_r = `0x${order1_sig.slice(0, 64)}`
        var order1_s = `0x${order1_sig.slice(64, 128)}`
        var order1_v = web3.toDecimal(order1_sig.slice(128, 130)) + 27
        var order1_inputData = genOrderInputData(order1_inputDataWithoutV, order1_v)

        // prepare order 2 
        var order2_amountSell = web3.toWei(0.5, 'ether')
        var order2_amountBuy = web3.toWei(0.5, 'ether')
        var order2_gasFee = web3.toWei(0.01, 'ether')
        var order2_nonce = 0x00000002
        var order2_takerFee = 0x000a
        var order2_makerFee = 0x0014
        var order2_JoyPrice = 0
        var order2_isBuy = 0 // order2 is selling token, should be 0 when input to the contract 
        var order2_tokenSellId = await joyso.address2Id.call(token.address)
        var order2_tokenBuyId = await joyso.address2Id.call(ETHER)
        var order2_userId = await joyso.address2Id.call(user2)
        var order2_inputDataWithoutV = genOrderInputDataWithoutV(order2_nonce, order2_takerFee, order2_makerFee, order2_JoyPrice, 
                                            order2_tokenSellId, order2_tokenBuyId, order2_userId)
        var order2_letUserSignData = await joyso.genUserSignedOrderData.call(order2_inputDataWithoutV, order2_isBuy, token.address)
        var order2_UserShouldSignIt= await joyso.getOrderDataHash.call(order2_amountSell, order2_amountBuy, order2_gasFee, order2_letUserSignData)
        Log("order2_letUserSignData: " + order2_letUserSignData.toString(16))
        Log("order2_UserShouldSignIt: " + order2_UserShouldSignIt)
        var order2_sig = web3.eth.sign(user2, order2_UserShouldSignIt).slice(2)
        var order2_r = `0x${order2_sig.slice(0, 64)}`
        var order2_s = `0x${order2_sig.slice(64, 128)}`
        var order2_v = web3.toDecimal(order2_sig.slice(128, 130)) + 27
        var order2_inputData = genOrderInputData(order2_inputDataWithoutV, order2_v)

        // prepare matchByAdmin inputs
        var inputs = []
        inputs.push(order1_amountSell)
        inputs.push(order1_amountBuy)
        inputs.push(order1_gasFee)
        inputs.push(order1_inputData)
        inputs.push(order1_r)
        inputs.push(order1_s)
        inputs.push(order2_amountSell)
        inputs.push(order2_amountBuy)
        inputs.push(order2_gasFee)
        inputs.push(order2_inputData)
        inputs.push(order2_r)
        inputs.push(order2_s)

        Log("pre balance: ")
        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        user2_token_balance = await joyso.getBalance.call(token.address, user2)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user2_token_balance: " + user2_token_balance)

        await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})

        Log("after balance: ")
        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        user2_token_balance = await joyso.getBalance.call(token.address, user2)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user2_token_balance: " + user2_token_balance)
        assert.equal(user1_ether_balance, web3.toWei(0.4895, 'ether'))
        assert.equal(user1_token_balance, web3.toWei(1.5, 'ether'))
        assert.equal(user2_ether_balance, web3.toWei(1.489, 'ether'))
        assert.equal(user2_token_balance, web3.toWei(0.5, 'ether'))
    })

    it("搓合, case2, 詳見 google doc", async function () {
        Log("*************************** Start test4 *******************************")
        var joyso = await Joyso.new(joysoWallet, {from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.depositEther({from: user3, value: ONE})
        var token = await TestToken.new(joysoWallet, {from: admin})
        Log("token address: " + token.address)
        await token.transfer(user1, ONE, {from: admin})
        await token.transfer(user2, ONE, {from: admin})
        await token.transfer(user3, ONE, {from: admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await token.approve(joyso.address, ONE, {from: user2})
        await token.approve(joyso.address, ONE, {from: user3})
        await joyso.depositToken(token.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user2})
        await joyso.depositToken(token.address, ONE, {from: user3})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance = await joyso.getBalance.call(token.address, user3)
        assert.equal(user1_ether_balance, ONE)
        assert.equal(user1_token_balance, ONE)
        assert.equal(user2_ether_balance, ONE)
        assert.equal(user2_token_balance, ONE)
        assert.equal(user3_ether_balance, ONE)
        assert.equal(user3_token_balance, ONE)

        // prepare order 1 
        var order1_amountSell = web3.toWei(0.5, 'ether')
        var order1_amountBuy = web3.toWei(0.5, 'ether')
        var order1_gasFee = web3.toWei(0.01, 'ether')
        var order1_nonce = 0x00000001
        var order1_takerFee = 0x0014
        var order1_makerFee = 0x000a
        var order1_JoyPrice = 0
        var order1_isBuy = ORDER_ISBUY // order1 is buying token, should be 0 when input to the contract 
        var order1_tokenSellId = await joyso.address2Id.call(ETHER)
        var order1_tokenBuyId = await joyso.address2Id.call(token.address)
        var order1_userId = await joyso.address2Id.call(user1)
        var order1_inputDataWithoutV = genOrderInputDataWithoutV(order1_nonce, order1_takerFee, order1_makerFee, order1_JoyPrice, 
                                            order1_tokenSellId, order1_tokenBuyId, order1_userId)
        var order1_letUserSignData = await joyso.genUserSignedOrderData.call(order1_inputDataWithoutV, order1_isBuy, token.address)
        var order1_UserShouldSignIt= await joyso.getOrderDataHash.call(order1_amountSell, order1_amountBuy, order1_gasFee, order1_letUserSignData)
        Log("order1_letUserSignData: " + order1_letUserSignData.toString(16))
        Log("order1_UserShouldSignIt: " + order1_UserShouldSignIt)
        var order1_sig = web3.eth.sign(user1, order1_UserShouldSignIt).slice(2)
        var order1_r = `0x${order1_sig.slice(0, 64)}`
        var order1_s = `0x${order1_sig.slice(64, 128)}`
        var order1_v = web3.toDecimal(order1_sig.slice(128, 130)) + 27
        var order1_inputData = genOrderInputData(order1_inputDataWithoutV, order1_v)

        // prepare order 2 
        var order2_amountSell = web3.toWei(0.25, 'ether')
        var order2_amountBuy = web3.toWei(0.25, 'ether')
        var order2_gasFee = web3.toWei(0.01, 'ether')
        var order2_nonce = 0x00000002
        var order2_takerFee = 0x0014
        var order2_makerFee = 0x000a
        var order2_JoyPrice = 0
        var order2_isBuy = 0 // order2 is selling token, should be 0 when input to the contract 
        var order2_tokenSellId = await joyso.address2Id.call(token.address)
        var order2_tokenBuyId = await joyso.address2Id.call(ETHER)
        var order2_userId = await joyso.address2Id.call(user2)
        var order2_inputDataWithoutV = genOrderInputDataWithoutV(order2_nonce, order2_takerFee, order2_makerFee, order2_JoyPrice, 
                                            order2_tokenSellId, order2_tokenBuyId, order2_userId)
        var order2_letUserSignData = await joyso.genUserSignedOrderData.call(order2_inputDataWithoutV, order2_isBuy, token.address)
        var order2_UserShouldSignIt= await joyso.getOrderDataHash.call(order2_amountSell, order2_amountBuy, order2_gasFee, order2_letUserSignData)
        Log("order2_letUserSignData: " + order2_letUserSignData.toString(16))
        Log("order2_UserShouldSignIt: " + order2_UserShouldSignIt)
        var order2_sig = web3.eth.sign(user2, order2_UserShouldSignIt).slice(2)
        var order2_r = `0x${order2_sig.slice(0, 64)}`
        var order2_s = `0x${order2_sig.slice(64, 128)}`
        var order2_v = web3.toDecimal(order2_sig.slice(128, 130)) + 27
        var order2_inputData = genOrderInputData(order2_inputDataWithoutV, order2_v)

        // prepare order 3 
        var order3_amountSell = web3.toWei(0.25, 'ether')
        var order3_amountBuy = web3.toWei(0.25, 'ether')
        var order3_gasFee = web3.toWei(0.01, 'ether')
        var order3_nonce = 0x00000002
        var order3_takerFee = 0x0014
        var order3_makerFee = 0x000a
        var order3_JoyPrice = 0
        var order3_isBuy = 0 // order2 is selling token, should be 0 when input to the contract 
        var order3_tokenSellId = await joyso.address2Id.call(token.address)
        var order3_tokenBuyId = await joyso.address2Id.call(ETHER)
        var order3_userId = await joyso.address2Id.call(user3)
        var order3_inputDataWithoutV = genOrderInputDataWithoutV(order3_nonce, order3_takerFee, order3_makerFee, order3_JoyPrice, 
                                            order3_tokenSellId, order3_tokenBuyId, order3_userId)
        var order3_letUserSignData = await joyso.genUserSignedOrderData.call(order3_inputDataWithoutV, order3_isBuy, token.address)
        var order3_UserShouldSignIt= await joyso.getOrderDataHash.call(order3_amountSell, order3_amountBuy, order3_gasFee, order3_letUserSignData)
        Log("order3_letUserSignData: " + order3_letUserSignData.toString(16))
        Log("order3_UserShouldSignIt: " + order3_UserShouldSignIt)
        var order3_sig = web3.eth.sign(user3, order3_UserShouldSignIt).slice(2)
        var order3_r = `0x${order3_sig.slice(0, 64)}`
        var order3_s = `0x${order3_sig.slice(64, 128)}`
        var order3_v = web3.toDecimal(order3_sig.slice(128, 130)) + 27
        var order3_inputData = genOrderInputData(order3_inputDataWithoutV, order3_v)

        // prepare matchByAdmin inputs
        var inputs = []
        inputs.push(order1_amountSell)
        inputs.push(order1_amountBuy)
        inputs.push(order1_gasFee)
        inputs.push(order1_inputData)
        inputs.push(order1_r)
        inputs.push(order1_s)
        inputs.push(order2_amountSell)
        inputs.push(order2_amountBuy)
        inputs.push(order2_gasFee)
        inputs.push(order2_inputData)
        inputs.push(order2_r)
        inputs.push(order2_s)
        inputs.push(order3_amountSell)
        inputs.push(order3_amountBuy)
        inputs.push(order3_gasFee)
        inputs.push(order3_inputData)
        inputs.push(order3_r)
        inputs.push(order3_s)

        Log("pre balance: ")
        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        user2_token_balance = await joyso.getBalance.call(token.address, user2)
        user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        user3_token_balance = await joyso.getBalance.call(token.address, user3)
        var joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("user3_ether_balance: " + user3_ether_balance)
        Log("user3_token_balance: " + user3_token_balance)
        Log("joysoWallet ether: " +  joysoWallet_balance)

        await joyso.matchByAdmin(inputs, {from: admin})

        Log("after balance: ")
        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        user2_token_balance = await joyso.getBalance.call(token.address, user2)
        user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        user3_token_balance = await joyso.getBalance.call(token.address, user3)
        joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("user3_ether_balance: " + user3_ether_balance)
        Log("user3_token_balance: " + user3_token_balance)
        Log("joysoWallet ether: " +  joysoWallet_balance)
        assert.equal(user1_ether_balance, web3.toWei(0.489, 'ether'))
        assert.equal(user1_token_balance, web3.toWei(1.5, 'ether'))
        assert.equal(user2_ether_balance, web3.toWei(1.23975, 'ether'))
        assert.equal(user2_token_balance, web3.toWei(0.75, 'ether'))
        assert.equal(user3_ether_balance, web3.toWei(1.23975, 'ether'))
        assert.equal(user3_token_balance, web3.toWei(0.75, 'ether'))
        assert.equal(joysoWallet_balance, web3.toWei(0.0315, 'ether'))
    })

    it("搓合, case3, 詳見 google doc", async function () {
        Log("*************************** Start test5 *******************************")
        var joyso = await Joyso.new(joysoWallet, {from: admin})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.depositEther({from: user2, value: ONE})
        var token = await TestToken.new(joysoWallet, {from: admin})
        Log("token address: " + token.address)
        await token.transfer(user1, ONE, {from: admin})
        await token.transfer(user2, ONE, {from: admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await token.approve(joyso.address, ONE, {from: user2})
        await joyso.depositToken(token.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user2})
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        assert.equal(user1_ether_balance, ONE)
        assert.equal(user1_token_balance, ONE)
        assert.equal(user2_ether_balance, ONE)
        assert.equal(user2_token_balance, ONE)

        // prepare order 1 
        var order1_amountSell = web3.toWei(0.000112 , 'ether')
        var order1_amountBuy = web3.toWei(0.000000000007, 'ether')
        var order1_gasFee = web3.toWei(0.000001, 'ether')
        var order1_nonce = 0x5a41e89b
        var order1_takerFee = 0x0014
        var order1_makerFee = 0x000a
        var order1_JoyPrice = 0
        var order1_isBuy = ORDER_ISBUY // order1 is buying token, should be 0 when input to the contract 
        var order1_tokenSellId = await joyso.address2Id.call(ETHER)
        var order1_tokenBuyId = await joyso.address2Id.call(token.address)
        var order1_userId = await joyso.address2Id.call(user1)
        var order1_inputDataWithoutV = genOrderInputDataWithoutV(order1_nonce, order1_takerFee, order1_makerFee, order1_JoyPrice, 
                                            order1_tokenSellId, order1_tokenBuyId, order1_userId)
        //var order1_letUserSignData = await joyso.genUserSignedOrderData.call(order1_inputDataWithoutV, order1_isBuy, token.address)
        var order1_letUserSignData = genOrderDataInUserSigned(order1_inputDataWithoutV.toString(16), order1_isBuy, token.address)
        var order1_UserShouldSignIt= await joyso.getOrderDataHash.call(order1_amountSell, order1_amountBuy, order1_gasFee, order1_letUserSignData)
        Log("order1_letUserSignData: " + order1_letUserSignData.toString(16))
        Log("order1_letUserSignData: " + order1_letUserSignData)
        Log("order1_UserShouldSignIt: " + order1_UserShouldSignIt)
        var order1_sig = web3.eth.sign(user1, order1_UserShouldSignIt).slice(2)
        var order1_r = `0x${order1_sig.slice(0, 64)}`
        var order1_s = `0x${order1_sig.slice(64, 128)}`
        var order1_v = web3.toDecimal(order1_sig.slice(128, 130)) + 27
        var order1_inputData = genOrderInputData(order1_inputDataWithoutV, order1_v)

        // prepare order 2 
        var order2_amountSell = web3.toWei(0.000000000001, 'ether')
        var order2_amountBuy = web3.toWei(0.00001, 'ether')
        var order2_gasFee = web3.toWei(0.000001, 'ether')
        var order2_nonce = 0x5a41e7ba
        var order2_takerFee = 0x0014
        var order2_makerFee = 0x000a
        var order2_JoyPrice = 0
        var order2_isBuy = 0 // order2 is selling token, should be 0 when input to the contract 
        var order2_tokenSellId = await joyso.address2Id.call(token.address)
        var order2_tokenBuyId = await joyso.address2Id.call(ETHER)
        var order2_userId = await joyso.address2Id.call(user2)
        var order2_inputDataWithoutV = genOrderInputDataWithoutV(order2_nonce, order2_takerFee, order2_makerFee, order2_JoyPrice, 
                                            order2_tokenSellId, order2_tokenBuyId, order2_userId)
        var order2_letUserSignData = await joyso.genUserSignedOrderData.call(order2_inputDataWithoutV, order2_isBuy, token.address)
        var order2_UserShouldSignIt= await joyso.getOrderDataHash.call(order2_amountSell, order2_amountBuy, order2_gasFee, order2_letUserSignData)
        Log("order2_letUserSignData: " + order2_letUserSignData.toString(16))
        Log("order2_UserShouldSignIt: " + order2_UserShouldSignIt)
        var order2_sig = web3.eth.sign(user2, order2_UserShouldSignIt).slice(2)
        var order2_r = `0x${order2_sig.slice(0, 64)}`
        var order2_s = `0x${order2_sig.slice(64, 128)}`
        var order2_v = web3.toDecimal(order2_sig.slice(128, 130)) + 27
        var order2_inputData = genOrderInputData(order2_inputDataWithoutV, order2_v)

        // prepare order 3 
        var order3_amountSell = web3.toWei(0.000000000005, 'ether')
        var order3_amountBuy = web3.toWei(0.000075, 'ether')
        var order3_gasFee = web3.toWei(0.000001, 'ether')
        var order3_nonce = 0x5a41e7e0
        var order3_takerFee = 0x0014
        var order3_makerFee = 0x000a
        var order3_JoyPrice = 0
        var order3_isBuy = 0 // order2 is selling token, should be 0 when input to the contract 
        var order3_tokenSellId = await joyso.address2Id.call(token.address)
        var order3_tokenBuyId = await joyso.address2Id.call(ETHER)
        var order3_userId = await joyso.address2Id.call(user2)
        var order3_inputDataWithoutV = genOrderInputDataWithoutV(order3_nonce, order3_takerFee, order3_makerFee, order3_JoyPrice, 
                                            order3_tokenSellId, order3_tokenBuyId, order3_userId)
        var order3_letUserSignData = await joyso.genUserSignedOrderData.call(order3_inputDataWithoutV, order3_isBuy, token.address)
        var order3_UserShouldSignIt= await joyso.getOrderDataHash.call(order3_amountSell, order3_amountBuy, order3_gasFee, order3_letUserSignData)
        Log("order3_letUserSignData: " + order3_letUserSignData.toString(16))
        Log("order3_UserShouldSignIt: " + order3_UserShouldSignIt)
        var order3_sig = web3.eth.sign(user2, order3_UserShouldSignIt).slice(2)
        var order3_r = `0x${order3_sig.slice(0, 64)}`
        var order3_s = `0x${order3_sig.slice(64, 128)}`
        var order3_v = web3.toDecimal(order3_sig.slice(128, 130)) + 27
        var order3_inputData = genOrderInputData(order3_inputDataWithoutV, order3_v)

        // prepare matchByAdmin inputs
        var inputs = []
        inputs.push(order1_amountSell)
        inputs.push(order1_amountBuy)
        inputs.push(order1_gasFee)
        inputs.push(order1_inputData)
        inputs.push(order1_r)
        inputs.push(order1_s)
        inputs.push(order2_amountSell)
        inputs.push(order2_amountBuy)
        inputs.push(order2_gasFee)
        inputs.push(order2_inputData)
        inputs.push(order2_r)
        inputs.push(order2_s)
        inputs.push(order3_amountSell)
        inputs.push(order3_amountBuy)
        inputs.push(order3_gasFee)
        inputs.push(order3_inputData)
        inputs.push(order3_r)
        inputs.push(order3_s)

        Log("pre balance: ")
        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("joysoWallet ether: " +  joysoWallet_balance)

        await joyso.matchByAdmin(inputs, {from: admin})

        Log("after balance: ")
        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        user1_token_balance = await joyso.getBalance.call(token.address, user1)
        user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        user2_token_balance = await joyso.getBalance.call(token.address, user2)
        joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("joysoWallet ether: " +  joysoWallet_balance)
        assert.equal(user1_ether_balance, web3.toWei(0.99991383, 'ether'), "user1_ether_balance")
        assert.equal(user1_token_balance, web3.toWei(1.000000000006, 'ether'), "user1 token balance")
        assert.equal(user2_ether_balance, web3.toWei(1.000082915, 'ether'), "user2 ether balance")
        assert.equal(user2_token_balance, web3.toWei(0.999999999994, 'ether'), "user2 token balance")
        assert.equal(joysoWallet_balance, web3.toWei(0.00000325, 'ether'), "joysoWallet ether balance")
    })
})
