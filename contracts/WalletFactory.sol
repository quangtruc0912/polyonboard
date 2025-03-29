// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./NonCustodialDeposit.sol";
import "./SmartWallet.sol";

contract WalletFactory is Ownable {
    using SafeERC20 for IERC20;

    mapping(address => address) public userWallets;
    IERC20 public immutable token;
    NonCustodialDeposit public depositContract;

    event WalletCreated(address indexed user, address wallet);
    event WithdrawnToOriginalAccount(address indexed user, uint256 amount);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    function createWallet(address user) external {
        require(user != address(0), "Invalid user address");
        require(userWallets[user] == address(0), "Wallet already exists");

        SmartWallet wallet = new SmartWallet(user, address(this));
        userWallets[user] = address(wallet);

        uint256 userBalance = depositContract.balances(user);
        if (userBalance > 0) {
            depositContract.withdrawToSmartWallet(
                user,
                address(wallet),
                userBalance
            );
        }

        emit WalletCreated(user, address(wallet));
    }

    function getWallet(address user) external view returns (address) {
        return userWallets[user];
    }

    function withdrawToOriginalAccount(uint256 amount) external {
        address wallet = userWallets[msg.sender];
        require(wallet != address(0), "No wallet found");
        require(token.balanceOf(wallet) >= amount, "Insufficient balance");

        // Encode ERC20 transfer call: transfer(msg.sender, amount)
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            msg.sender,
            amount
        );

        // Call token contract, not msg.sender, with value = 0
        SmartWallet(payable(wallet)).executeTransaction(
            address(token),
            0,
            data
        );
        emit WithdrawnToOriginalAccount(msg.sender, amount);
    }

    function updateDepositContract(
        address _depositContract
    ) external onlyOwner {
        require(
            address(depositContract) == address(0),
            "Deposit contract already set"
        );
        require(_depositContract != address(0), "Invalid address");
        depositContract = NonCustodialDeposit(_depositContract);
    }
}
