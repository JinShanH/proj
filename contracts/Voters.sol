/// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/*
Voter Contract:
Factory Contract which will be deployed by the system owner where the system owner can add the voters and companies to the ESG system.

Registered companies can register their new ESGs through this contract where it will produce a new ESG contract where in this ESG contract the assigned third
parties can vote on this new ESG


*/
import "./ESG.sol";


contract Voters{
    address public system_owner; // The Contract Owner which is the ESG Voting System Owner
    mapping (address => bool) public voter_in_contract; //Mapping to see if an address is registered as a third party in the contract
    mapping (address => bool) public companies_in_contract; //Mapping to see if a company is registered so that they can create a new ESG through is voter contract
    mapping (address => bool) public esg_sc_address_in_contract;  //Mapping to store all the ESG contract produced from this SC, Needed so we can limit the address that can call the EmitVoteResultAchieved Function
    mapping (address => uint) public voter_addr_to_array_index; //Mapping to store a voter address index in the array, incase we need to remove a voter
    /*
        Mapping that tracks the ESG Smart Contract Produced in this Voter Contract. 
        Important as we only want the ESG smart contract created by this Voter contract to emit the VoteResultAchieved or NewApprovedSignedESG Event 
    */
    address[] public voter_array; //Array storing the wallet address of the third parties, used to assignt he voters to the new ESG contract
    constructor () {
        system_owner = msg.sender; // Set contract creator as the system owner or contract owner
    }

    event NewESG(address voting_contract_address,address[] voters); //Event to emit to oracle to notify the assigned third parties that there is a new ESG
    event VoteResultAchieved(string result,string file_url,address voting_contract_address,address company);
    //

    // Main Functions
    function addCompany(address company_address) public restricted { //Function to register a new company to the contract, Can only be called by the system owner
        require (voter_in_contract[company_address]== false, "Wallet Address is tied to a third party already"); //Checks if wallet address is already registered to a third party
        require (companies_in_contract[company_address]== false, "Wallet Address is tied to a company already");  //Checks if wallet address is already registered to a company already
        companies_in_contract[company_address] = true;
    }

    function removeCompany(address company_address) public restricted{ //Function to remove a company from the contract, can only be called by the system owner. 
        require (companies_in_contract[company_address]== true, "Wallet Address is not tied to a company already"); //Checks if wallet address is already registered to a third party
        delete companies_in_contract[company_address];
    }

    function addVoter(address third_party_address) external restricted returns (uint) { //Function to register a new third party to the system, can only be called by the system owner
        require (voter_in_contract[third_party_address]== false, "Wallet Address is tied to a Third Party already");   //Checks if wallet address is already registered to a company already
        require (companies_in_contract[third_party_address]== false, "Wallet Address is tied to a company already"); //Checks if wallet address is already registered to a third party
        voter_in_contract[third_party_address] = true;
        voter_array.push(third_party_address);
        uint number_of_voter = voter_array.length;
        voter_addr_to_array_index[third_party_address] = (number_of_voter-1);
        return number_of_voter;
    }
    
    function deleteVoter(address third_party_address) external restricted returns (uint) { //Function to delete an existing third party from the the system, can only be called by the system owner
        require (voter_in_contract[third_party_address]== true, "Third party wallet address cannot be found in this contract");  //Checks if wallet address is already registered to a third party
        uint _index = voter_addr_to_array_index[third_party_address];
        require(_index < voter_array.length, "index out of bound");
        uint last_index = voter_array.length-1;
        address last_item_in_array = voter_array[last_index];
        voter_array[_index] = last_item_in_array;
        voter_addr_to_array_index[last_item_in_array] = _index;
        voter_array.pop(); //Delete the duplicate last item
        delete(voter_addr_to_array_index[third_party_address]);
        delete(voter_in_contract[third_party_address]);
        return voter_array.length;
    }
    
    function addNewESG(string memory file_url, string memory hashByCompany) public returns(address){ //Function that allows a company to register a new ESG. Upon Registering a new ESG, A new ESG Contract will be created (Factory Pattern)
        require(companies_in_contract[msg.sender] == true, "You must be a registered company to add a new ESG");
        uint number_of_voter = voter_array.length;
        require(number_of_voter > 2, "Cannot add new ESG while number of voter is below 3");
        ESG new_esg = new ESG(file_url,hashByCompany,msg.sender,voter_array);
        address new_esg_address = address(new_esg);
        esg_sc_address_in_contract[new_esg_address] = true; //Register the new ESG contract address to the contract
        emit NewESG(new_esg_address,voter_array); //Emit an Event to the Oracle so that the oracle can notify the system, the company, and the voters that there is a new ESG contract)
        return new_esg_address;
    }

    function EmitVoteResultAchieved() external ESGContractOnly(){ //Function that allows the Deployed ESG Contracts to Emit the VoteResultAchieved Event to notify the oracle if an ESG contract voting result has been achieved 
        ESG esg_contract = ESG(msg.sender);
        string memory result = "";
        if(uint(esg_contract.state()) == 1){
            result = "Approved";
        }
        else if(uint(esg_contract.state()) == 2){
            result = "Denied";
        }
        else{
            result = "Tie";
        }
        emit VoteResultAchieved(result,esg_contract.esg_file_link(), msg.sender,esg_contract.company_address());
    }

    /* *
    * Modifier to ensure that only the system owner can call the functions
    */
    modifier restricted() {
        require (msg.sender == system_owner, "Can only be executed by the system owner");
        _ ;
    }


    modifier ESGContractOnly() {
        require(esg_sc_address_in_contract[msg.sender] == true,"Only an ESG contract address that have been registered to this contract can call this function");
        _ ;
    }
}