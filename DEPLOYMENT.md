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

### 2. Identify Object IDs from Deployment Output

The deployment output contains several important IDs you need to configure your frontend.

#### Package ID

Look for the "Published Objects" section with "Immutable" owner:

```
----- Object changes ----
Published Objects:
  PackageID: 0xb71b6701e4d6e9baec490494212ce78655760f73388e452ad90fb71d51c3981b
  ...
```

The `PackageID` is your **PACKAGE_ID**.

#### Marketplace ID

Look in the "Created Objects" section for an object with type containing `::marketplace::Marketplace`:

```
Created Objects:
  - ID: 0xfe0ab263064cef19889664cfa066ba4ab2945ee11ec759b93960592d9e0d2174
    Owner: Shared
    ObjectType: 0x...::marketplace::Marketplace
```

The ID with `Owner: Shared` and type `Marketplace` is your **MARKETPLACE_ID**.

#### Staking Pool ID

Look in the "Created Objects" section for an object with type containing `::staking::StakingPool`:

```
Created Objects:
  - ID: 0x1234567890abcdef...
    Owner: Shared
    ObjectType: 0x...::staking::StakingPool
```

The ID with `Owner: Shared` and type `StakingPool` is your **STAKING_POOL_ID**.

#### Alternative: Use Sui Explorer

If you miss the output, you can find your deployed objects on [Sui Explorer](https://suiscan.xyz/testnet):

1. Go to https://suiscan.xyz/testnet
2. Search for your wallet address
3. Look at "Transactions" tab for your publish transaction
4. Click on the transaction to see all created objects
5. Identify the shared objects by their types

### 3. Update Frontend Configuration

Edit `app/src/config.js` with all your contract IDs:

```javascript
export const CONFIG = {
  NETWORK: "testnet",

  // Contract addresses - Update after deployment
  PACKAGE_ID: "0xYOUR_PACKAGE_ID_HERE",
  MARKETPLACE_ID: "0xYOUR_MARKETPLACE_ID_HERE",
  STAKING_POOL_ID: "0xYOUR_STAKING_POOL_ID_HERE",

  // Other settings remain unchanged...
};
```

### 4. Start Frontend

```bash
cd app
npm install --legacy-peer-deps
npm start
```

App opens at http://localhost:3000

## Verification

After configuration, verify each feature works:

1. **Minting**: Mint tab should allow creating NFTs
2. **Gallery**: My NFTs tab should display your collection
3. **Marketplace**: Marketplace tab should show "0 Listed" initially (not "Not Configured")
4. **Staking**: Staking tab should show staking interface (not "Not Configured")

## Usage

1. Connect your Sui wallet
2. Enter NFT name, description, and image URL
3. Click "Mint NFT" and approve the transaction
4. View on [Sui Explorer](https://suiscan.xyz/testnet)

## Troubleshooting

| Issue                      | Solution                                        |
| -------------------------- | ----------------------------------------------- |
| Insufficient gas           | `sui client faucet`                             |
| Build failed               | `sui move clean && sui move build`              |
| Package not found          | Verify PACKAGE_ID and network                   |
| Marketplace not configured | Ensure MARKETPLACE_ID is set in config.js       |
| Staking not configured     | Ensure STAKING_POOL_ID is set in config.js      |
| Objects not found          | Check Sui Explorer for your publish transaction |

## Useful Commands

```bash
sui client objects          # View your objects
sui client gas              # Check gas balance
sui move test               # Run tests
sui client active-address   # Get your wallet address
```

## Example Configuration

After successful deployment, your `config.js` should look like:

```javascript
export const CONFIG = {
  NETWORK: "testnet",

  PACKAGE_ID:
    "0xb71b6701e4d6e9baec490494212ce78655760f73388e452ad90fb71d51c3981b",
  MARKETPLACE_ID:
    "0xfe0ab263064cef19889664cfa066ba4ab2945ee11ec759b93960592d9e0d2174",
  STAKING_POOL_ID:
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",

  EXPLORER_BASE: "https://suiscan.xyz/testnet",
  DEFAULT_GAS_BUDGET: 100000000,
  MAX_BATCH_SIZE: 50,
  MAX_DESCRIPTION_LENGTH: 200,
};
```
