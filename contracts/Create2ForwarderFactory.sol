// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "./DepositForwarder.sol";

contract Create2ForwarderFactory {
    address public checkoutPool;
    address public immutable initialDeployer;
    bool public locked;

    event ForwarderDeployed(address indexed user, address forwarder);
    event CheckoutPoolUpdated(address indexed newCheckoutPool);
    event Locked();

    constructor(address _initialDeployer) {
        require(_initialDeployer != address(0), "Invalid checkout pool");
        checkoutPool = _initialDeployer;
        initialDeployer = _initialDeployer; // Set deployer
    }

    function deployForwarder(
        address user,
        bytes32 salt
    ) external returns (address) {
        DepositForwarder forwarder = new DepositForwarder{salt: salt}(
            user,
            checkoutPool
        );
        emit ForwarderDeployed(user, address(forwarder));
        return address(forwarder);
    }

    function updateCheckoutPool(address _checkoutPool) external {
        require(!locked, "Contract is locked");
        require(
            msg.sender == checkoutPool,
            "Only current CheckoutPool can update"
        );
        require(_checkoutPool != address(0), "Invalid address");
        checkoutPool = _checkoutPool;
        emit CheckoutPoolUpdated(_checkoutPool);
    }

    function lock() external {
        require(
            msg.sender == initialDeployer || msg.sender == checkoutPool,
            "Only deployer or CheckoutPool can lock"
        );
        require(!locked, "Already locked");
        locked = true;
        emit Locked();
    }

    function getForwarderAddress(
        address user,
        bytes32 salt
    ) public view returns (address) {
        bytes memory bytecode = type(DepositForwarder).creationCode;
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(
                    abi.encodePacked(bytecode, abi.encode(user, checkoutPool))
                )
            )
        );
        return address(uint160(uint256(hash)));
    }
}
