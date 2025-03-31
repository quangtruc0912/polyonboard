// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { ContractRunner, EventLog, Signer, TransactionReceipt } from "ethers";
// import {
//     MockUSDC,
//     WalletFactory,
//     SmartWallet,
//     CheckoutPool,
//     DepositForwarder,
//     Create2ForwarderFactory,
//     MockUSDC__factory,
//     WalletFactory__factory,
//     SmartWallet__factory,
//     CheckoutPool__factory,
//     DepositForwarder__factory,
//     Create2ForwarderFactory__factory
// } from "../typechain-types";

// describe("Gasless Withdrawal and Deposit System", function () {
//     let MockUSDC: MockUSDC__factory;
//     let mockUSDC: MockUSDC;
//     let WalletFactory: WalletFactory__factory;
//     let walletFactory: WalletFactory;
//     let SmartWallet: SmartWallet__factory;
//     let CheckoutPool: CheckoutPool__factory;
//     let checkoutPool: CheckoutPool;
//     let DepositForwarder: DepositForwarder__factory;
//     let depositForwarder: DepositForwarder;
//     let Create2ForwarderFactory: Create2ForwarderFactory__factory;
//     let forwarderFactory: Create2ForwarderFactory;
//     let newforwarderAddress : string;
//     let owner: Signer;
//     let user: Signer;
//     let relayer: Signer;
//     const SALT: string = ethers.keccak256(ethers.toUtf8Bytes("depositForwarder"));
//     const depositAmount: bigint = ethers.parseUnits("1000", 6); // 1000 mUSDC (6 decimals)

//     beforeEach(async function () {
//         [owner, user, relayer] = await ethers.getSigners();

//         // Deploy MockUSDC
//         MockUSDC = (await ethers.getContractFactory("MockUSDC")) as unknown as MockUSDC__factory;
//         mockUSDC = (await MockUSDC.deploy()) as MockUSDC;
//         await mockUSDC.waitForDeployment();

//         // Deploy WalletFactory
//         WalletFactory = (await ethers.getContractFactory("WalletFactory")) as unknown as WalletFactory__factory;
//         walletFactory = (await WalletFactory.deploy(await mockUSDC.getAddress(), await owner.getAddress())) as WalletFactory;
//         await walletFactory.waitForDeployment();

//         // Deploy Create2ForwarderFactory
//         Create2ForwarderFactory = (await ethers.getContractFactory("Create2ForwarderFactory")) as unknown as Create2ForwarderFactory__factory;
//         forwarderFactory = (await Create2ForwarderFactory.deploy(await owner.getAddress())) as Create2ForwarderFactory;
//         await forwarderFactory.waitForDeployment();

//         // Deploy CheckoutPool
//         CheckoutPool = (await ethers.getContractFactory("CheckoutPool")) as unknown as CheckoutPool__factory;
//         checkoutPool = (await CheckoutPool.deploy(
//             await mockUSDC.getAddress(),
//             await forwarderFactory.getAddress(),
//             await walletFactory.getAddress()
//         )) as CheckoutPool;

//         await checkoutPool.waitForDeployment();

//         // Update WalletFactory’s checkoutPool (since constructor sets it to owner initially)
//         await walletFactory.updateCheckoutPool(await checkoutPool.getAddress());
//         await forwarderFactory.updateCheckoutPool(await checkoutPool.getAddress())
//         // Deploy DepositForwarder via Create2ForwarderFactory

//          newforwarderAddress = await forwarderFactory.getForwarderAddress(await user.getAddress(), SALT);


//         const forwarderTx = await forwarderFactory.deployForwarder(await user.getAddress(), SALT, { gasLimit: 5_000_000 });

//         const forwarderReceipt = await forwarderTx.wait();

//         if (!forwarderReceipt) {
//             throw new Error("Transaction receipt is null");
//         }

//         const forwarderEvent = forwarderReceipt.logs[0] as any; // Cast to 'any' to access 'args'
//         const forwarderAddress: string = forwarderEvent.args[1]; // Extract from ForwarderDeployed event
//         DepositForwarder = (await ethers.getContractFactory("DepositForwarder")) as unknown as DepositForwarder__factory;
//         depositForwarder = DepositForwarder.attach(forwarderAddress) as DepositForwarder;

//         await mockUSDC.mint(await user.getAddress(), ethers.parseUnits("10000", 6));
//     });

//     describe("MockUSDC", function () {
//         it("should have correct decimals and initial supply", async function () {

//             expect(await mockUSDC.decimals()).to.equal(6);
//             expect(await mockUSDC.balanceOf(await owner.getAddress())).to.equal(ethers.parseUnits("1000000", 6));
//         });

//         it("should allow owner to mint tokens", async function () {
//             await mockUSDC.mint(await user.getAddress(), depositAmount);
//             expect(await mockUSDC.balanceOf(await user.getAddress())).to.equal(ethers.parseUnits("11000", 6));
//         });
//     });

//     describe("SmartWallet", function () {
//         it("should initialize with correct owner and factory", async function () {
//             SmartWallet = (await ethers.getContractFactory("SmartWallet")) as unknown as SmartWallet__factory;
//             const smartWallet: SmartWallet = (await SmartWallet.deploy(await user.getAddress(), await walletFactory.getAddress())) as SmartWallet;
//             await smartWallet.waitForDeployment();
//             expect(await smartWallet.owner()).to.equal(await user.getAddress());
//             expect(await smartWallet.factory()).to.equal(await walletFactory.getAddress());
//         });

//         it("should only allow factory to execute transactions", async function () {
//             SmartWallet = (await ethers.getContractFactory("SmartWallet")) as unknown as SmartWallet__factory;
//             const smartWallet: SmartWallet = (await SmartWallet.deploy(await user.getAddress(), await walletFactory.getAddress())) as SmartWallet;
//             await smartWallet.waitForDeployment();

//             const data: string = mockUSDC.interface.encodeFunctionData("transfer", [await user.getAddress(), depositAmount]);
//             await expect(smartWallet.connect(user).executeTransaction(await mockUSDC.getAddress(), 0, data))
//                 .to.be.revertedWith("Only factory can call");
//         });
//     });

//     describe("DepositForwarder", function () {
//         it("should forward deposits to CheckoutPool", async function () {

//             await mockUSDC.connect(user).transfer(newforwarderAddress, depositAmount);
//             console.log((await mockUSDC.balanceOf(newforwarderAddress)))
//             const tx = await depositForwarder.connect(owner).forwardDeposit(depositAmount);
//             await tx.wait();

    
//             expect(await mockUSDC.balanceOf(await checkoutPool.getAddress())).to.equal(0); // Transferred to wallet
//             const walletAddress: string = await walletFactory.getWallet(await user.getAddress());

//             expect(await mockUSDC.balanceOf(walletAddress)).to.equal(depositAmount);
//         });

//         it("should revert if called by non-admin", async function () {
//             await expect(depositForwarder.connect(user).forwardDeposit(depositAmount))
//                 .to.be.revertedWith("Only admin/relayer can call");
//         });
//     });

//     describe("Create2ForwarderFactory", function () {
//         it("should deploy forwarder with deterministic address", async function () {
//             const predictedAddress: string = await forwarderFactory.getForwarderAddress(await user.getAddress(), SALT);
//             const tx = await forwarderFactory.deployForwarder(await user.getAddress(), SALT);
//             const receipt = await tx.wait();
//             if (!receipt) {
//                 throw new Error("Transaction receipt is null");
//             }
//             const deployedAddress: string = (receipt.logs[0] as EventLog).args[1]; // From ForwarderDeployed event

//             expect(deployedAddress).to.equal(predictedAddress);
//             const forwarder: DepositForwarder = (await ethers.getContractAt("DepositForwarder", deployedAddress)) as unknown as DepositForwarder;
//             expect(await forwarder.admin()).to.equal(await owner.getAddress());
//             expect(await forwarder.checkoutPool()).to.equal(await checkoutPool.getAddress());
//         });

//         it("should allow checkoutPool update and lock", async function () {
//             const newCheckoutPool: string = await user.getAddress();
//             await forwarderFactory.connect(checkoutPool as unknown as ContractRunner).updateCheckoutPool(newCheckoutPool);
//             expect(await forwarderFactory.checkoutPool()).to.equal(newCheckoutPool);

//             await forwarderFactory.connect(owner).lock();
//             expect(await forwarderFactory.locked()).to.be.true;

//             await expect(forwarderFactory.connect(checkoutPool as unknown as ContractRunner).updateCheckoutPool(await owner.getAddress()))
//                 .to.be.revertedWith("Contract is locked");
//         });
//     });

//     describe("CheckoutPool", function () {
//         it("should process deposit and transfer to wallet", async function () {
//             await mockUSDC.connect(user).approve(await depositForwarder.getAddress(), depositAmount);
//             await mockUSDC.connect(user).transfer(await depositForwarder.getAddress(), depositAmount);

//             const userBalanceBefore: bigint = await mockUSDC.balanceOf(await user.getAddress());
//             await depositForwarder.connect(owner).forwardDeposit(depositAmount);

//             const walletAddress: string = await walletFactory.getWallet(await user.getAddress());
//             expect(await mockUSDC.balanceOf(walletAddress)).to.equal(depositAmount);
//             expect(await checkoutPool.balances(await user.getAddress())).to.equal(0);
//             expect(await mockUSDC.balanceOf(await user.getAddress())).to.equal(userBalanceBefore - depositAmount);
//         });

//         it("should increment nonce only from forwarder", async function () {
//             const nonceBefore: bigint = await checkoutPool.getNonce(await user.getAddress());
//             await checkoutPool.connect(depositForwarder as unknown as ContractRunner).incrementNonce(await user.getAddress());
//             expect(await checkoutPool.getNonce(await user.getAddress())).to.equal(nonceBefore + 1n);

//             await expect(checkoutPool.connect(user).incrementNonce(await user.getAddress()))
//                 .to.be.revertedWith("Only forwarder can call");
//         });
//     });
// });