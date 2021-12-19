const Web3Facade = require('./Web3Facade');
const contracts = require('./contracts')
const BN = require('bn.js');
const utils = require('./utils')

class MinterBot{
    constructor(PARAMS){
        this.web3Facade = new Web3Facade(PARAMS);
        
        this.privateKey = PARAMS.PRIVATE_KEY;
        this.address = this.web3Facade.privateKeyToAddress(this.privateKey);

        let {ABI, ADR} = contracts.axes_mint;
        this.mintContract = this.web3Facade.getContract(ABI, ADR);

        this.gasRatio = 2;

        this.mintBatchTime = 500;
        this.checkWhiteListTime = 200;
    }    

    async startMinting(season){
        // continuously check whether or not we are whitelisted
        let preCondition = false;
        while(!preCondition){
            await utils.sleep(this.checkWhiteListTime);
            let whiteListed = await this.mintContract.methods.isWhitelisted(this.address, season).call();
            console.log("whitelisted:", whiteListed, "waiting to be whitelisted");

            let contract_season = await this.mintContract.methods.season().call();
            let correctSeason = season <= contract_season;
            console.log("correctSeason:", correctSeason, "current season is", contract_season);

            // check for timestamp
            let timestamp = parseInt(await this.web3Facade.blockTimestamp());
            let seasonInfo = await this.mintContract.methods.seasonInfo(season).call();

            let timestampOk = parseInt(seasonInfo._seasonStart) <= timestamp && timestamp <= parseInt(seasonInfo._seasonStop);
            console.log(seasonInfo._seasonStart, timestamp, seasonInfo._seasonStop, timestampOk);
            preCondition = whiteListed && correctSeason && timestampOk;
        }
        
        // after we are whitelisted, start minting
        console.log("Starting to mint");
        this.mintFor(season, 10);
    }

    async mintFor(season, N){
        let nonce = await this.web3Facade.getNonce(this.address);
        this._mintFor(season, nonce, nonce+N);
    }

    async _mintFor(season, start_nonce, stop_nonce){
        if(start_nonce == stop_nonce)
            return;

        for(let i = start_nonce; i < stop_nonce; i++){
            this.mint(season, i);
        }
        await utils.sleep(this.mintBatchTime);
        
        let nonce = await this.web3Facade.getNonce(this.address);
        return this._mintFor(season, nonce, stop_nonce);
    }

    async mint(season, nonce){
        try{
            let gasPrice = await this.getFastGasPrice(); // we want our transactions to be fast
            console.log(gasPrice);

            let txObj = {
                to: this.mintContract.options.address, 
                data: this.mintContract.methods.saleMint(this.address, season).encodeABI(),
                nonce,
                gasPrice
            }
    
            let txHash = await this.web3Facade.writeContract(this.privateKey, txObj);
            console.log(`Minted with ${nonce}th nonce`);
            return txHash;
        } catch(e){
            console.log(`Error occured while minting with ${nonce} nonce \r\n`, e.message);
            return null;
        }
    }    

    async getFastGasPrice(){
        let gasPriceBN = new BN(await this.web3Facade.getGasPrice());
        let gasRatioBN = new BN(this.gasRatio);

        return gasPriceBN.mul(gasRatioBN).toString();
    }
}

module.exports = MinterBot;