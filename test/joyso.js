var Joyso = artifacts.require("./Joyso.sol");

contract ('Joyso', function(accounts) {
    it("initial value should be zero.", function() {
        return Joyso.deployed().then(function(instance) {
            return instance.getBalance.call('', accounts[0]);
        }).then(function(balance) {
            assert.equal(balance.valueOf(), 0, "some words");
        });
    });

    it("check deposit ether");
    it("check deposit token");
    it("check internal transfer");
    it("check withdraw ether");
    it("check withdraw token");
});