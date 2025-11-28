module mint_nft::mint_nft;

use std::string::String;
use std::ascii;
use sui::url::{Self, Url};
use sui::event;
use sui::dynamic_field as df;
use sui::package;
use sui::display;

// Error codes
const ENotCreator: u64 = 0;
const EArrayLengthMismatch: u64 = 1;
const EBatchSizeExceeded: u64 = 2;

/// One-time witness for Display initialization
public struct MINT_NFT has drop {}

public struct NFT has key, store {
    id: UID,
    name: String,
    description: String,
    url: Url,
    creator: address,
}

public struct NFTMinted has copy, drop {
    object_id: ID,
    creator: address,
    name: String,
}

public struct AttributeAdded has copy, drop {
    nft_id: ID,
    key: String,
    value: String,
}

public struct AttributeUpdated has copy, drop {
    nft_id: ID,
    key: String,
    old_value: String,
    new_value: String,
}

/// Initialize Display for NFTs (called once on publish)
fun init(otw: MINT_NFT, ctx: &mut TxContext) {
    let keys = vector[
        b"name".to_string(),
        b"description".to_string(),
        b"image_url".to_string(),
        b"creator".to_string(),
        b"project_url".to_string(),
    ];
    
    let values = vector[
        b"{name}".to_string(),
        b"{description}".to_string(),
        b"{url}".to_string(),
        b"{creator}".to_string(),
        b"https://github.com/Anand-0037".to_string(),
    ];
    
    let publisher = package::claim(otw, ctx);
    let mut nft_display = display::new_with_fields<NFT>(&publisher, keys, values, ctx);
    
    display::update_version(&mut nft_display);
    
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(nft_display, ctx.sender());
}

#[allow(lint(public_entry))]
public entry fun mint_nft(
    name: String,
    description: String,
    uri: vector<u8>,
    ctx: &mut TxContext
) {
    let sender = ctx.sender();
    let nft = NFT {
        id: object::new(ctx),
        name,
        description,
        url: url::new_unsafe(ascii::string(uri)),
        creator: sender,
    };

    event::emit(NFTMinted {
        object_id: object::id(&nft),
        creator: sender,
        name: nft.name,
    });

    transfer::public_transfer(nft, sender);
}

#[allow(lint(public_entry))]
public entry fun transfer_nft(
    nft: NFT,
    recipient: address,
    _ctx: &mut TxContext
) {
    transfer::public_transfer(nft, recipient);
}

// ============ Dynamic Fields - Add Attributes to NFTs ============

/// Add a new attribute to an NFT (only creator can add)
#[allow(lint(public_entry))]
public entry fun add_attribute(
    nft: &mut NFT,
    key: String,
    value: String,
    ctx: &mut TxContext
) {
    // Only the creator can add attributes
    assert!(nft.creator == ctx.sender(), ENotCreator);
    
    // Add the attribute as a dynamic field
    df::add(&mut nft.id, key, value);

    event::emit(AttributeAdded {
        nft_id: object::id(nft),
        key,
        value,
    });
}

/// Update an existing attribute (only creator can update)
#[allow(lint(public_entry))]
public entry fun update_attribute(
    nft: &mut NFT,
    key: String,
    new_value: String,
    ctx: &mut TxContext
) {
    assert!(nft.creator == ctx.sender(), ENotCreator);
    
    let old_value = df::remove<String, String>(&mut nft.id, key);
    
    // Emit event before adding new value (use old_value before it's moved)
    event::emit(AttributeUpdated {
        nft_id: object::id(nft),
        key,
        old_value,
        new_value,
    });
    
    df::add(&mut nft.id, key, new_value);
}

/// Remove an attribute (only creator can remove)
#[allow(lint(public_entry))]
public entry fun remove_attribute(
    nft: &mut NFT,
    key: String,
    ctx: &mut TxContext
) {
    assert!(nft.creator == ctx.sender(), ENotCreator);
    df::remove<String, String>(&mut nft.id, key);
}

/// Check if an attribute exists
public fun has_attribute(nft: &NFT, key: String): bool {
    df::exists_(&nft.id, key)
}

/// Get an attribute value
public fun get_attribute(nft: &NFT, key: String): &String {
    df::borrow(&nft.id, key)
}

// ============ Batch Minting ============

// Maximum NFTs that can be minted in a single batch
const MAX_BATCH_SIZE: u64 = 50;

/// Mint multiple NFTs in a single transaction (max 50)
#[allow(lint(public_entry))]
public entry fun batch_mint(
    names: vector<String>,
    descriptions: vector<String>,
    uris: vector<vector<u8>>,
    ctx: &mut TxContext
) {
    let len = names.length();
    assert!(len == descriptions.length() && len == uris.length(), EArrayLengthMismatch);
    assert!(len <= MAX_BATCH_SIZE, EBatchSizeExceeded);
    
    let mut i = 0;
    while (i < len) {
        let name = *names.borrow(i);
        let description = *descriptions.borrow(i);
        let uri = *uris.borrow(i);
        
        let sender = ctx.sender();
        let nft = NFT {
            id: object::new(ctx),
            name,
            description,
            url: url::new_unsafe(ascii::string(uri)),
            creator: sender,
        };

        event::emit(NFTMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
        });

        transfer::public_transfer(nft, sender);
        i = i + 1;
    };
}

// ============ View Functions ============

public fun name(nft: &NFT): String {
    nft.name
}

public fun description(nft: &NFT): String {
    nft.description
}

public fun url(nft: &NFT): Url {
    nft.url
}

public fun creator(nft: &NFT): address {
    nft.creator
}


