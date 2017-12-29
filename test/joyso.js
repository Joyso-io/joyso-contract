
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

    const displayTheBalance = async function (joysoAddress, tokenAddress) {
        var joyso = await Joyso.at(joysoAddress)
        var token = await TestToken.at(tokenAddress)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance = await joyso.getBalance.call(token.address, user3)
        var joyso_ether_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        Log("user1_ether_balance: " + user1_ether_balance)
        Log("user2_ether_balance: " + user2_ether_balance)
        Log("user3_ether_balance: " + user3_ether_balance)
        Log("user1_token_balance: " + user1_token_balance)
        Log("user2_token_balance: " + user2_token_balance)
        Log("user3_token_balance: " + user3_token_balance)
        Log("joyso wallet ether balance: " + joyso_ether_balance)      
    }

    const setupEnvironment = async function () {
        var joyso = await Joyso.new(joysoWallet, {from: admin})
        var token = await TestToken.new('tt', 'tt', 18, {from:admin})
        await joyso.registerToken(token.address, 0x57, {from: admin})
        await token.transfer(user1, ONE, {from:admin})
        await token.transfer(user2, ONE, {from:admin})
        await token.transfer(user3, ONE, {from:admin})
        await token.approve(joyso.address, ONE, {from: user1})
        await token.approve(joyso.address, ONE, {from: user2})
        await token.approve(joyso.address, ONE, {from: user3})
        await joyso.depositEther({from: user1, value: ONE})
        await joyso.depositEther({from: user2, value: ONE})
        await joyso.depositEther({from: user3, value: ONE})
        await joyso.depositToken(token.address, ONE, {from: user1})
        await joyso.depositToken(token.address, ONE, {from: user2})
        await joyso.depositToken(token.address, ONE, {from: user3})
        var array = []
        array[0] = joyso.address
        array[1] = token.address
        return array
    }

    const ether = function (amount) {
        return web3.toWei(amount, 'ether')
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
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(web3.toWei(0.5, 'ether'), web3.toWei(0.5, 'ether'), web3.toWei(0.01, 'ether'),
                                    0x0000001, 0x000a, 0x0014, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)

        var order2 = await generateOrder(web3.toWei(0.5, 'ether'), web3.toWei(0.5, 'ether'), web3.toWei(0.01, 'ether'),
                                    0x0000002, 0x000a, 0x0014, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)

        Log("pre balance: ")
        await displayTheBalance(joyso.address, token.address)

        await joyso.matchByAdmin(inputs, {from: admin, gas: 4700000})

        Log("after balance: ")
        await displayTheBalance(joyso.address, token.address)

        var a = await joyso.getBalance.call(ETHER, user1);
        assert.equal(a, web3.toWei(0.4895, 'ether'), 'user1 ether balance')
        var b = await joyso.getBalance.call(token.address, user1)
        assert.equal(b, web3.toWei(1.5, 'ether'), 'user 1 token balance')
        var c = await joyso.getBalance.call(ETHER, user2)
        assert.equal(c, web3.toWei(1.489, 'ether'), 'user2 ether balance')
        var d = await joyso.getBalance.call(token.address, user2)
        assert.equal(d, web3.toWei(0.5, 'ether'), 'user2 token balance')
    })

    it("搓合, case2, 詳見 google doc", async function () {
        Log("*************************** Start test4 *******************************")
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.5), ether(0.5), ether(0.01), 1, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 2, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        var order3 = await generateOrder(ether(0.25), ether(0.25), ether(0.01), 3, 20, 10, 0, 0, token.address, ETHER, user3, joyso.address)
        Array.prototype.push.apply(inputs, order3)

        Log("pre balance: ")
        await displayTheBalance(joyso.address, token.address)

        await joyso.matchByAdmin(inputs, {from: admin})

        Log("after balance: ")
        await displayTheBalance(joyso.address, token.address)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var user3_ether_balance = await joyso.getBalance.call(ETHER, user3)
        var user3_token_balance = await joyso.getBalance.call(token.address, user3)
        var joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
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
        var joyso, token
        var temp = await setupEnvironment()
        joyso = await Joyso.at(temp[0])
        token = await TestToken.at(temp[1])

        var inputs = []
        var order1 = await generateOrder(ether(0.000112), ether(0.000000000007), ether(0.000001), 0x5a41e89b, 20, 10, 0, ORDER_ISBUY, ETHER, token.address, user1, joyso.address)
        Array.prototype.push.apply(inputs, order1)
        var order2 = await generateOrder(ether(0.000000000001), ether(0.00001), ether(0.000001), 0x5a41e7ba, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order2)
        var order3 = await generateOrder(ether(0.000000000005), ether(0.000075), ether(0.000001), 0x5a41e7e0, 20, 10, 0, 0, token.address, ETHER, user2, joyso.address)
        Array.prototype.push.apply(inputs, order3)

        Log("pre balance: ")
        await displayTheBalance(joyso.address, token.address)

        await joyso.matchByAdmin(inputs, {from: admin})

        Log("after balance: ")
        await displayTheBalance(joyso.address, token.address)
        var user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        var user1_token_balance = await joyso.getBalance.call(token.address, user1)
        var user2_ether_balance = await joyso.getBalance.call(ETHER, user2)
        var user2_token_balance = await joyso.getBalance.call(token.address, user2)
        var joysoWallet_balance = await joyso.getBalance.call(ETHER, joysoWallet)
        assert.equal(user1_ether_balance, web3.toWei(0.99991383, 'ether'), "user1_ether_balance")
        assert.equal(user1_token_balance, web3.toWei(1.000000000006, 'ether'), "user1 token balance")
        assert.equal(user2_ether_balance, web3.toWei(1.000082915, 'ether'), "user2 ether balance")
        assert.equal(user2_token_balance, web3.toWei(0.999999999994, 'ether'), "user2 token balance")
        assert.equal(joysoWallet_balance, web3.toWei(0.000003255, 'ether'), "joysoWallet ether balance")
    })

})
