// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";
import "./CheckoutPool.sol";
import "./SmartWallet.sol";

/**
 * @title WalletFactory
 * @dev A factory contract for creating and managing SmartWallet instances with gasless withdrawal capabilities.
 *      Uses EIP-712 for typed signature verification and supports CheckoutPool integration.
 */
contract WalletFactory is EIP712 {
    using ECDSA for bytes32;

    /// @dev Maps user addresses to their corresponding SmartWallet addresses.
    mapping(address => address) public userWallets;

    /// @dev Tracks withdrawal nonces for each user to prevent replay attacks.
    mapping(address => uint256) public withdrawNonces;

    /// @dev The ERC20 token used for withdrawals (e.g., mUSDC), set at deployment.
    IERC20 public immutable token;

    /// @dev The address of the CheckoutPool contract, updatable until locked.
    address public checkoutPool;

    /// @dev Flag indicating if the contract is locked (immutable after locking).
    bool public locked;

    /// @dev The address that deployed the contract, used for locking permissions.
    address public immutable initialDeployer;

    /// @dev EIP-712 type hash for the Withdraw struct.
    bytes32 private constant WITHDRAW_TYPEHASH =
        keccak256("Withdraw(address user,uint256 amount,uint256 nonce)");

    /// @notice Emitted when a new SmartWallet is created for a user.
    /// @param user The address of the user owning the wallet.
    /// @param wallet The address of the newly created SmartWallet.
    event WalletCreated(address indexed user, address wallet);

    /// @notice Emitted when a withdrawal is successfully executed.
    /// @param user The address of the user who withdrew funds.
    /// @param amount The amount of tokens withdrawn.
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice Emitted when the CheckoutPool address is updated.
    /// @param newCheckoutPool The new CheckoutPool address.
    event CheckoutPoolUpdated(address indexed newCheckoutPool);

    /// @notice Emitted when the contract is locked, preventing further updates.
    event Locked();

    /**
     * @dev Initializes the WalletFactory with a token and initial deployer (CheckoutPool).
     * @param _token The address of the ERC20 token used for withdrawals.
     * @param _initialDeployer The initial CheckoutPool address and deployer.
     */
    constructor(address _token, address _initialDeployer) EIP712("WalletFactory", "1") {
        require(_initialDeployer != address(0), "Invalid checkout pool");
        checkoutPool = _initialDeployer;
        token = IERC20(_token);
        initialDeployer = _initialDeployer;
    }

    /**
     * @notice Creates a new SmartWallet for a user, callable only by the CheckoutPool.
     * @dev Deploys a SmartWallet instance and maps it to the user’s address.
     * @param user The address of the user for whom the wallet is created.
     */
    function createWallet(address user) external {
        require(msg.sender == address(checkoutPool), "Only CheckoutPool can call");
        require(user != address(0), "Invalid user address");
        require(userWallets[user] == address(0), "Wallet already exists");

        SmartWallet wallet = new SmartWallet(user, address(this));

        userWallets[user] = address(wallet);

        emit WalletCreated(user, address(wallet));
    }

    /**
     * @notice Retrieves the SmartWallet address for a given user.
     * @param user The address of the user.
     * @return The address of the user’s SmartWallet, or 0 if none exists.
     */
    function getWallet(address user) external view returns (address) {
             
        return userWallets[user];
    }

    /**
     * @notice Executes a gasless withdrawal of tokens to the user’s original account.
     * @dev Verifies an EIP-712 signature and transfers tokens via the user’s SmartWallet.
     * @param user The address of the user requesting the withdrawal.
     * @param amount The amount of tokens to withdraw (0 for full balance).
     * @param nonce The withdrawal nonce to prevent replay attacks.
     * @param signature The EIP-712 signature from the user authorizing the withdrawal.
     */
    function withdrawToOriginalAccountGasless(
        address user,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external {
        address wallet = userWallets[user];
        require(wallet != address(0), "No wallet found");
        require(nonce == withdrawNonces[user], "Invalid nonce");

        bytes32 structHash = keccak256(abi.encode(WITHDRAW_TYPEHASH, user, amount, nonce));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == user, "Invalid signature");

        withdrawNonces[user]++;
        uint256 transferAmount = amount == 0 ? token.balanceOf(wallet) : amount;

        bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", user, transferAmount);
        SmartWallet(payable(wallet)).executeTransaction(address(token), 0, data);

        emit Withdrawn(user, transferAmount);
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
}