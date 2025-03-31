import { ethers } from "ethers";
import {
    DepositForwarder,
    DepositForwarder__factory,
    WalletFactory,
    WalletFactory__factory,
    Create2ForwarderFactory,
    Create2ForwarderFactory__factory,
    MockUSDC__factory,
} from "./typechain-types";

export class Relayer {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private walletFactory: WalletFactory;
    private forwarderFactory: Create2ForwarderFactory;
    private mockUSDC: ReturnType<typeof MockUSDC__factory.connect>;
    private SALT = ethers.keccak256(ethers.toUtf8Bytes("depositForwarder"));

    constructor(rpcUrl: string, privateKey: string, walletFactoryAddress: string, forwarderFactoryAddress: string) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.walletFactory = WalletFactory__factory.connect(walletFactoryAddress, this.wallet);
        this.forwarderFactory = Create2ForwarderFactory__factory.connect(forwarderFactoryAddress, this.wallet);
        this.mockUSDC = MockUSDC__factory.connect(process.env.MOCK_USDC_ADDRESS || "", this.wallet);
    }

    // Verify transaction and process deposit
    async processDeposit(txHash: string): Promise<void> {
        const txReceipt = await this.provider.getTransactionReceipt(txHash);
        if (!txReceipt || !txReceipt.status) {
            throw new Error("Transaction not found or failed");
        }

        // Parse Transfer event from MockUSDC to find user and amount
        const mockUSDCInterface = this.mockUSDC.interface;
        const transferLog = txReceipt.logs.find((log) =>
            log.topics[0] === mockUSDCInterface.getEvent("Transfer")?.topicHash
        );
        if (!transferLog) {
            throw new Error("No Transfer event found in transaction");
        }

        const parsedLog = mockUSDCInterface.parseLog(transferLog);
        if (!parsedLog) {
            throw new Error("Failed to parse Transfer event log");
        }
        const from = parsedLog.args[0] as string; // User who sent tokens
        const to = parsedLog.args[1] as string;   // DepositForwarder address
        const amount = BigInt(parsedLog.args[2]); // Amount transferred

        const expectedForwarderAddress = await this.forwarderFactory.getForwarderAddress(from, this.SALT);
        if (to.toLowerCase() !== expectedForwarderAddress.toLowerCase()) {
            throw new Error("Transfer not sent to correct forwarder address");
        }

        const depositForwarder: DepositForwarder = DepositForwarder__factory.connect(to, this.wallet);

        // Deploy forwarder if not exists
        const code = await this.provider.getCode(to);
        if (code === "0x") {
            console.log(`Deploying forwarder for ${from} at ${to}`);
            await (await this.forwarderFactory.deployForwarder(from, this.SALT)).wait();
        }

        console.log(`Processing deposit for ${from}: ${ethers.formatUnits(amount, 6)} mUSDC`);
        const tx = await depositForwarder.forwardDeposit(amount, from, {});
        await tx.wait();
        console.log(`Deposit processed: ${tx.hash}`);
    }

    // Process withdrawal
    async processWithdrawal(user: string, amount: string, nonce: string, signature: string): Promise<void> {
        const withdrawAmount = amount ? ethers.parseUnits(amount, 6) : 0n;
        const nonceBigInt = BigInt(nonce);

        console.log(`Processing withdrawal for ${user}: ${ethers.formatUnits(withdrawAmount, 6)} mUSDC`);
        const tx = await this.walletFactory.withdrawToOriginalAccountGasless(user, withdrawAmount, nonceBigInt, signature);
        await tx.wait();
        console.log(`Withdrawal processed: ${tx.hash}`);
        console.log(`New nonce for ${user}: ${await this.walletFactory.getWithdrawNonce(user)}`);
        // Return tx hash in response
    }


    async deployForwarder(user: string): Promise<string> {
        const forwarderAddress = await this.forwarderFactory.getForwarderAddress(user, this.SALT);
        const code = await this.provider.getCode(forwarderAddress);
        if (code === "0x") {
            console.log(`Deploying forwarder for ${user} at ${forwarderAddress}`);
            const tx = await this.forwarderFactory.deployForwarder(user, this.SALT);
            await tx.wait();
            console.log(`Forwarder deployed: ${tx.hash}`);
        } else {
            console.log(`Forwarder already exists for ${user} at ${forwarderAddress}`);
        }
        return forwarderAddress;
    }
}