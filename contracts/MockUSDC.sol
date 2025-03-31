// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev A mock ERC20 token representing USDC with 6 decimals, used for testing purposes.
 *      Inherits from OpenZeppelin’s ERC20 and Ownable contracts.
 */
contract MockUSDC is ERC20, Ownable {
    /**
     * @dev Initializes the MockUSDC token with 1 million tokens minted to the deployer.
     *      Sets the token name to "Mock USDC" and symbol to "mUSDC".
     */
    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10**6); // 1M USDC with 6 decimals
    }

    /**
     * @notice Returns the number of decimals used by the token.
     * @dev Overrides the default ERC20 decimals to return 6, mimicking USDC.
     * @return The number of decimals (6).
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mints new tokens to a specified address, callable only by the owner.
     * @dev Uses ERC20’s internal _mint function to create new tokens.
     * @param to The address to receive the newly minted tokens.
     * @param amount The amount of tokens to mint (in wei, accounting for 6 decimals).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}