// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./DepositForwarder.sol";
import "hardhat/console.sol";
/**
 * @title Create2ForwarderFactory
 * @dev A factory contract for deploying DepositForwarder instances using CREATE2, allowing deterministic addresses.
 *      Supports updating the CheckoutPool address until locked.
 */
contract Create2ForwarderFactory {
    /// @dev The address of the CheckoutPool contract, updatable until locked.
    address public checkoutPool;

    /// @dev The address that deployed the contract, used for locking permissions and as admin for forwarders.
    address public immutable initialDeployer;

    /// @dev Flag indicating if the contract is locked (immutable after locking).
    bool public locked;

    /// @notice Emitted when a new DepositForwarder is deployed.
    /// @param user The address of the user associated with the forwarder.
    /// @param forwarder The address of the newly deployed DepositForwarder.
    event ForwarderDeployed(address indexed user, address forwarder);

    /// @notice Emitted when the CheckoutPool address is updated.
    /// @param newCheckoutPool The new CheckoutPool address.
    event CheckoutPoolUpdated(address indexed newCheckoutPool);

    /// @notice Emitted when the contract is locked, preventing further updates.
    event Locked();

    /**
     * @dev Initializes the factory with an initial deployer (also set as the initial CheckoutPool).
     * @param _initialDeployer The address of the deployer and initial CheckoutPool.
     */
    constructor(address _initialDeployer) {
        require(_initialDeployer != address(0), "Invalid checkout pool");
        checkoutPool = _initialDeployer;
        initialDeployer = _initialDeployer; // Set deployer
    }

    /**
     * @notice Deploys a new DepositForwarder instance for a user using CREATE2.
     * @dev Uses the provided salt to deterministically deploy the forwarder with initialDeployer as admin.
     * @param user The address of the user associated with the forwarder.
     * @param salt A unique salt to determine the forwarder’s address.
     * @return The address of the deployed DepositForwarder.
     */
    function deployForwarder(address user, bytes32 salt) external returns (address) {

        DepositForwarder forwarder = new DepositForwarder{salt: salt}(
            user,
            checkoutPool
        );
        emit ForwarderDeployed(user, address(forwarder));
        return address(forwarder);
    }

    /**
     * @notice Updates the CheckoutPool address, callable only by the current CheckoutPool.
     * @dev Can only be called if the contract is not locked.
     * @param _checkoutPool The new CheckoutPool address.
     */
    function updateCheckoutPool(address _checkoutPool) external {
        require(!locked, "Contract is locked");
        require(msg.sender == checkoutPool, "Only current CheckoutPool can update");
        require(_checkoutPool != address(0), "Invalid address");
        checkoutPool = _checkoutPool;
        emit CheckoutPoolUpdated(_checkoutPool);
    }

    /**
     * @notice Locks the contract, preventing further CheckoutPool updates.
     * @dev Callable only by the initial deployer or current CheckoutPool.
     */
    function lock() external {
        require(msg.sender == initialDeployer || msg.sender == checkoutPool, "Only deployer or CheckoutPool can lock");
        require(!locked, "Already locked");
        locked = true;
        emit Locked();
    }

    /**
     * @notice Computes the address where a DepositForwarder would be deployed using CREATE2.
     * @dev Uses the CREATE2 formula: keccak256(0xff, factory_address, salt, keccak256(bytecode)).
     * @param user The address of the user associated with the forwarder (not used in address calculation here).
     * @param salt The salt used to determine the forwarder’s address.
     * @return The predicted address of the DepositForwarder.
     */
    function getForwarderAddress(address user, bytes32 salt) public view returns (address) {
        bytes memory bytecode = type(DepositForwarder).creationCode;
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(bytecode, abi.encode(user, checkoutPool)))
            )
        );
        return address(uint160(uint256(hash)));
    }
}