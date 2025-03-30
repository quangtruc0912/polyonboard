// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";
import "./CheckoutPool.sol";

contract DepositForwarder {
    using SafeERC20 for IERC20;

    address public owner;
    address public checkoutPool;
    IERC20 public token;

    event Deposited(address indexed user, uint256 amount);

    constructor(address _owner, address _checkoutPool) {
        owner = _owner;
        checkoutPool = _checkoutPool;
        token = IERC20(CheckoutPool(_checkoutPool).token()); // Assume CheckoutPool has a public `token()` getter
    }

    // User calls this after sending tokens directly to the forwarder
    function forwardDeposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient tokens in forwarder"
        );

        // Forward tokens to CheckoutPool
        token.safeTransfer(checkoutPool, amount);

        // Call CheckoutPool to process the deposit
        (bool success, ) = checkoutPool.call(
            abi.encodeWithSignature(
                "deposit(address,uint256)",
                msg.sender,
                amount
            )
        );
        require(success, "Forwarder: deposit failed");

        emit Deposited(msg.sender, amount);
    }
}
