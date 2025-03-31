# Simple onboarding like polymarket
A simple onboarding process like Polymarket  Here’s a summary of key elements:
Wallet Connection – Users can sign up quickly using MetaMask
Forward deposit –  A smart contract automatically transfers received assets to the destination address.
Smart Wallet –  Enables account abstraction, meaning wallets function like smart contracts with advanced logic.
Gasless Transactions – Utilize EIP-712 signatures for gasless deposits or transactions, ensuring a seamless experience.

# Workflow
Login -> Forward deposit address created -> User Deposist to Forward address-> Verify transaction -> Relayer transfer from Forward address to CheckoutPool -> Smart Wallet created from factory-> Transfer from CheckoutPool to SmartWallet.
User Sign request Withdraw -> relayer confirm > send transaction to Wallet Factory -> Transfer from Smart Wallet to user Wallet.

## Setup

### Clone the Repository
```bash
git clone https://github.com/quangtruc0912/polyonboard.git
cd bridge-contract
```

### Install Dependencies
```bash
npm install
```

### Initialize Hardhat (if not already set up)
```bash
npx hardhat init
```

### Compile
```bash
npx hardhat compile
```

## Project Structure

- **contracts/**: Contains Solidity files:
  - `CheckoutPool.sol`: Manages token deposits, forwards them to user wallets via a `WalletFactory`,and integrates with a `Create2ForwarderFactory` for deposit forwarding. Utilizes SafeERC20 for secure token transfers.
  - `Create2ForwarderFactory.sol`:A factory contract for deploying DepositForwarder instances using CREATE2, allowing deterministic addresses. Supports updating the CheckoutPool address until locked.
  - `DepositForwarder.sol`:  A contract that forwards ERC-20 token deposits to a designated CheckoutPool contract. This contract is owned by a user and ensures that only the owner can trigger forwarding. It integrates with SafeERC20 for secure token transfers and interacts with CheckoutPool for deposits.
  - `MockUSDC.sol`:  A mock ERC20 token representing USDC with 6 decimals, used for testing purposes. Inherits from OpenZeppelin’s ERC20 and Ownable contracts.
  - `WalletFactory.sol`: A factory contract for creating and managing SmartWallet instances with gasless withdrawal capabilities. Uses EIP-712 for typed signature verification and supports CheckoutPool integration.
  - `SmartWallet.sol`:  A wallet contract controlled by a factory, capable of executing transactions on behalf of a user.

- **scripts/**:
  - `deploy.ts`: Deploys and lock contracts.
  - `login.ts`: Simulate the onboarding contains login, depoist and withdraw.


- **gasless-app/**: Simple React-applicaton allow user to interact with contract.
  - `components/Deposit.ts`: 
  - `components/Walletconnect.ts`: 
  - `components/Withdraw.ts`: 
  - `components/Withdraw.ts`: 
  - `contracts/addresses.ts`: After deploy script observe the terminal and replace deployed contract at `addresses.ts`
  - `typechain-types/`: Copied from `src/typechain-types` after `compile`

  - **relayer-server/**: Simple Nodejs server that acting like a relayer
  - `src/typechain-types/`: Copied from `src/typechain-types` after `compile`
  - `index.ts`: define endpoints
  - `relayer.ts`: send tx
  - `.env`: there was default data of hardhat on .env.example


- **hardhat.config.js**: Configuration file for Hardhat.


## Running Only Scripts (No server - Frontend app)
1. Start local node

```bash 
npx hardhat node
```

2. Deploys contracts 

```bash 
    npx hardhat run scripts/deploy.ts --network localhost
``` 
Observe: and copy addressess from deployed contract to login.ts

4. Rum simulate login 

```bash 
    npx hardhat run scripts/login.ts --network localhost
``` 
Observe.

## Interact with application
1. Start local node

```bash 
npx hardhat node
```

2. Deploys contracts 

```bash 

    npx hardhat run scripts/deploy.ts --network localhost
``` 
Observe: and copy addressess from deployed contract `gasless-app`(contracts/addresses.ts) and `replayer-server` (.env)

3. Run replayer-server 

```bash 
    cd replayer-server 
    npm install
    npx ts-node src/index.ts
``` 

4. Install metamask on your browser. 

    add an account for testing (private key from hardhat)
    add local rpc - default is `http://127.0.0.1:8545`


5. Run gasless-app - frontend

```bash 
    cd gasless-app
    npm install
    npm start
``` 

6. Interact

