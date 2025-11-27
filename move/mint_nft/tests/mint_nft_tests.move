#[test_only]
module mint_nft::mint_nft_tests;

use std::string;
use mint_nft::mint_nft;

#[test]
fun test_mint_nft_success() {
    let mut ctx = tx_context::dummy();
    
    mint_nft::mint_nft(
        string::utf8(b"Test NFT"),
        string::utf8(b"A test NFT on Sui blockchain"),
        b"https://example.com/nft.png",
        &mut ctx
    );
}

#[test]
fun test_mint_multiple_nfts() {
    let mut ctx = tx_context::dummy();
    
    mint_nft::mint_nft(
        string::utf8(b"NFT #1"),
        string::utf8(b"First test NFT"),
        b"https://example.com/nft1.png",
        &mut ctx
    );
    
    mint_nft::mint_nft(
        string::utf8(b"NFT #2"),
        string::utf8(b"Second test NFT"),
        b"https://example.com/nft2.png",
        &mut ctx
    );
}
