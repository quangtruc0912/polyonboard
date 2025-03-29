import { ethers } from "hardhat";

async function main() {
    const [user] = await ethers.getSigners();
    const walletFactoryAddress = "0x4A679253410272dd5232B3Ff7cF5dbB88f295319";
    const mockUSDCAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
    const nonCustodialDepositAddress = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F";

    const walletFactory = await ethers.getContractAt("WalletFactory", walletFactoryAddress);
    const mockUSDCContract = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
    const nonCustodialDepositContract = await ethers.getContractAt("NonCustodialDeposit", nonCustodialDepositAddress);

    console.log(`Interacting as: ${user.address}`);

    // Default Mint 1M USDC for deployer 

    // Approve NonCustodialDeposit contract
    await mockUSDCContract.connect(user).approve(nonCustodialDepositContract.target, ethers.parseUnits("500000", 6));
    console.log("Approved 500000 USDC for deposit");

    const allowance = await mockUSDCContract.allowance(user.address, nonCustodialDepositContract.target);
    console.log(`Allowance: ${ethers.formatUnits(allowance, 6)} mUSDC`);


    let userUSDCBalance = await mockUSDCContract.balanceOf(user.address);
    console.log(`USDC BALANACE: ${ethers.formatUnits(userUSDCBalance, 6)} mUSDC`);

    const userDepositBalance = await nonCustodialDepositContract.balances(user.address);
    console.log(`User balance in deposit contract: ${ethers.formatUnits(userDepositBalance, 6)} mUSDC`);

    // Deposit into NonCustodialDeposit contract
    await nonCustodialDepositContract.connect(user).deposit(ethers.parseUnits("5000", 6));
    console.log("User deposited 5000 mUSDC");

    // Check if user has a wallet
    let userWallet = await walletFactory.getWallet(user.address);
    console.log("User wallet after deposit:", userWallet);

    if (userWallet === ethers.ZeroAddress) {
        console.log("No wallet found. The deposit contract should call handleDeposit.");
    }

    // Fetch wallet again after deposit handling
    userWallet = await walletFactory.getWallet(user.address);
    console.log(`Updated Smart Wallet Address: ${userWallet}`);

    // Check balance
    let walletBalance = await mockUSDCContract.balanceOf(userWallet);
    console.log(`Wallet Balance: ${ethers.formatUnits(walletBalance, 6)} mUSDC`);

    // Withdraw funds back to user
    const withdrawAmount = ethers.parseUnits("4000", 6);
    const withdrawTx = await walletFactory.connect(user).withdrawToOriginalAccount(withdrawAmount);
    await withdrawTx.wait();
    console.log(`Withdrawn ${ethers.formatUnits(withdrawAmount, 6)} mUSDC to ${user.address}`);

    // Check balance after
    walletBalance = await mockUSDCContract.balanceOf(userWallet);
    console.log(`Wallet Balance after: ${ethers.formatUnits(walletBalance, 6)} mUSDC`);

    userUSDCBalance = await mockUSDCContract.balanceOf(user.address);
    console.log(`Wallet Original Balance after: ${ethers.formatUnits(userUSDCBalance, 6)} mUSDC`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });