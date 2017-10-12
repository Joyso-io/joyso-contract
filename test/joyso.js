var Joyso = artifacts.require("./Joyso.sol");

contract ('Joyso', function(accounts) {
    it("some words", function() {
        return Joyso.deployed().then(function(instance) {
            return instance.getBalance.call('', accounts[0]);
        }).then(function(balance) {
            assert.equal(balance.valueOf(), 0, "some words");
        });
    });
});