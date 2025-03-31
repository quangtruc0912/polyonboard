import React, { useState } from "react";
import { ethers } from "ethers";
import {
    MockUSDC,
    MockUSDC__factory,
    Create2ForwarderFactory,
    Create2ForwarderFactory__factory,
    DepositForwarder__factory,
} from "../typechain-types";
import { CONTRACT_ADDRESSES } from "../contracts/addresses";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

interface DepositProps {
    provider: ethers.BrowserProvider;
    account: string;
    onDeposit: () => void;
}

export const Deposit: React.FC<DepositProps> = ({ provider, account, onDeposit }) => {
    const [amount, setAmount] = useState<string>("");
    const SALT = ethers.keccak256(ethers.toUtf8Bytes("depositForwarder"));

    const handleDeposit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const signer = await provider.getSigner();
        const mockUSDC: MockUSDC = MockUSDC__factory.connect(CONTRACT_ADDRESSES.MockUSDC, signer);
        const forwarderFactory: Create2ForwarderFactory = Create2ForwarderFactory__factory.connect(
            CONTRACT_ADDRESSES.Create2ForwarderFactory,
            signer
        );

        const forwarderAddress = await forwarderFactory.getForwarderAddress(account, SALT);
        const depositAmount = ethers.parseUnits(amount, 6);

        const tx = await mockUSDC.transfer(forwarderAddress, depositAmount);
        const receipt = await tx.wait();

        // Send tx hash to relayer
        const response = await fetch("http://localhost:3001/transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash: receipt?.hash || "" }),
        });

        if (response.ok) {
            alert(`Deposit of ${amount} mUSDC processed by relayer!`);
            onDeposit();
        } else {
            const error = await response.json();
            alert(`Deposit failed: ${error.error}`);
        }
    };

    return (
        <div>
            <h2>Deposit Tokens</h2>
            <TextField
                label="Amount (mUSDC)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                variant="outlined"
                style={{ marginBottom: "10px" }}
            />
            <br />
            <Button variant="contained" onClick={handleDeposit} disabled={!account}>
                Deposit
            </Button>
        </div>
    );
};