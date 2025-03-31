import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
    MockUSDC__factory,
    WalletFactory__factory,
    SmartWallet__factory,
    Create2ForwarderFactory__factory,
} from "./typechain-types";
import { CONTRACT_ADDRESSES } from "./contracts/addresses";
import { WalletConnect } from "./components/WalletConnect";
import { Deposit } from "./components/Deposit";
import { Withdraw } from "./components/Withdraw";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

function App() {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [userBalance, setUserBalance] = useState<string>("0");
    const [walletBalance, setWalletBalance] = useState<string>("0");
    const SALT = ethers.keccak256(ethers.toUtf8Bytes("depositForwarder"));

    const handleConnect = (prov: ethers.BrowserProvider, acc: string) => {
        setProvider(prov);
        setAccount(acc);
    };

    const fetchBalances = async () => {
        if (!provider || !account) return;

        const signer = await provider.getSigner();
        const mockUSDC = MockUSDC__factory.connect(CONTRACT_ADDRESSES.MockUSDC, signer);
        const walletFactory = WalletFactory__factory.connect(CONTRACT_ADDRESSES.WalletFactory, signer);
        const forwarderFactory = Create2ForwarderFactory__factory.connect(
            CONTRACT_ADDRESSES.Create2ForwarderFactory,
            signer
        );

        // User EOA balance
        const userBal = await mockUSDC.balanceOf(account);
        setUserBalance(ethers.formatUnits(userBal, 6));

        // SmartWallet balance
        const walletAddress = await walletFactory.getWallet(account);
        if (walletAddress !== ethers.ZeroAddress) {
            const smartWallet = SmartWallet__factory.connect(walletAddress, signer);
            const walletBal = await mockUSDC.balanceOf(walletAddress);
            setWalletBalance(ethers.formatUnits(walletBal, 6));
        } else {
            setWalletBalance("0");
        }
    };

    useEffect(() => {
        fetchBalances();
        const interval = setInterval(fetchBalances, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [provider, account]);

    return (
        <Container maxWidth="sm" style={{ padding: "20px" }}>
            <Typography variant="h4" gutterBottom>
                Gasless Deposit & Withdrawal
            </Typography>
            <WalletConnect onConnect={handleConnect} />
            {provider && account && (
                <>
                    <Card style={{ marginBottom: "20px" }}>
                        <CardContent>
                            <Typography variant="h6">Balances</Typography>
                            <Typography>User Balance: {userBalance} mUSDC</Typography>
                            <Typography>SmartWallet Balance: {walletBalance} mUSDC</Typography>
                        </CardContent>
                    </Card>
                    <Deposit provider={provider} account={account} onDeposit={fetchBalances} />
                    <Withdraw provider={provider} account={account} onWithdraw={fetchBalances} />
                </>
            )}
        </Container>
    );
}

export default App;