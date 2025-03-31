import React, { useState } from "react";
import { ethers } from "ethers";
import {
    WalletFactory,
    WalletFactory__factory,
    MockUSDC__factory,
} from "../typechain-types";
import { CONTRACT_ADDRESSES } from "../contracts/addresses";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

interface WithdrawProps {
    provider: ethers.BrowserProvider;
    account: string;
    onWithdraw: () => void;
}

export const Withdraw: React.FC<WithdrawProps> = ({ provider, account, onWithdraw }) => {
    const [amount, setAmount] = useState<string>("");

    const handleWithdraw = async () => {
        const signer = await provider.getSigner();
        const walletFactory = WalletFactory__factory.connect(CONTRACT_ADDRESSES.WalletFactory, provider);
    
        // Fetch initial nonce
        const nonce = await walletFactory.withdrawNonces(account);
        console.log(`Fetched nonce before withdrawal: ${nonce.toString()}`);
    
        const withdrawAmount = amount ? ethers.parseUnits(amount, 6) : BigInt(0);
        const domain = { name: "WalletFactory", version: "1", chainId: 31337, verifyingContract: CONTRACT_ADDRESSES.WalletFactory };
        const types = { Withdraw: [{ name: "user", type: "address" }, { name: "amount", type: "uint256" }, { name: "nonce", type: "uint256" }] };
        const value = { user: account, amount: withdrawAmount, nonce };
        const signature = await signer.signTypedData(domain, types, value);
    
        const response = await fetch("http://localhost:3001/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: account, amount, nonce: nonce.toString(), signature }),
        });
    
        if (response.ok) {
            const result = await response.json();
            const txHash = result.txHash; // Ensure relayer returns this
            console.log(`Waiting for tx: ${txHash}`);
            await provider.waitForTransaction(txHash); // Sync provider state
            const updatedNonce = await walletFactory.getWithdrawNonce(account);
            console.log(`Fetched nonce after withdrawal: ${updatedNonce.toString()}`);
            alert(`Withdrawn ${amount || "all"} mUSDC!`);
            onWithdraw();
        } else {
            const error = await response.json();
            alert(`Withdrawal failed: ${error.error}`);
        }
    };

    return (
        <div>
            <h2>Withdraw Tokens</h2>
            <TextField
                label="Amount (mUSDC, leave blank for full withdrawal)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                variant="outlined"
                style={{ marginBottom: "10px" }}
            />
            <br />
            <Button variant="contained" onClick={handleWithdraw} disabled={!account}>
                Withdraw
            </Button>
        </div>
    );
};