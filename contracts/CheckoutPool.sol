// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./WalletFactory.sol";
import "./Create2ForwarderFactory.sol";
import "hardhat/console.sol";

/**
 * @title CheckoutPool
 * @dev Manages token deposits, forwards them to user wallets via a WalletFactory,
 *      and integrates with a Create2ForwarderFactory for deposit forwarding.
 *      Utilizes SafeERC20 for secure token transfers.
 */
contract CheckoutPool {
    using SafeERC20 for IERC20;

    /// @dev The ERC20 token used for deposits and transfers (e.g., mUSDC).
    IERC20 private _token;

    /// @dev The factory contract for deploying DepositForwarder instances.
    Create2ForwarderFactory public forwarderFactory;

    /// @dev The factory contract for creating and managing SmartWallet instances.
    WalletFactory public walletFactory;

    /// @dev Tracks the token balance for each user before transferring to their wallet.
    mapping(address => uint256) public balances;

    /// @dev Tracks nonces for each user, potentially for signature-based operations.
    mapping(address => uint256) public nonces;

    /// @dev Constant salt used for deterministic CREATE2 deployment of forwarders.
    bytes32 private constant SALT = keccak256(abi.encodePacked("depositForwarder"));

    /// @notice Emitted when tokens are deposited for a user.
    event Deposited(address indexed user, uint256 amount);

    /// @notice Emitted when tokens are transferred from the pool to a user’s wallet.
    event TransferredToWallet(address indexed user, address indexed wallet, uint256 amount);

    /// @notice Emitted when tokens are withdrawn (future feature).
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @dev Initializes the CheckoutPool with token and factory contract addresses.
     * @param _tokenAddress The address of the ERC20 token used for deposits.
     * @param _forwarderFactory The address of the Create2ForwarderFactory contract.
     * @param _walletFactory The address of the WalletFactory contract.
     */
    constructor(
        address _tokenAddress,
        address _forwarderFactory,
        address _walletFactory
    ) {
        _token = IERC20(_tokenAddress);
        forwarderFactory = Create2ForwarderFactory(_forwarderFactory);
        walletFactory = WalletFactory(_walletFactory);
    }

    /**
     * @notice Deposits tokens for a user and transfers them to their wallet.
     * @dev Only callable by the corresponding deposit forwarder.
     * @param user The address of the user receiving the deposit.
     * @param amount The amount of tokens deposited.
     */
    function deposit(address user, uint256 amount) external {
        console.log("Deposit called");
        
        address forwarder = forwarderFactory.getForwarderAddress(user, SALT);
        require(msg.sender == forwarder, "Only forwarder can call");
        require(amount > 0, "Amount must be greater than 0");
        
        balances[user] += amount;
        emit Deposited(user, amount);
        console.log("User:", user);
        
        // Ensure the wallet exists, create if not, then transfer funds
        address wallet = walletFactory.getWallet(user);
        console.log("Wallet:", wallet);
        
        if (wallet == address(0)) {
            walletFactory.createWallet(user);
            wallet = walletFactory.getWallet(user);
        }
        
        uint256 balanceToTransfer = balances[user];
        balances[user] = 0;
        _token.safeTransfer(wallet, balanceToTransfer);
        
        emit TransferredToWallet(user, wallet, balanceToTransfer);
    }

    /**
     * @notice Returns the ERC20 token contract address used by the pool.
     * @return The IERC20 interface of the token contract.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @notice Retrieves the current nonce for a user.
     * @param user The address of the user.
     * @return The user’s current nonce.
     */
    function getNonce(address user) public view returns (uint256) {
        return nonces[user];
    }

    /**
     * @notice Increments the nonce for a user, callable only by their DepositForwarder.
     * @param user The address of the user whose nonce is incremented.
     */
    function incrementNonce(address user) external {
        address forwarder = forwarderFactory.getForwarderAddress(user, SALT);
        require(msg.sender == forwarder, "Only forwarder can call");
        nonces[user]++;
    }
}
