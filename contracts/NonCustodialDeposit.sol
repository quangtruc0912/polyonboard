// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./WalletFactory.sol";

contract NonCustodialDeposit {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    WalletFactory public immutable walletFactory;
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _token, address _walletFactory) {
        require(_token != address(0) && _walletFactory != address(0), "Invalid addresses");
        token = IERC20(_token);
        walletFactory = WalletFactory(_walletFactory);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        
        if (walletFactory.getWallet(msg.sender) == address(0)) {
            walletFactory.createWallet(msg.sender);
        }

        emit Deposited(msg.sender, amount);
    }

    function withdrawToSmartWallet(address user, address wallet, uint256 amount) external {
        require(msg.sender == address(walletFactory), "Only factory can call");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[user] >= amount, "Insufficient balance");

        balances[user] -= amount;
        token.safeTransfer(wallet, amount);
        
        emit Withdrawn(user, amount);
    }
}
