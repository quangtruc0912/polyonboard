import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", mockUSDCAddress);

    // Deploy WalletFactory (without NonCustodialDeposit)
    const WalletFactory = await ethers.getContractFactory("WalletFactory");
    const walletFactory = await WalletFactory.deploy(mockUSDCAddress);
    await walletFactory.waitForDeployment();
    const walletFactoryAddress = await walletFactory.getAddress();
    console.log("WalletFactory deployed to:", walletFactoryAddress);

    // Deploy NonCustodialDeposit
    const NonCustodialDeposit = await ethers.getContractFactory("NonCustodialDeposit");
    const nonCustodialDeposit = await NonCustodialDeposit.deploy(mockUSDCAddress, walletFactoryAddress);
    await nonCustodialDeposit.waitForDeployment();
    const nonCustodialDepositAddress = await nonCustodialDeposit.getAddress();
    console.log("NonCustodialDeposit deployed to:", nonCustodialDepositAddress);

    // Set deposit contract in WalletFactory
    const walletFactoryContract = await ethers.getContractAt("WalletFactory", walletFactoryAddress);
    const tx = await walletFactoryContract.updateDepositContract(nonCustodialDepositAddress);
    await tx.wait();
    console.log("WalletFactory updated with NonCustodialDeposit");
}

// Run deployment
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});