// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "hardhat/console.sol";

/**
 * @title SmartWallet
 * @dev A simple wallet contract controlled by a factory, capable of executing transactions on behalf of a user.
 */
contract SmartWallet {
    /// @dev The address of the user who owns this wallet.
    address public owner;

    /// @dev The address of the factory that deployed and controls this wallet, immutable after deployment.
    address public immutable factory;

    /// @notice Emitted when a transaction is successfully executed by the wallet.
    /// @param target The address of the contract or account called.
    /// @param value The amount of ETH (in wei) sent with the call.
    /// @param data The calldata sent to the target.
    event Executed(address indexed target, uint256 value, bytes data);

    /// @dev Restricts function calls to the factory address only.
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }

    /**
     * @dev Initializes the SmartWallet with an owner and factory address.
     * @param _owner The address of the wallet’s owner.
     * @param _factory The address of the factory deploying this wallet.
     */
    constructor(address _owner, address _factory) {
        require(_owner != address(0), "Invalid owner");
        require(_factory != address(0), "Invalid factory");
        owner = _owner;
        factory = _factory;
    }

    /**
     * @dev Allows the wallet to receive ETH.
     */
    receive() external payable {}

    /**
     * @notice Executes a transaction to a target address, callable only by the factory.
     * @dev Performs a low-level call to the target with the specified value and data.
     * @param target The address to call (e.g., an ERC20 token contract).
     * @param value The amount of ETH (in wei) to send with the call.
     * @param data The calldata to send to the target (e.g., encoded function call).
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyFactory {
        (bool success, ) = target.call{value: value}(data);
        require(success, "Transaction failed");
        emit Executed(target, value, data);
    }
}