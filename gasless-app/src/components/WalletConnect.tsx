import React, { useState, useEffect } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import { ethers } from "ethers";
import { Create2ForwarderFactory__factory, WalletFactory__factory } from "../typechain-types";
import { CONTRACT_ADDRESSES } from "../contracts/addresses";
import Button from "@mui/material/Button";

interface WalletConnectProps {
    onConnect: (provider: ethers.BrowserProvider, account: string) => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
    const [account, setAccount] = useState<string | null>(null);
    const [forwarderAddress, setForwarderAddress] = useState<string | null>(null);
    const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
    const SALT = ethers.keccak256(ethers.toUtf8Bytes("depositForwarder"));

    const connectWallet = async () => {
        const provider = await detectEthereumProvider();
        if (provider) {
            const ethersProvider = new ethers.BrowserProvider(provider as any);
            const accounts = await ethersProvider.send("eth_requestAccounts", []);
            const account = accounts[0];
            const signer = await ethersProvider.getSigner();
            await updateAddresses(ethersProvider, account, signer);
            setAccount(account);
            onConnect(ethersProvider, account);
        } else {
            alert("Please install MetaMask!");
        }
    };

    const updateAddresses = async (
        ethersProvider: ethers.BrowserProvider,
        account: string,
        signer: ethers.Signer
    ) => {
        const forwarderFactory = Create2ForwarderFactory__factory.connect(
            CONTRACT_ADDRESSES.Create2ForwarderFactory,
            signer
        );
        const walletFactory = WalletFactory__factory.connect(
            CONTRACT_ADDRESSES.WalletFactory,
            signer
        );

        // Check Forwarder Address
        const computedForwarderAddress = await forwarderFactory.getForwarderAddress(account, SALT);
        const code = await ethersProvider.getCode(computedForwarderAddress);

        if (code === "0x") {
            const response = await fetch("http://localhost:3001/create-forwarder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: account }),
            });
            const result = await response.json();
            if (result.success) {
                console.log(`Forwarder created at: ${result.forwarderAddress}`);
                setForwarderAddress(result.forwarderAddress);
            }
        } else {
            console.log(`Forwarder already exists at: ${computedForwarderAddress}`);
            setForwarderAddress(computedForwarderAddress);
        }

        // Check SmartWallet Address
        const smartWallet = await walletFactory.userWallets(account);
        if (smartWallet === ethers.ZeroAddress) {
            console.log(`No SmartWallet exists for ${account} yet`);
            setSmartWalletAddress(null);
        } else {
            console.log(`SmartWallet address for ${account}: ${smartWallet}`);
            setSmartWalletAddress(smartWallet);
        }
    };

    const refreshSmartWallet = async () => {
        if (!account) return;
        const provider = await detectEthereumProvider();
        if (provider) {
            const ethersProvider = new ethers.BrowserProvider(provider as any);
            const signer = await ethersProvider.getSigner();
            await updateAddresses(ethersProvider, account, signer);
        }
    };

    useEffect(() => {
        if (account) return;

        let mounted = true;

        const checkConnection = async () => {
            const provider = await detectEthereumProvider();
            if (provider && (provider as any).selectedAddress && mounted && !account) {
                const ethersProvider = new ethers.BrowserProvider(provider as any);
                const accounts = await ethersProvider.listAccounts();
                if (accounts.length > 0) {
                    const account = accounts[0].address;
                    const signer = await ethersProvider.getSigner();
                    await updateAddresses(ethersProvider, account, signer);
                    if (mounted) {
                        setAccount(account);
                        onConnect(ethersProvider, account);
                    }
                }
            }
        };

        checkConnection();

        return () => {
            mounted = false;
        };
    }, [account, onConnect]);

    return (
        <div>
            {account ? (
                <div>
                    <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
                    {forwarderAddress && (
                        <p>Forwarder Address: {forwarderAddress.slice(0, 6)}...{forwarderAddress.slice(-4)}</p>
                    )}
                    {smartWalletAddress ? (
                        <p>Smart Wallet: {smartWalletAddress.slice(0, 6)}...{smartWalletAddress.slice(-4)}</p>
                    ) : (
                        <p>Smart Wallet: Not created yet</p>
                    )}
                    <Button variant="outlined" onClick={refreshSmartWallet} style={{ marginTop: "10px" }}>
                        Refresh Smart Wallet
                    </Button>
                </div>
            ) : (
                <Button variant="contained" onClick={connectWallet}>
                    Connect Wallet
                </Button>
            )}
        </div>
    );
};