// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1_000_000 * 10**decimals()); // Initial supply
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC uses 6 decimal places
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
