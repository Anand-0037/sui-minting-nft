module mint_nft::mint_nft;

use std::string::String;
use std::ascii;
use sui::url::{Self, Url};
use sui::event;

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


