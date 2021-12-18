let contracts = require('./contracts.json');
const abis = require('./abis');

for(let key of Object.keys(contracts)){
    contracts[key].ABI = eval( abis[ contracts[key].ABI]);
}

module.exports = contracts;