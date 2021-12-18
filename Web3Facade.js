const Web3 = require('web3'); 
const Tx = require("ethereumjs-tx");

class Web3Facade{
    /**
     * @param {Object} PARAMS 
     */
    constructor(PARAMS){
        this.web3 = new Web3(PARAMS.RPC_URL);
        this.chainID = PARAMS.CHAIN_ID;
    }

    /**
     * @param {String} privateKey - pk of the sender
     * @param {Object} txObj - {nonce: , gasPrice: , from: , to, data, chainID}
     * @returns 
     */
    async writeContract(privateKey, txObj){
        let from = this.web3.eth.accounts.privateKeyToAccount(privateKey).address; // address of the sender
        let _nonce = txObj.nonce ? txObj.nonce : await this.web3.eth.getTransactionCount(from);
        let _gasPrice = txObj.gasPrice ? txObj.gasPrice : await this.web3.eth.getGasPrice();
        
        let txObject = {
            nonce: this.web3.utils.toHex(_nonce.toString()),
            gasPrice: this.web3.utils.toHex(_gasPrice.toString()),
            from,
            to: txObj.to,
            data: txObj.data,
            chainId: this.chaindID
        }

        let _gasLim = await this.web3.eth.estimateGas(txObject);
        console.log("estimated gas:" +_gasLim);
        txObject.gasLimit = this.web3.utils.toHex( (_gasLim).toString());

        return sendTransaction(privateKey, txObject)
    }

    /**
     * @param {String} privateKey 
     * @param {Object} txObject 
     * @returns - transactionHash
     */
    async sendTransaction(privateKey, txObject){
        // Sign the transaction
        let tx = new Tx(txObject)
        tx.sign( Buffer.from(privateKey, "hex"))
        
        // Serialize the transaction
        let serializedTransaction = tx.serialize()
        let raw = '0x' + serializedTransaction.toString('hex')
        
        // Broadcast the transaction
        let res = await this.web3.eth.sendSignedTransaction(raw);
        console.log(res.transactionHash)
        return res.transactionHash;
    }


    /**
     * @param {Object} _TxObj 
     * @returns - Estimated gas fee of the Transaction
     */
    async calculateGasFee(_TxObj){
        try{
            if (_TxObj.nonce == undefined){
                let txCount = await this.web3.eth.getTransactionCount(_TxObj.from);
                _TxObj.nonce = txCount;
            }

            let gasUnit = await this.web3.eth.estimateGas(_TxObj);
            let gasPrice = await this.web3.eth.getGasPrice();
            cost = Number( this.web3.utils.fromWei( (gasUnit * gasPrice).toString(), 'ether'));
            return cost;
        } catch(err){
            return NaN;
        }
    }

    /**
     * @param {Array} ABI - ABI of the contract
     * @param {String} ADR - Address of the contract
     * @returns - web3.eth.Contract object
     */
    getContract(ABI, ADR){
        return new this.web3.eth.Contract(ABI, ADR);
    }

    /**
     * @param {String} address 
     * @returns - Number of transactions of the given address
     */
    async getNonce(address){
        return await this.web3.eth.getTransactionCount(address);
    }

    /**
     * @returns - Average gas price for the network
     */
    async getGasPrice(){
        return await this.web3.eth.getGasPrice();
    }

    /**
     * @param {String} privateKey 
     * @returns {String} - Public Key
     */
    privateKeyToAddress(privateKey){
        return this.web3.eth.accounts.privateKeyToAccount(privateKey).address
    }
}

module.exports = Web3Facade;