/// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/*
ESG Contract: 
This contract will be used as the Smart Contract template for the Voters Contract where through the Voters contract, a registered company can
register a new ESG through the voter contract, where upon registering, an ESG Smart Contract will be deployed from the Voter contract.

The main use of this contract is:
- To store a blockchain representation of a company ESG which is immutable.
- To allow the assigned third parties whos responsible for verifying the ESG to vote on the ESG, thus recording every vote in the blockchain
- If an ESG is accepted by the third parties, then this contract will store the Signed Hash of the ESG file and the Public Key used to decrypt the signed
hash which will be submitted directly by the responsible third party(the assigned validator) to the ESG contract. This is done as a proof for the validity 
and integrity for the result of the vote and the hash of the ESG file.

*/
interface Voters_interface{ 
/*
Interface which will be used by the ESG Smart contract so that it can call the Emit functions in the Voters Contract without 
needing to import the Voters file into the Smart Contract Source code
*/
  function EmitVoteResultAchieved() external; //Function to Emit the VoteResultAchieved Event in the Voter contract
}


contract ESG{
    address public company_address; // The Contract Owner which is the Company who makes the ESG
    address public voting_contract_address; // Address that stores the address of the voting contract where the ESG contract is produced from so we can emit the event in the voter contract
    string public esg_file_link; //File link of the esg file
    string public originalHash; //The signed hash from the validator if the ESG is accepted
    uint public numberOfVote; //Number of votes already done tot he contract
    uint public numberOfThirdParty; //The number of valid third party that can vote in this ESg contract
    uint private vote_that_accepts; // The number of votes that accept the esg
    uint private vote_that_rejects; //The number of votes that reject the esg
    uint public majority_vote_number; //The majority vote number threshold 
    enum VotingState{  //Enum used to track the state of the contract
        Waiting, //State where the Vote is still being accumulated
        Accepted, // State where the ESG is accepted,
        Rejected, // State where the ESG is rejected
        Tie //State where the ESG result is 50/50
    }
    VotingState public state = VotingState.Waiting; // State variable to store the state of the ESG contract using enum
    mapping (address => bool) public valid_voter; //Mapping to check if a voter can vote on this ESG
    mapping (address => bool) public has_voted; //Mapping to check if a third party has voted
    
    
    constructor(string memory file_url,string memory original_hash, address origin_company_address ,address[] memory voters) {
        originalHash = original_hash;
        esg_file_link = file_url; //Set the ESG file Link
        company_address =origin_company_address; //Set the address of the company who own this address, we cant use msg.sender here since msg.sender here will be the voters contract address
        voting_contract_address = msg.sender; //The voting contract address that generated this ESG so that this ESG contract can emit events to it later 
        numberOfThirdParty = voters.length; 
        for (uint i=0; i<numberOfThirdParty; i++) { //Store the third party address that can vote on this contract
            valid_voter[voters[i]] = true; 
        }
        majority_vote_number = numberOfThirdParty * uint(2)/uint(3); //Majority vote number cap where if either the amount of votes that accepts or rejects reaches this number, the result will be automatically set the the majority vote result  
        if(numberOfThirdParty == 4){ //Since Solidity Rounds Down, Need to consider for a special case where the number of Third Party is 4
            majority_vote_number++;
        }
    }

    function doVote(bool vote) external{ //Function that allows the third party that is assigned to ESG contract to vote on this ESG
        require(valid_voter[msg.sender] == true,"You must be an authorized third party to vote"); //Ensures that only the registered third party can vote
        require(state == VotingState.Waiting,"Voting for this ESG has already ended"); // Ensures that the Voting is still open
        require(has_voted[msg.sender] == false,"You have already voted"); //ensures that the third party does not vote more than once
        has_voted[msg.sender] = true; //Record that the third party has votes
        if(vote == true){ //If the vote is true then the third party agrees on the esg
            vote_that_accepts++;
        }
        else{ //If the vote is false then the third party disagrees on the esg
            vote_that_rejects++;
        }
        numberOfVote++; //Add the number of vote
        checkVotingState(vote,numberOfVote == numberOfThirdParty); //Call the internal function to check the vote condition
    }

    function checkVotingState(bool voteAgrees, bool voteIsFull) internal{ 
        /*
        Function to check the Voting condition where if either the accept vote or reject vote has reached
        the majority vote threshold then the value is set to the majority vote result.
        If the majority vote is not reached and the number of votes is equal to the number of voters then check if the
        amount of votes that accepts is bigger than the the number of votes that rejects and set the voting result based on that.
        if its a tie then set the voting result to be a tie.

        If either the majority vote is achieved, or number of vote is equal to the number of voters then emit the VoteResultAchieved event in the Voters contract.
        */
        bool voteResultReached = false;
        if(voteIsFull){
            if(vote_that_accepts > vote_that_rejects){
                state = VotingState.Accepted;
            }else if(vote_that_accepts < vote_that_rejects){
                state = VotingState.Rejected;
            }
            else{
                state = VotingState.Tie;
            }
            voteResultReached = true;
        }
        else{
            if(voteAgrees && vote_that_accepts>=majority_vote_number){
                state = VotingState.Accepted;
                voteResultReached = true;
            }
            else if(voteAgrees == false && vote_that_rejects>= majority_vote_number){
                state = VotingState.Rejected;
                voteResultReached = true;
            }
        }
        if(voteResultReached == true){
            Voters_interface(voting_contract_address).EmitVoteResultAchieved();
        }
    }

    function getVotingState() external view returns(string memory) { //Function to get a string representation of the Voting State
        string memory result = "";
        if(uint(state) == 0){
            result = "Waiting";
        }
        else if(uint(state) == 1) {
            result = "Approved";
        }
        else if(uint(state) == 2){
            result = "Rejected";
        }
        else {
            result = "Tie";
        }
        return result;
    }

}