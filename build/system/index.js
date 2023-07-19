"use strict";
/// SPDX-License-Identifier: UNLICENSED
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const solc_lib_1 = require("../solc-lib");
const util_1 = require("../util");
const { Web3, ETH_DATA_FORMAT, DEFAULT_RETURN_FORMAT, Contract } = require('web3');
let fs = require('fs');
const path = require('path');
/**
 * Init WebSocket provider
 * @return {Web3BaseProvider} Provider
 */
const initProvider = () => {
    try {
        const providerData = fs.readFileSync('eth_providers/providers.json', 'utf8');
        const providerJson = JSON.parse(providerData);
        //Enable one of the next 2 lines depending on Ganache CLI or GUI
        // const providerLink = providerJson['provider_link_ui']
        const providerLink = providerJson['provider_link_cli'];
        return new Web3.providers.WebsocketProvider(providerLink);
    }
    catch (error) {
        throw 'Cannot read provider';
    }
};
/**
 * Get an account given its name
 * @param {typeof Web3} Web3 Web3 provider
 * @param {string} name Account name
 */
const getAccount = (web3, name) => {
    try {
        const accountData = fs.readFileSync('eth_accounts/accounts.json', 'utf8');
        const accountJson = JSON.parse(accountData);
        const accountPvtKey = accountJson[name]['pvtKey'];
        // Build an account object given private key
        web3.eth.accounts.wallet.add(accountPvtKey);
    }
    catch (error) {
        throw 'Cannot read account';
    }
};
/**
 * Get ABI of given contract
 */
const getABI = (contractName, buildPath) => {
    try {
        const filePath = path.resolve(buildPath, contractName + '.json');
        const contractData = fs.readFileSync(filePath, 'utf8');
        const contractJson = JSON.parse(contractData);
        return contractJson[contractName][contractName].abi;
    }
    catch (error) {
        throw 'Cannot read account';
    }
};
// Get command line arguments
// oracle value? is this even needed lol
const cmdArgs = process.argv.slice(2);
if (cmdArgs.length > 1) {
    console.error("Any CLI arguments??");
    process.exit(1);
}
// this is where execution starts
(() => __awaiter(void 0, void 0, void 0, function* () {
    const contractName = 'Voters';
    const adminName = 'acc0';
    // Add 60 sec to make sure timeout isn't called too early due to clock errors
    const timeoutDelta = 30;
    let web3Provider;
    let web3;
    const buildPath = path.resolve(__dirname, '');
    let contractAddress;
    // Read command line arguments
    const value = Number(cmdArgs[0]) * Math.pow(10, 18); // Convert to Wei
    // const oracle = cmdArgs[1]    // oracle required?
    // Init Web3 provider
    try {
        web3Provider = initProvider();
        web3 = new Web3(web3Provider);
    }
    catch (error) {
        console.error(error);
        throw 'Web3 cannot be initialised.';
    }
    console.log('---- SYSADMIN ----\nConnected to Web3 provider.');
    // Create SYSADMIN account object using private key
    try {
        getAccount(web3, adminName);
    }
    catch (error) {
        console.error(error);
        throw 'Cannot access accounts';
    }
    const from = web3.eth.accounts.wallet[0].address;
    console.log(`SYSADMIN running as account ${adminName} with address ${from}`);
    // Compile contract and save it into a file for future use
    let compiledContract;
    try {
        compiledContract = (0, solc_lib_1.compileSols)([contractName]);
        (0, solc_lib_1.writeOutput)(compiledContract, buildPath);
    }
    catch (error) {
        console.error(error);
        throw 'Error while compiling contract';
    }
    console.log('Contract compiled');
    // Deploy contract
    const contract = new web3.eth.Contract(compiledContract.contracts[contractName][contractName].abi);
    console.log('hiii');
    const data = compiledContract.contracts[contractName][contractName].evm.bytecode.object;
    // const args = [oracle]  // oracle required?
    console.log('Attempting to deploy contract...');
    // Deploy contract with given constructor arguments
    try {
        const contractToSend = contract.deploy({
            data
        });
        // Get current average gas price
        const gasPrice = yield web3.eth.getGasPrice(ETH_DATA_FORMAT);
        const gasLimit = yield contractToSend.estimateGas({ from }, DEFAULT_RETURN_FORMAT);
        const tx = yield contractToSend.send({
            from,
            value,
            gasPrice,
            gas: util_1.GasHelper.gasPay(gasLimit)
        });
        contractAddress = tx.options.address;
        console.log('Contract contract deployed at address: ' + contractAddress);
    }
    catch (error) {
        console.error(error);
        throw 'Error while deploying contract';
    }
    console.log('contract deployed');
    const abi = getABI(contractName, buildPath);
    const contractInstance = new web3.eth.Contract(abi, contractAddress);
    // Create a new company
    const company1 = 'acc1';
    try {
        getAccount(web3, company1);
    }
    catch (error) {
        console.error(error);
        throw 'Failed to access company account';
    }
    const company1Addr = web3.eth.accounts.wallet[1].address;
    console.log(`Company 1 running as account ${company1} with address ${company1Addr}`);
    // Add a new company to the contract
    const jsonInterfaceAddCompany = {
        "inputs": [
            {
                type: 'Address',
                name: 'company_address'
            }
        ],
        "name": "addCompany",
        "outputs": [],
        "type": "function"
    };
    const dataAddCompany = web3.eth.abi.encodeFunctionCall(jsonInterfaceAddCompany, [company1Addr]);
    try {
        const gasPrice = yield web3.eth.getGasPrice(ETH_DATA_FORMAT);
        const gasLimit = yield web3.eth.estimateGas({
            from,
            to: contractAddress,
            data: dataAddCompany
        });
        const tx = yield web3.eth.sendTransaction({
            from,
            to: contractAddress,
            data: dataAddCompany,
            gasPrice,
            gas: util_1.GasHelper.gasPay(gasLimit)
        });
        console.log(`Requested to add ${company1}.`);
    }
    catch (error) {
        console.error('Error while calling addCompany.');
        console.error(error);
    }
    console.log('addCompany called successfully');
}))();
