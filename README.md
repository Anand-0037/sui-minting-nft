# Sui NFT Minting dApp

A decentralized application for minting, managing, and trading NFTs on Sui blockchain with Move smart contracts and React frontend.

## 🚀 Features

### Core Features

- ✅ Connect Sui Wallet
- ✅ Mint NFTs with name, description, and image
- ✅ Transfer NFTs to other addresses
- ✅ View transactions on Sui Explorer

### Day 2 Workshop Upgrades

- 🖼️ **NFT Gallery** - View your entire NFT collection with images
- 📤 **Transfer UI** - Send NFTs to any address with one click
- 🏪 **NFT Marketplace** - List NFTs for sale and buy from others
- ⚡ **Dynamic Fields** - Add attributes to NFTs after minting
- 📦 **Batch Minting** - Mint multiple NFTs in one transaction
- 🖼️ **Image Preview** - See your NFT image before minting
- 🎨 **Modern UI** - Tabbed interface with responsive design

## Quick Start

### 1. Deploy Contract

```bash
cd move/mint_nft
sui move build
sui client publish --gas-budget 100000000
```

Copy the Package ID from output. Also note the **Marketplace shared object ID** for marketplace features.

### 2. Configure Frontend

Update `app/src/components/MintNFT.js`, `NFTGallery.js`, and `Marketplace.js`:

```javascript
const PACKAGE_ID = "0xYOUR_PACKAGE_ID";
const MARKETPLACE_ID = "0xYOUR_MARKETPLACE_ID"; // For marketplace
```

### 3. Run App

```bash
cd app
npm install --legacy-peer-deps
npm start
```

Opens at http://localhost:3000

## Instructions

- Upload images to Imgur or IPFS when testing NFT minting
- Get testnet SUI tokens: `sui client faucet`

## Project Structure

```
├── move/mint_nft/
│   ├── sources/
│   │   ├── mint_nft.move      # Core NFT + Dynamic Fields
│   │   └── marketplace.move   # NFT Marketplace (Day 2)
│   ├── tests/
│   │   └── mint_nft_tests.move
│   └── Move.toml
├── app/src/
│   ├── components/
│   │   ├── MintNFT.js         # Minting with preview
│   │   ├── NFTGallery.js      # Collection view (Day 2)
│   │   └── Marketplace.js     # Buy/Sell NFTs (Day 2)
│   ├── App.js                 # Tab navigation
│   └── index.js
├── README.md
└── DEPLOYMENT.md
```

## Smart Contract Functions

### mint_nft Module

| Function                                | Description                  |
| --------------------------------------- | ---------------------------- |
| `mint_nft(name, description, uri)`      | Mints NFT to caller          |
| `transfer_nft(nft, recipient)`          | Transfers NFT to address     |
| `add_attribute(nft, key, value)`        | Adds dynamic field attribute |
| `update_attribute(nft, key, new_value)` | Updates existing attribute   |
| `remove_attribute(nft, key)`            | Removes an attribute         |
| `batch_mint(names, descriptions, uris)` | Mints multiple NFTs          |

### marketplace Module

| Function                                       | Description           |
| ---------------------------------------------- | --------------------- |
| `list_nft(marketplace, nft, price)`            | Lists NFT for sale    |
| `buy_nft(marketplace, escrow, payment)`        | Purchases listed NFT  |
| `delist_nft(marketplace, escrow)`              | Cancels listing       |
| `update_price(marketplace, nft_id, new_price)` | Updates listing price |

## Advanced Features (Day 2)

### Shared Objects

The marketplace uses **shared objects** - allowing multiple users to interact simultaneously:

```move
transfer::share_object(marketplace);
```

### Dynamic Fields

Add metadata to NFTs after creation:

```move
use sui::dynamic_field as df;
df::add(&mut nft.id, key, value);
```

### Escrow Pattern

NFTs are held in escrow while listed, ensuring safe trades:

```move
public struct Escrow has key {
    id: UID,
    nft: NFT,
    listing_id: ID,
}
```

## Tech Stack

- **Blockchain:** Sui
- **Contract:** Move
- **Frontend:** React
- **SDK:** @mysten/dapp-kit, @mysten/sui
- **Styling:** CSS3 with modern gradients

## Resources

- [Sui Docs](https://docs.sui.io/)
- [Move Guide](https://move-language.github.io/move/)
- [Sui Explorer](https://suiscan.xyz/testnet)
- [Dynamic Fields](https://docs.sui.io/concepts/dynamic-fields)

---

**Workshop Project** by [Anand Vashishtha](https://github.com/Anand-0037)
