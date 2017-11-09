
var Joyso = artifacts.require("./Joyso.sol");

contract('Joyso', function(accounts) {
  it("should assert true", function(done) {
    var joyso = Joyso.deployed();
    assert.isTrue(true);
    done();
  });
});
