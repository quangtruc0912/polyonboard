// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./WalletFactory.sol";
import "./Create2ForwarderFactory.sol";

contract CheckoutPool {
    using SafeERC20 for IERC20;

    IERC20 private _token; // Private to avoid direct modification
    Create2ForwarderFactory public forwarderFactory;
    WalletFactory public walletFactory;
    mapping(address => uint256) public balances;
    bytes32 constant SALT = keccak256(abi.encodePacked("depositForwarder"));

    event Deposited(address indexed user, uint256 amount);
    event TransferredToWallet(
        address indexed user,
        address indexed wallet,
        uint256 amount
    );

    constructor(
        address _tokenAddress,
        address _forwarderFactory,
        address _walletFactory
    ) {
        _token = IERC20(_tokenAddress);
        forwarderFactory = Create2ForwarderFactory(_forwarderFactory);
        walletFactory = WalletFactory(_walletFactory);
    }

    function deposit(address user, uint256 amount) external {
        address forwarder = forwarderFactory.getForwarderAddress(user, SALT);
        require(msg.sender == forwarder, "Only forwarder can call");
        require(amount > 0, "Amount must be greater than 0");

        balances[user] += amount;

        emit Deposited(user, amount);

        // Check if wallet exists, create if not, and transfer all funds
        address wallet = walletFactory.getWallet(user);
        if (wallet == address(0)) {
            walletFactory.createWallet(user);
            wallet = walletFactory.getWallet(user);
        }
        uint256 balanceToTransfer = balances[user];
        balances[user] = 0;
        _token.safeTransfer(wallet, balanceToTransfer);
        emit TransferredToWallet(user, wallet, balanceToTransfer);
    }

    function token() public view returns (IERC20) {
        return _token;
    }

    function getMessageHash(
        address user,
        uint256 amount,
        uint256 nonce
    ) public view returns (bytes32) {
        address forwarder = forwarderFactory.getForwarderAddress(user, SALT);
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    keccak256(
                        abi.encode(forwarder, address(this), amount, nonce)
                    )
                )
            );
    }
}
