"use strict";
/// SPDX-License-Identifier: UNLICENSED
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileSols = exports.writeOutput = void 0;
/// @title Compile contracts
/// @author Dilum Bandara, CSIRO's Data61
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const solc = require('solc');
/**
 * Find files to import
 * @param {string} path Path to import
 * @returns {any} Contract code as an object
 */
const findImports = (path) => {
    try {
        return {
            contents: fs.readFileSync(`node_modules/${path}`, 'utf8')
        };
    }
    catch (e) {
        return {
            error: e.message
        };
    }
};
/**
 * Writes contracts from the compiled sources into JSON files
 * @param {any} compiled Object containing the compiled contracts
 * @param {string} buildPath Path of the build folder
 */
const writeOutput = (compiled, buildPath) => {
    fsExtra.ensureDirSync(buildPath); // Make sure directory exists
    for (let contractFileName in compiled.contracts) {
        const contractName = contractFileName.replace('.sol', '');
        console.log('Writing: ', contractName + '.json to ' + buildPath);
        // console.log(path.resolve(buildPath, contractName + '.json'))
        fsExtra.outputJsonSync(path.resolve(buildPath, contractName + '.json'), compiled.contracts);
    }
};
exports.writeOutput = writeOutput;
/**
 * Compile Solidity contracts
 * @param {Array<string>} names List of contract names
 * @return An object with compiled contracts
 */
const compileSols = (names) => {
    let sources = {};
    names.forEach((value, index, array) => {
        let file = fs.readFileSync(`contracts/${value}.sol`, 'utf8');
        sources[value] = {
            content: file
        };
    });
    let input = {
        language: 'Solidity',
        sources,
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            },
            // evmVersion: 'berlin' //Uncomment this line if using Ganache GUI
        }
    };
    // Compile all contracts
    try {
        console.log('compiling...');
        return JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    }
    catch (error) {
        console.log(error);
    }
};
exports.compileSols = compileSols;
