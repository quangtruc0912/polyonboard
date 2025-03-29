// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SmartWallet {
    using ECDSA for bytes32;
    
    address public owner;          // Still tracks the user who "owns" it
    address public immutable factory; // The WalletFactory address, set at deployment
    
    event Executed(address indexed target, uint256 value, bytes data);
    event OwnerChanged(address indexed newOwner);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }

    constructor(address _owner, address _factory) {
        require(_owner != address(0), "Invalid owner");
        require(_factory != address(0), "Invalid factory");
        owner = _owner;
        factory = _factory;
    }

    receive() external payable {}

    function executeTransaction(address target, uint256 value, bytes calldata data) 
        external 
        onlyFactory 
    {
        (bool success, ) = target.call{value: value}(data);
        require(success, "Transaction failed");
        emit Executed(target, value, data);
    }

    function changeOwner(address newOwner) 
        external 
        onlyFactory 
    {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }
}