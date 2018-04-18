require('dotenv').config();

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    ropsten: {
      host: 'localhost',
      port: 8545,
      network_id: 3,
      from: '0x0030a36Cff41E3B853a264f4FFDcA03393D4511e',
      gas: 4600000
    }
  }
};
