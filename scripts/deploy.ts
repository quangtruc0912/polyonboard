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

    // Deploy Create2ForwarderFactory
    const Create2ForwarderFactory = await ethers.getContractFactory("Create2ForwarderFactory");
    const forwarderFactory = await Create2ForwarderFactory.deploy(deployer.address);
    await forwarderFactory.waitForDeployment();
    const forwarderFactoryAddress = await forwarderFactory.getAddress();
    console.log("Create2ForwarderFactory deployed to:", forwarderFactoryAddress);

    // Deploy WalletFactory
    const WalletFactory = await ethers.getContractFactory("WalletFactory");
    const walletFactory = await WalletFactory.deploy(mockUSDCAddress,deployer.address);
    await walletFactory.waitForDeployment();
    const walletFactoryAddress = await walletFactory.getAddress();
    console.log("WalletFactory deployed to:", walletFactoryAddress);

    // Deploy CheckoutPool with correct argument order
    const CheckoutPool = await ethers.getContractFactory("CheckoutPool");
    const checkoutPool = await CheckoutPool.deploy(
        mockUSDCAddress,
        forwarderFactoryAddress,
        walletFactoryAddress
    );
    await checkoutPool.waitForDeployment();
    const checkoutPoolAddress = await checkoutPool.getAddress();
    console.log("CheckoutPool deployed to:", checkoutPoolAddress);
    console.log("Token address in CheckoutPool:", await checkoutPool.token());



    const forwarderFactoryContract = await ethers.getContractAt("Create2ForwarderFactory", forwarderFactoryAddress);
    let tx = await forwarderFactoryContract.updateCheckoutPool(checkoutPoolAddress);
    await tx.wait();
    console.log("Create2ForwarderFactory updated with CheckoutPool address");

    const walletFactoryContract = await ethers.getContractAt("WalletFactory", walletFactoryAddress);
    tx = await walletFactoryContract.updateCheckoutPool(checkoutPoolAddress);
    await tx.wait();
    console.log("WalletFactory updated with CheckoutPool address");

    tx = await forwarderFactoryContract.lock();
    await tx.wait();
    console.log("Create2ForwarderFactory locked");

    tx = await walletFactoryContract.lock();
    await tx.wait();
    console.log("WalletFactory locked");

}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });