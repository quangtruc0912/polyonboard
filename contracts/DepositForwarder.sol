// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";
import "./CheckoutPool.sol";

contract DepositForwarder {
    using SafeERC20 for IERC20;

    /// @notice Address of the forwarder owner (typically the user)
    address public owner;

    /// @notice Address of the CheckoutPool contract where deposits are forwarded
    address public checkoutPool;

    /// @notice ERC20 token being handled
    IERC20 public token;

    /// @notice Emitted when a deposit is successfully forwarded to the CheckoutPool
    event Deposited(address indexed user, uint256 amount);

    /**
     * @dev Initializes the DepositForwarder with the owner and CheckoutPool address.
     * @param _owner The address that owns this forwarder.
     * @param _checkoutPool The address of the CheckoutPool contract.
     */
    constructor(address _owner, address _checkoutPool) {
        owner = _owner;
        checkoutPool = _checkoutPool;
        token = IERC20(CheckoutPool(_checkoutPool).token()); // Assume CheckoutPool has a public `token()` getter
    }

    /**
     * @notice Forwards deposited tokens to the CheckoutPool and calls its deposit function.
     * @dev Only the forwarder owner can trigger this function.
     * @param amount The amount of tokens to forward.
     * @param user The address of the user associated with the deposit.
     */
    function forwardDeposit(uint256 amount, address user) external {
        require(owner == user, "Only owner can send request");
        require(amount > 0, "Amount must be greater than 0");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient tokens in forwarder"
        );

        // Forward tokens to CheckoutPool
        token.safeTransfer(checkoutPool, amount);

        // Call CheckoutPool to process the deposit
        (bool success, ) = checkoutPool.call(
            abi.encodeWithSignature("deposit(address,uint256)", user, amount)
        );
        require(success, "Forwarder: deposit failed");

        emit Deposited(user, amount);
    }
}
