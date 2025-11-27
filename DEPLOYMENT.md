# Deployment Guide

## Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) installed
- [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet) browser extension
- Testnet SUI tokens (run `sui client faucet`)

## Setup Sui Client

```bash
sui client
sui client switch --env testnet
sui client active-address
```

## Deploy Contract

### 1. Build and Publish

```bash
cd move/mint_nft
sui move build
sui client publish --gas-budget 100000000
```

### 2. Copy Package ID

From the output, find and copy the Package ID:

```
Created Objects:
  - ID: 0x... , Owner: Immutable  <-- This is your PACKAGE_ID
```

### 3. Update Frontend

Edit `app/src/components/MintNFT.js`:

```javascript
const PACKAGE_ID = "0xYOUR_PACKAGE_ID_HERE";
```

### 4. Start Frontend

```bash
cd app
npm install --legacy-peer-deps
npm start
```

App opens at http://localhost:3000

## Usage

1. Connect your Sui wallet
2. Enter NFT name, description, and image URL
3. Click "Mint NFT" and approve the transaction
4. View on [Sui Explorer](https://suiscan.xyz/testnet)

## Troubleshooting

| Issue             | Solution                           |
| ----------------- | ---------------------------------- |
| Insufficient gas  | `sui client faucet`                |
| Build failed      | `sui move clean && sui move build` |
| Package not found | Verify PACKAGE_ID and network      |

## Useful Commands

```bash
sui client objects      # View your objects
sui client gas          # Check gas balance
sui move test           # Run tests
```
