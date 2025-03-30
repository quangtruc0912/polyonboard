// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./CheckoutPool.sol";
import "./SmartWallet.sol";

contract WalletFactory {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    mapping(address => address) public userWallets;
    mapping(address => uint256) public withdrawNonces;
    IERC20 public immutable token;
    address public checkoutPool;
    bool public locked; // Immutability flag
    address public immutable initialDeployer; // New: Tracks deployer

    event WalletCreated(address indexed user, address wallet);
    event Withdrawn(address indexed user, uint256 amount);
    event CheckoutPoolUpdated(address indexed newCheckoutPool);
    event Locked();

    constructor(address _initialDeployer) {
        require(_initialDeployer != address(0), "Invalid checkout pool");
        checkoutPool = _initialDeployer;
        initialDeployer = _initialDeployer; // Set deployer
    }

    function createWallet(address user) external {
        require(
            msg.sender == address(checkoutPool),
            "Only CheckoutPool can call"
        );
        require(user != address(0), "Invalid user address");
        require(userWallets[user] == address(0), "Wallet already exists");

        SmartWallet wallet = new SmartWallet(user, address(this));
        userWallets[user] = address(wallet);

        emit WalletCreated(user, address(wallet));
    }

    function getWallet(address user) external view returns (address) {
        return userWallets[user];
    }

    function withdrawToOriginalAccountGasless(
        address user,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external {
        address wallet = userWallets[user];
        require(wallet != address(0), "No wallet found");
        require(token.balanceOf(wallet) >= amount, "Insufficient balance");
        require(nonce == withdrawNonces[user], "Invalid nonce");

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                keccak256(abi.encode(address(this), user, amount, nonce))
            )
        );
        address signer = messageHash.recover(signature);
        require(signer == user, "Invalid signature");

        withdrawNonces[user]++;
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            user,
            amount
        );
        SmartWallet(payable(wallet)).executeTransaction(
            address(token),
            0,
            data
        );

        emit Withdrawn(user, amount);
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
}
