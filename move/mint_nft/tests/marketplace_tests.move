#[test_only]
module mint_nft::marketplace_tests;

use std::string;
use mint_nft::mint_nft;

#[test]
fun test_mint_and_prepare_for_listing() {
    let mut ctx = tx_context::dummy();
    
    // Mint an NFT that could be listed
    mint_nft::mint_nft(
        string::utf8(b"Marketplace NFT"),
        string::utf8(b"An NFT ready for the marketplace"),
        b"https://example.com/market-nft.png",
        &mut ctx
    );
}

#[test]
fun test_batch_mint() {
    let mut ctx = tx_context::dummy();
    
    let names = vector[
        string::utf8(b"Batch NFT #1"),
        string::utf8(b"Batch NFT #2"),
        string::utf8(b"Batch NFT #3"),
    ];
    
    let descriptions = vector[
        string::utf8(b"First batch NFT"),
        string::utf8(b"Second batch NFT"),
        string::utf8(b"Third batch NFT"),
    ];
    
    let uris = vector[
        b"https://example.com/batch1.png",
        b"https://example.com/batch2.png",
        b"https://example.com/batch3.png",
    ];
    
    mint_nft::batch_mint(names, descriptions, uris, &mut ctx);
}
