// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SmartWallet {
    using ECDSA for bytes32;
    
    address public owner;
    
    event Executed(address indexed target, uint256 value, bytes data);
    event OwnerChanged(address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function executeTransaction(address target, uint256 value, bytes calldata data) external onlyOwner {
        (bool success, ) = target.call{value: value}(data);
        require(success, "Transaction failed");
        emit Executed(target, value, data);
    }

    function changeOwner(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }
}