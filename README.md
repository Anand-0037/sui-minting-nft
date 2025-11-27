# Sui NFT Minting dApp

A decentralized application for minting NFTs on Sui blockchain with Move smart contracts and React frontend.

## Features

- Connect Sui Wallet
- Mint NFTs with name, description, and image
- Transfer NFTs to other addresses
- View transactions on Sui Explorer

## Quick Start

### 1. Deploy Contract

```bash
cd move/mint_nft
sui move build
sui client publish --gas-budget 100000000
```

Copy the Package ID from output.

### 2. Configure Frontend

Update `app/src/components/MintNFT.js`:

```javascript
const PACKAGE_ID = "0xYOUR_PACKAGE_ID";
```

### 3. Run App

```bash
cd app
npm install --legacy-peer-deps
npm start
```

Opens at http://localhost:3000

## Project Structure

```
├── move/mint_nft/
│   ├── sources/mint_nft.move
│   ├── tests/mint_nft_tests.move
│   └── Move.toml
├── app/src/
│   ├── components/MintNFT.js
│   ├── App.js
│   └── index.js
├── README.md
└── DEPLOYMENT.md
```

## Smart Contract

| Function                           | Description              |
| ---------------------------------- | ------------------------ |
| `mint_nft(name, description, uri)` | Mints NFT to caller      |
| `transfer_nft(nft, recipient)`     | Transfers NFT to address |

## Tech Stack

- **Blockchain:** Sui
- **Contract:** Move
- **Frontend:** React
- **SDK:** @mysten/dapp-kit, @mysten/sui

## Resources

- [Sui Docs](https://docs.sui.io/)
- [Move Guide](https://move-language.github.io/move/)
- [Sui Explorer](https://suiscan.xyz/testnet)

**workshop project** [Anand Vashishtha](https://github.com/Anand-0037)
