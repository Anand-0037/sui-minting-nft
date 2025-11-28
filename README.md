# Sui NFT dApp

A full-featured decentralized application for minting, trading, and staking NFTs on Sui blockchain.

## Overview

This project demonstrates a complete NFT ecosystem built on Sui, featuring three integrated Move smart contracts and a React frontend. Users can mint NFTs with custom metadata, trade them on a decentralized marketplace using an escrow pattern, and stake NFTs to earn time-based rewards.

### Architecture Highlights

- **Shared Objects**: Marketplace and Staking Pool are shared objects, enabling concurrent access by multiple users
- **Escrow Pattern**: NFTs are held in escrow while listed, ensuring atomic and secure trades
- **Dynamic Fields**: NFT attributes can be added or modified post-minting using Sui's dynamic field feature
- **Event-Driven UI**: Frontend listens to on-chain events (NFTListed, NFTSold, NFTStaked) to maintain real-time state

### How Staking Works

NFT staking locks your NFT in a shared pool contract. The contract records the stake timestamp, and rewards accumulate at 1 MIST per second. The frontend displays a real-time counter. When you unstake, the contract calculates total rewards based on actual duration and returns both NFT and rewards.

## Screenshots

### Application Interface

![Updated UI](images/updated%20ui.jpg)

### Mint NFT

![Minting NFT](images/minting%20nft.jpg)

### NFT Gallery

![Gallery](images/gallery.jpg)

### Staking - Select NFT

![Staking NFT](images/staking%20nft.jpg)

### Staking - Active Stake with Rewards

![Staked NFT](images/staked%20nft.jpg)

### NFT Marketplace

![Marketplace](images/updated%20marketplace.jpg)

## Features

**Core**

- Wallet connection (Sui Wallet)
- Mint NFTs with name, description, and image URL
- Transfer NFTs to any address
- Batch minting (up to 50 NFTs)

**Marketplace**

- List NFTs for sale
- Buy listed NFTs
- Delist your listings
- Price validation

**Staking**

- Stake NFTs to earn rewards (1 MIST/second)
- Real-time reward counter
- Unstake and claim rewards

**Advanced**

- Dynamic fields (add/update/remove attributes)
- Image preview before minting
- Transaction links to Sui Explorer

## Deployed Contracts (Testnet)

| Contract     | ID                                                                   |
| ------------ | -------------------------------------------------------------------- |
| Package      | `0x65d3b58287684ab6e57e384d58016bedab225f06c23f512eeeaf008b0f1c213f` |
| Marketplace  | `0xbbc44d377e566952edb9e25094ec65ae372f9f44b7b20a3f1581459366d872fc` |
| Staking Pool | `0x7c1ae18b810104e72722a6ce14dc62a844343b15f1cde2667a4d69e4a2abe905` |

## Quick Start

### Deploy Contracts

```bash
cd move/mint_nft
sui move build
sui client publish --gas-budget 100000000
```

### Configure Frontend

Update `app/src/config.js` with your contract IDs:

```javascript
export const CONFIG = {
  PACKAGE_ID: "YOUR_PACKAGE_ID",
  MARKETPLACE_ID: "YOUR_MARKETPLACE_ID",
  STAKING_POOL_ID: "YOUR_STAKING_POOL_ID",
};
```

### Run App

```bash
cd app
npm install --legacy-peer-deps
npm start
```

## Project Structure

```
sui-project/
├── move/mint_nft/
│   └── sources/
│       ├── mint_nft.move      # NFT minting + dynamic fields
│       ├── marketplace.move   # Buy/sell NFTs
│       └── staking.move       # Stake NFTs for rewards
├── app/src/
│   ├── config.js              # Contract configuration
│   └── components/
│       ├── MintNFT.js         # Minting interface
│       ├── NFTGallery.js      # Collection view
│       ├── Marketplace.js     # Trading interface
│       └── Staking.js         # Staking interface
└── DEPLOYMENT.md
```

## Smart Contracts

### mint_nft

| Function           | Description          |
| ------------------ | -------------------- |
| `mint_nft`         | Mint single NFT      |
| `batch_mint`       | Mint up to 50 NFTs   |
| `transfer_nft`     | Transfer to address  |
| `add_attribute`    | Add dynamic field    |
| `update_attribute` | Update dynamic field |
| `remove_attribute` | Remove dynamic field |

### marketplace

| Function     | Description         |
| ------------ | ------------------- |
| `list_nft`   | List NFT for sale   |
| `buy_nft`    | Purchase listed NFT |
| `delist_nft` | Cancel listing      |

### staking

| Function      | Description               |
| ------------- | ------------------------- |
| `stake_nft`   | Stake NFT to pool         |
| `unstake_nft` | Unstake and claim rewards |

## Tech Stack

- Sui Blockchain (Testnet)
- Move Language (2024.beta)
- React 18
- @mysten/dapp-kit
- @mysten/sui

## Requirements

- Sui CLI
- Node.js 18+
- Sui Wallet browser extension
- Testnet SUI tokens (`sui client faucet`)

## License

MIT

---

Built by [Anand Vashishtha](https://github.com/Anand-0037)
