
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
    var debug = 0
    var joysoWallet = accounts[3]
    var ONE = web3.toWei(1, 'ether')
    var GASFEE = web3.toWei(0.001, 'ether')
    const ETHER = "0x0000000000000000000000000000000000000000"

    const genInputData = function (data, v, tokenID, userID) {
        Log("entering genInputData")
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
        Log("leaving genInputData")
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
            data [0 .. 9] (uint256) nonce --> does not used when withdraw
            data [23..23] (uint256) paymentMethod --> 0: ether, 1: JOY, 2: token
            data [24..63] (address) tokenAddress
        */
        var data = "0x0123456789"
        data += _.padStart('0', 14, '0')
        Log(token.address)
        var temp = String(token.address).substring(2, 44)
        Log("temp: " + temp)
        data += _.padStart(temp, 40, '0')
        Log("signed data: " + data)
        var msg = await joyso.getHash.call(ONE/2, GASFEE, data)
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
        var tokenID = await joyso.address2Id.call(token.address) // ether token id
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
        Log("token.address: " + token.address)
        const data_checked_in_the_contract = await joyso.genUserSignedData.call(dataV, token.address)
        Log("data checked in the contract: " + data_checked_in_the_contract.toString(16))
        var hash_in_the_contract = await joyso.getHash.call(ONE/2, GASFEE, data_checked_in_the_contract)
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
        var msg = await joyso.getHash.call(ONE/2, GASFEE, data)
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
        const data_checked_in_the_contract = await joyso.genUserSignedData.call(dataV, 0)
        Log("data checked in the contract: " + data_checked_in_the_contract.toString(16))
        var hash_in_the_contract = await joyso.getHash.call(ONE/2, GASFEE, data_checked_in_the_contract)
        Log("hash in the contract: " + hash_in_the_contract.toString(16))

        await joyso.withdrawByAdmin(inputs, {from:admin})

        user1_ether_balance = await joyso.getBalance.call(ETHER, user1)
        Log("ether balance: " + user1_ether_balance)
        assert.equal(user1_ether_balance, ONE/2 - GASFEE)            
    })


})
