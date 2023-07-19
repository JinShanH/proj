/// SPDX-License-Identifier: UNLICENSED

/// @title Deploy Voter contract and add companies/voters
/// @author Dilum Bandara, CSIRO's Data61

import { time } from 'node:console'
import { compileSols, writeOutput } from '../solc-lib'
import { GasHelper } from '../util'
const { Web3, ETH_DATA_FORMAT, DEFAULT_RETURN_FORMAT, Contract } = require('web3')
import type { Web3BaseProvider, AbiStruct, Address } from 'web3-types'
let fs = require('fs')
const path = require('path')

/**
 * Init WebSocket provider
 * @return {Web3BaseProvider} Provider
 */
const initProvider = (): Web3BaseProvider => {
    try {
        const providerData = fs.readFileSync('eth_providers/providers.json', 'utf8')
        const providerJson = JSON.parse(providerData)

        //Enable one of the next 2 lines depending on Ganache CLI or GUI
        // const providerLink = providerJson['provider_link_ui']
        const providerLink = providerJson['provider_link_cli']

        return new Web3.providers.WebsocketProvider(providerLink)
    } catch (error) {
        throw 'Cannot read provider'
    }
}

/**
 * Get an account given its name
 * @param {typeof Web3} Web3 Web3 provider
 * @param {string} name Account name 
 */
const getAccount = (web3: typeof Web3, name: string) => {
    try {
        const accountData = fs.readFileSync('eth_accounts/accounts.json', 'utf8')
        const accountJson = JSON.parse(accountData)
        const accountPvtKey = accountJson[name]['pvtKey']

        // Build an account object given private key
        web3.eth.accounts.wallet.add(accountPvtKey)
    } catch (error) {
        throw 'Cannot read account'
    }
}

/**
 * Get ABI of given contract
 */
const getABI = (contractName: string, buildPath: string): AbiStruct => {
    try {
        const filePath = path.resolve(buildPath, contractName + '.json')
        const contractData = fs.readFileSync(filePath, 'utf8')
        const contractJson = JSON.parse(contractData)
        return contractJson[contractName][contractName].abi
    } catch (error) {
        throw 'Cannot read account'
    }
}

// Get command line arguments
// oracle value? is this even needed lol
const cmdArgs = process.argv.slice(2)
if (cmdArgs.length > 1) {
    console.error("Any CLI arguments??")
    process.exit(1)
}


// this is where execution starts
(async () => {
    const contractName = 'Voters'
    const adminName = 'acc0'
    // Add 60 sec to make sure timeout isn't called too early due to clock errors
    const timeoutDelta = 30

    let web3Provider: Web3BaseProvider
    let web3: typeof Web3
    const buildPath = path.resolve(__dirname, '')
    let contractAddress: string

    // Read command line arguments
    const value = Number(cmdArgs[0]) * Math.pow(10, 18) // Convert to Wei
    // const oracle = cmdArgs[1]    // oracle required?

    // Init Web3 provider
    try {
        web3Provider = initProvider()
        web3 = new Web3(web3Provider)
    } catch (error) {
        console.error(error)
        throw 'Web3 cannot be initialised.'
    }
    console.log('---- SYSADMIN ----\nConnected to Web3 provider.')

    // Create SYSADMIN account object using private key
    try {
        getAccount(web3, adminName)
    } catch (error) {
        console.error(error)
        throw 'Cannot access accounts'
    }
    const from = web3.eth.accounts.wallet[0].address
    console.log(`SYSADMIN running as account ${adminName} with address ${from}`)

    // Compile contract and save it into a file for future use
    let compiledContract: any
    try {
        compiledContract = compileSols([contractName])
        writeOutput(compiledContract, buildPath)
    } catch (error) {
        console.error(error)
        throw 'Error while compiling contract'
    }
    console.log('Contract compiled')

    // Deploy contract
    const contract = new web3.eth.Contract(compiledContract.contracts[contractName][contractName].abi)
    console.log('hiii')
    const data = compiledContract.contracts[contractName][contractName].evm.bytecode.object
    // const args = [oracle]  // oracle required?
    console.log('Attempting to deploy contract...')

    // Deploy contract with given constructor arguments
    try {
        const contractToSend = contract.deploy({
            data
        })

        // Get current average gas price
        const gasPrice = await web3.eth.getGasPrice(ETH_DATA_FORMAT)
        const gasLimit = await contractToSend.estimateGas(
            { from },
            DEFAULT_RETURN_FORMAT, // the returned data will be formatted as a bigint   
        )
        const tx = await contractToSend.send({
            from,
            value,
            gasPrice,
            gas: GasHelper.gasPay(gasLimit)
        })
        contractAddress = tx.options.address
        console.log('Contract contract deployed at address: ' + contractAddress)
    } catch (error) {
        console.error(error)
        throw 'Error while deploying contract'
    }
    console.log('contract deployed')

    const abi = getABI(contractName, buildPath)

    const contractInstance = new web3.eth.Contract(abi, contractAddress)



    // Create a new company
    const company1 = 'acc1'
    try {
        getAccount(web3, company1)
    } catch (error) {
        console.error(error)
        throw 'Failed to access company account'
    }
    const company1Addr = web3.eth.accounts.wallet[1].address
    console.log(`Company 1 running as account ${company1} with address ${company1Addr}`)

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
    }
    const dataAddCompany = web3.eth.abi.encodeFunctionCall(jsonInterfaceAddCompany, [company1Addr])

    try {
        const gasPrice = await web3.eth.getGasPrice(ETH_DATA_FORMAT)
        const gasLimit = await web3.eth.estimateGas({
            from,
            to: contractAddress,
            data: dataAddCompany
        })
        const tx = await web3.eth.sendTransaction({
            from,
            to: contractAddress,
            data: dataAddCompany,
            gasPrice,
            gas: GasHelper.gasPay(gasLimit)
        })
        console.log(`Requested to add ${company1}.`)
    } catch (error) {
        console.error('Error while calling addCompany.')
        console.error(error)
    }
    console.log('addCompany called successfully')


}) ()