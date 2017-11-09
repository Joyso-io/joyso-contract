
'use strict'

const Joyso = artifacts.require("./Joyso.sol");
const TestToken = artifacts.require("./TestToken.sol")

contract('Joyso', function (accounts) {

    it("should have equal balance when deposit ether", function(done) {
        return Joyso.deployed().then(function(instance){
            console.log(instance)
        })
    })
})
