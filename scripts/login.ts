const { ethers, keccak256, AbiCoder } = require("hardhat");

async function main() {
    const [user] = await ethers.getSigners();
    const walletFactoryAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const mockUSDCAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const checkoutPoolAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    const forwarderFactoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";




    // Attach to contracts
    const checkoutPool = await ethers.getContractAt("CheckoutPool", checkoutPoolAddress);
    const walletFactory = await ethers.getContractAt("WalletFactory", walletFactoryAddress);
    const mockUSDCContract = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
    const forwarderFactory = await ethers.getContractAt("Create2ForwarderFactory", forwarderFactoryAddress);

    console.log(`Interacting as: ${user.address}`);
    console.log(`Token in CheckoutPool: ${await checkoutPool.token()}`);
    console.log(`Expected token: ${mockUSDCAddress}`);

    // Mint 1M USDC
    const mintAmount = ethers.parseUnits("1000000", 6);
    const initialBalance = await mockUSDCContract.balanceOf(user.address);
    if (initialBalance < mintAmount) {
        await mockUSDCContract.connect(user).mint(user.address, mintAmount);
        console.log(`Minted ${ethers.formatUnits(mintAmount, 6)} mUSDC to ${user.address}`);
    }

    // Check initial USDC balance
    let userUSDCBalance = await mockUSDCContract.balanceOf(user.address);
    console.log(`Initial USDC Balance: ${ethers.formatUnits(userUSDCBalance, 6)} mUSDC`);

    // Deploy or attach Forwarder
    const salt = ethers.keccak256(ethers.toUtf8Bytes("depositForwarder"));
    const forwarderAddress = await forwarderFactory.getForwarderAddress(user.address, salt);
    console.log(`Computed forwarder address: ${forwarderAddress}`);
    console.log(`Expected forwarder in CheckoutPool: ${await forwarderFactory.getForwarderAddress(user.address, salt)}`);

    const codeAtAddress = await ethers.provider.getCode(forwarderAddress);
    let forwarder;

    if (codeAtAddress === "0x") {
        console.log("Forwarder not deployed at computed address. Deploying...");
        console.log("Forwarder factory",forwarderFactory)
        const tx = await forwarderFactory.deployForwarder(user.address, salt);
        await tx.wait();
   
        console.log(`Forwarder deployed to: ${forwarderAddress}`);
    } else {
        console.log(`Forwarder already exists at: ${forwarderAddress}`);
    }

    forwarder = await ethers.getContractAt("DepositForwarder", forwarderAddress);

    // First Deposit
    const depositAmount = ethers.parseUnits("5000", 6);

    console.log("\nFirst Deposit:");
    console.log(`User balance in CheckoutPool before: ${ethers.formatUnits(await checkoutPool.balances(user.address), 6)} mUSDC`);
    console.log(`Forwarder balance before transfer: ${ethers.formatUnits(await mockUSDCContract.balanceOf(forwarderAddress), 6)} mUSDC`);
    console.log(`CheckoutPool balance before: ${ethers.formatUnits(await mockUSDCContract.balanceOf(checkoutPoolAddress), 6)} mUSDC`);

    const transferTx = await mockUSDCContract.connect(user).transfer(forwarderAddress, depositAmount, { gasLimit: 100000 });
    await transferTx.wait();
    delay(1000)
    console.log(`User sent ${ethers.formatUnits(depositAmount, 6)} mUSDC to Forwarder (tx: ${transferTx.hash})`);
    console.log(`Forwarder balance after transfer: ${ethers.formatUnits(await mockUSDCContract.balanceOf(forwarderAddress), 6)} mUSDC`);

    try {
        console.log('abc', forwarder.address)
        const depositTx = await forwarder.connect(user).forwardDeposit(depositAmount);
        delay(1000)
        const receipt = await depositTx.wait();
        console.log(`Forwarder deposited ${ethers.formatUnits(depositAmount, 6)} mUSDC to CheckoutPool`);
        console.log(`Gas used for deposit: ${receipt.gasUsed.toString()}`);
    } catch (error: any) {
        console.error("Deposit failed:", error.message);
        if (error.reason) console.error("Revert reason:", error.reason);
        if (error.data) {
            console.error("Error data:", error.data);
            // Decode revert reason if possible
            try {
                const iface = new ethers.Interface(["function Error(string)"]);
                const decoded = iface.decodeErrorResult("Error", error.data);
                console.error("Decoded revert reason:", decoded[0]);
            } catch (decodeError: any) {
                console.error("Could not decode revert reason:", decodeError.message);
            }
        }
        return;
    }

    let userWallet = await walletFactory.getWallet(user.address);
    console.log(`Smart Wallet Address after first deposit: ${userWallet}`);
    console.log(`User balance in CheckoutPool after: ${ethers.formatUnits(await checkoutPool.balances(user.address), 6)} mUSDC`);
    console.log(`Wallet Balance after: ${ethers.formatUnits(await mockUSDCContract.balanceOf(userWallet), 6)} mUSDC`);

    // Second Deposit
    console.log("\nSecond Deposit:");
    console.log(`User balance in CheckoutPool before: ${ethers.formatUnits(await checkoutPool.balances(user.address), 6)} mUSDC`);
    console.log(`Forwarder balance before transfer: ${ethers.formatUnits(await mockUSDCContract.balanceOf(forwarderAddress), 6)} mUSDC`);
    console.log(`CheckoutPool balance before: ${ethers.formatUnits(await mockUSDCContract.balanceOf(checkoutPoolAddress), 6)} mUSDC`);

    const transferTx2 = await mockUSDCContract.connect(user).transfer(forwarderAddress, depositAmount, { gasLimit: 100000 });
    await transferTx2.wait();
    delay(1000)
    console.log(`User sent ${ethers.formatUnits(depositAmount, 6)} mUSDC to Forwarder (tx: ${transferTx2.hash})`);
    console.log(`Forwarder balance after transfer: ${ethers.formatUnits(await mockUSDCContract.balanceOf(forwarderAddress), 6)} mUSDC`);

    try {
        const depositTx2 = await forwarder.connect(user).forwardDeposit(depositAmount, { gasLimit: 500000 });
        delay(1000)
        const receipt2 = await depositTx2.wait();
        console.log(`Forwarder deposited ${ethers.formatUnits(depositAmount, 6)} mUSDC to CheckoutPool`);
        console.log(`Gas used for deposit: ${receipt2.gasUsed.toString()}`);
    } catch (error: any) {
        console.error("Deposit failed:", error.message);
        if (error.reason) console.error("Revert reason:", error.reason);
        if (error.data) console.error("Error data:", error.data);
        return;
    }

    console.log(`User balance in CheckoutPool after: ${ethers.formatUnits(await checkoutPool.balances(user.address), 6)} mUSDC`);
    console.log(`Wallet Balance after: ${ethers.formatUnits(await mockUSDCContract.balanceOf(userWallet), 6)} mUSDC`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

function delay(time:any) {
    return new Promise(resolve => setTimeout(resolve, time));
}