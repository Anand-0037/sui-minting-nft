/// Marketplace module for listing and buying NFTs
/// Demonstrates shared objects, tables, and escrow patterns
module mint_nft::marketplace;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::event;
use mint_nft::mint_nft::NFT;

// Error codes
const EInsufficientPayment: u64 = 0;
const EListingNotFound: u64 = 1;
const ENotOwner: u64 = 2;

/// Shared marketplace object - everyone can interact with it
public struct Marketplace has key {
    id: UID,
    /// Table of active listings: NFT object ID -> Listing details
    listings: Table<ID, Listing>,
    /// Fee percentage (in basis points, e.g., 250 = 2.5%)
    fee_bps: u64,
    /// Accumulated fees
    fee_balance: u64,
    /// Marketplace owner/admin
    admin: address,
}

/// Individual listing information
public struct Listing has store, drop {
    nft_id: ID,
    price: u64,
    seller: address,
}

/// Escrow to hold NFTs while listed
public struct Escrow has key {
    id: UID,
    nft: NFT,
    listing_id: ID,
}

// Events
public struct MarketplaceCreated has copy, drop {
    marketplace_id: ID,
    admin: address,
}

public struct NFTListed has copy, drop {
    nft_id: ID,
    price: u64,
    seller: address,
}

public struct NFTDelisted has copy, drop {
    nft_id: ID,
    seller: address,
}

public struct NFTSold has copy, drop {
    nft_id: ID,
    price: u64,
    seller: address,
    buyer: address,
}

/// Initialize marketplace (called once on publish)
fun init(ctx: &mut TxContext) {
    let marketplace = Marketplace {
        id: object::new(ctx),
        listings: table::new(ctx),
        fee_bps: 250, // 2.5% fee
        fee_balance: 0,
        admin: ctx.sender(),
    };

    event::emit(MarketplaceCreated {
        marketplace_id: object::id(&marketplace),
        admin: ctx.sender(),
    });

    // Share the marketplace so everyone can access it
    transfer::share_object(marketplace);
}

/// List an NFT for sale
#[allow(lint(public_entry))]
public entry fun list_nft(
    marketplace: &mut Marketplace,
    nft: NFT,
    price: u64,
    ctx: &mut TxContext
) {
    let nft_id = object::id(&nft);
    let seller = ctx.sender();

    // Create listing record
    let listing = Listing {
        nft_id,
        price,
        seller,
    };

    // Add to listings table
    table::add(&mut marketplace.listings, nft_id, listing);

    // Create escrow to hold the NFT
    let escrow = Escrow {
        id: object::new(ctx),
        nft,
        listing_id: nft_id,
    };

    // Share escrow so buyer can access it
    transfer::share_object(escrow);

    event::emit(NFTListed {
        nft_id,
        price,
        seller,
    });
}

/// Buy a listed NFT
#[allow(lint(public_entry))]
public entry fun buy_nft(
    marketplace: &mut Marketplace,
    escrow: Escrow,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    let Escrow { id: escrow_uid, nft, listing_id } = escrow;
    object::delete(escrow_uid);

    // Get and remove listing
    assert!(table::contains(&marketplace.listings, listing_id), EListingNotFound);
    let listing = table::remove(&mut marketplace.listings, listing_id);

    let Listing { nft_id: _, price, seller } = listing;

    // Verify payment amount
    assert!(coin::value(&payment) >= price, EInsufficientPayment);

    let buyer = ctx.sender();

    // Calculate and deduct fee
    let fee_amount = (price * marketplace.fee_bps) / 10000;
    let seller_amount = price - fee_amount;

    // Update marketplace fee balance
    marketplace.fee_balance = marketplace.fee_balance + fee_amount;

    // Split payment: fee stays, rest goes to seller
    if (fee_amount > 0) {
        let fee_coin = coin::split(&mut payment, fee_amount, ctx);
        transfer::public_transfer(fee_coin, marketplace.admin);
    };

    // Handle excess payment (return to buyer)
    let payment_value = coin::value(&payment);
    if (payment_value > seller_amount) {
        let refund = coin::split(&mut payment, payment_value - seller_amount, ctx);
        transfer::public_transfer(refund, buyer);
    };

    // Transfer payment to seller
    transfer::public_transfer(payment, seller);

    // Transfer NFT to buyer
    transfer::public_transfer(nft, buyer);

    event::emit(NFTSold {
        nft_id: listing_id,
        price,
        seller,
        buyer,
    });
}

/// Cancel a listing and retrieve NFT (seller only)
#[allow(lint(public_entry))]
public entry fun delist_nft(
    marketplace: &mut Marketplace,
    escrow: Escrow,
    ctx: &mut TxContext
) {
    let Escrow { id: escrow_uid, nft, listing_id } = escrow;
    object::delete(escrow_uid);

    // Verify listing exists and sender is the seller
    assert!(table::contains(&marketplace.listings, listing_id), EListingNotFound);
    let listing = table::remove(&mut marketplace.listings, listing_id);

    assert!(listing.seller == ctx.sender(), ENotOwner);

    // Return NFT to seller
    transfer::public_transfer(nft, ctx.sender());

    event::emit(NFTDelisted {
        nft_id: listing_id,
        seller: ctx.sender(),
    });
}

/// Update listing price (seller only)
#[allow(lint(public_entry))]
public entry fun update_price(
    marketplace: &mut Marketplace,
    nft_id: ID,
    new_price: u64,
    ctx: &mut TxContext
) {
    assert!(table::contains(&marketplace.listings, nft_id), EListingNotFound);
    let listing = table::borrow_mut(&mut marketplace.listings, nft_id);
    
    assert!(listing.seller == ctx.sender(), ENotOwner);
    listing.price = new_price;
}

/// Admin: Update fee percentage
#[allow(lint(public_entry))]
public entry fun update_fee(
    marketplace: &mut Marketplace,
    new_fee_bps: u64,
    ctx: &mut TxContext
) {
    assert!(marketplace.admin == ctx.sender(), ENotOwner);
    marketplace.fee_bps = new_fee_bps;
}

// View functions
public fun get_listing_price(marketplace: &Marketplace, nft_id: ID): u64 {
    let listing = table::borrow(&marketplace.listings, nft_id);
    listing.price
}

public fun get_listing_seller(marketplace: &Marketplace, nft_id: ID): address {
    let listing = table::borrow(&marketplace.listings, nft_id);
    listing.seller
}

public fun is_listed(marketplace: &Marketplace, nft_id: ID): bool {
    table::contains(&marketplace.listings, nft_id)
}

public fun get_fee_bps(marketplace: &Marketplace): u64 {
    marketplace.fee_bps
}
