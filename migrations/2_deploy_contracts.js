var Joyso = artifacts.require("./Joyso.sol");

module.exports = function(deployer) {
  if (!process.env.JOYSO_WALLET || !process.env.JOY_TOKEN) {
    throw new Error('.env is not set.');
  }
  deployer.deploy(Joyso, process.env.JOYSO_WALLET, process.env.JOY_TOKEN).then(() => {
    return Joyso.deployed();
  }).then(instance => {
    web3.eth.getBlock('latest', (err, block) => {
      console.log('Block number: ', block.number);
      console.log('Block hash: ', block.hash);
    });
    if (process.env.ADMIN) {
      instance.addToAdmin(process.env.ADMIN, true);
    }
    if (process.env.TOKENS) {
      const tokens = process.env.TOKENS.split(',')
      tokens.forEach((token, index) => {
        instance.registerToken(token, index + 2);
      });
    }
  });
};
