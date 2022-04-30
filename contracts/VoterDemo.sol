//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@appliedzkp/semaphore-contracts/interfaces/IVerifier.sol";
import "@appliedzkp/semaphore-contracts/base/SemaphoreCore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title VoterDemo contract.
/// @dev The following code is just a example to show how Semaphore con be used.
contract VoterDemo is SemaphoreCore, Ownable {
    // A new voter is published every time a user's proof is validated.
    event NewVote(uint256 voter);

    // Voters are identified by a Merkle root.
    // The offchain Merkle tree contains the voters' identity commitments.
    uint256 public votersRoot;

    // The external verifier used to verify Semaphore proofs.
    IVerifier public verifier;

    // address[] public governors; 
    // temporary limit variable
    uint256 private limit = 10;
    bytes32 private winner;
    bytes32[] private users;
    mapping(uint256 => bool) internal voters;
    mapping(bytes32 => uint256) private rating;
    uint256[] private votersArr;

    constructor(bytes32[] memory _users, uint256 _votersRoot, address _verifier) {
        users = _users;
        for (uint256 i; i < users.length; i++){
            rating[users[i]] = 0;
        }
        votersRoot = _votersRoot;
        verifier = IVerifier(_verifier);
    }

    function _saveVoter(uint256 _voter) internal {
        require(!voters[_voter], "Already added");
        voters[_voter] = true;
        votersArr.push(_voter);
        // root = getRoot(0);
    }

    function getRatingByUser(bytes32 _user) public view returns(uint256){
        return rating[_user];
    }

    function getRatingbyId(uint256 _i) public view returns(uint256){
        return rating[users[_i]];
    }

    function getUsersArr() public view returns(bytes32[] memory){
        return users;
    }

    function getUsersArrLength() public view returns(uint256){
        return users.length;
    }

    function getRatingAllExpensive() public view returns(bytes32[] memory, uint256[] memory){
        uint256 count = getUsersArrLength();
        bytes32[] memory arr1 = new bytes32[](count);
        uint256[] memory arr2 = new uint256[](count);
        for (uint256 i; i<users.length; i++){
            arr1[i] = users[i];
            arr2[i] = rating[users[i]];
        }
        return (arr1, arr2);
    }

    function getWinner() public view returns(bytes32, uint256){
        uint256 _rating = getRatingByUser(winner);
        return (winner, _rating);
    }

    function setUserRating(bytes32 _user) internal {
        require(winner == 0x0000000000000000000000000000000000000000000000000000000000000000, "voting has ended.");
        rating[_user] += 1; 
        if (rating[_user] == limit){
            setWinner(_user);
        }
    }

    function setWinner(bytes32 _user) internal {
        winner = _user;
    }

    function vote(
        bytes32 _user,
        bytes32 _vote,
        uint256 _voter,
        uint256 _nullifierHash,
        uint256[8] calldata _proof
    ) external onlyOwner {
        require(!voters[_voter], "You cannot vote twice");
        _verifyProof(
            _vote, // bytes32 signal,
            votersRoot, // uint256 root,
            _nullifierHash, // uint256 nullifierHash,
            votersRoot, // uint256 externalNullifier,
            _proof, // uint256[8] calldata proof,
            verifier // IVerifier verifier
            );

        // Vote
        setUserRating(_user);
        // Prevent double-vote (nullifierHash = hash(root + identityNullifier)).
        // Every user can vote once.
        _saveVoter(_voter);
        _saveNullifierHash(_nullifierHash);
        emit NewVote(_voter);
    }
}
