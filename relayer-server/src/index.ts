import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Relayer } from "./relayer";
import { Create2ForwarderFactory__factory } from "./typechain-types";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const {
    RPC_URL = "http://127.0.0.1:8545",
    PRIVATE_KEY = "",
    WALLET_FACTORY_ADDRESS = "",
    CREATE2_FORWARDER_FACTORY_ADDRESS = "",
    PORT = 3001,
} = process.env;

if (!PRIVATE_KEY || !WALLET_FACTORY_ADDRESS || !CREATE2_FORWARDER_FACTORY_ADDRESS) {
    throw new Error("Missing required environment variables");
}

console.log("Backend WalletFactory:", WALLET_FACTORY_ADDRESS);
const relayer = new Relayer(RPC_URL, PRIVATE_KEY, WALLET_FACTORY_ADDRESS, CREATE2_FORWARDER_FACTORY_ADDRESS);

// Define request body types for /transaction
interface TransactionRequestBody {
    txHash: string;
}

// Define request body types for /withdraw
interface WithdrawRequestBody {
    user: string;
    amount?: string; // Optional, as 0 means full withdrawal
    nonce: string;
    signature: string;
}

app.post("/transaction", async (req: Request, res: Response): Promise<void> => {
    try {
        const { txHash } = req.body as TransactionRequestBody;
        if (!txHash) {
            res.status(400).json({ error: "Missing txHash" });
            return;
        }

        await relayer.processDeposit(txHash);
        res.json({ success: true, message: "Deposit processed" });
    } catch (error: any) {
        console.error("Deposit error:", error);
        res.status(500).json({ error: error.message || "Failed to process deposit" });
    }
});

app.post("/withdraw", async (req: Request, res: Response): Promise<void> => {
    try {
        const { user, amount, nonce, signature } = req.body as WithdrawRequestBody;
        console.log('web',nonce)
        if (!user || !nonce || !signature) {
            res.status(400).json({ error: "Missing required fields (user, nonce, signature)" });
            return;
        }

        await relayer.processWithdrawal(user, amount || "0", nonce, signature);
        res.json({ success: true, message: "Withdrawal processed" });
    } catch (error: any) {
        console.error("Withdrawal error:", error);
        res.status(500).json({ error: error.message || "Failed to process withdrawal" });
    }
});

app.post("/create-forwarder", async (req: Request, res: Response): Promise<void> => {
    const { user } = req.body;

    if (!user) {
        res.status(400).json({ error: "Missing user address" });
        return;
    }

    try {
        const forwarderAddress = await relayer.deployForwarder(user);
        res.json({ success: true, forwarderAddress, message: "Forwarder created or already exists" });
    } catch (error: any) {
        console.error("Forwarder creation error:", error);
        res.status(500).json({ error: error.message || "Failed to create forwarder" });
    }
});

app.listen(PORT, () => {
    
    console.log(`Relayer server running on http://localhost:${PORT}`);
});

