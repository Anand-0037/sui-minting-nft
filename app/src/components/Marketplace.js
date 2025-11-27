import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './Marketplace.css';

const PACKAGE_ID = '0xe7ad0c7f7020802786370000c809ae8915c7a4ab468ded805d25215c9eb6ee24';

// Note: After deploying the updated contract, replace this with the actual marketplace object ID
// You can find this in the deployment output or by querying for shared objects
const MARKETPLACE_ID = null; // Will be set after deployment

function ListingCard({ listing, onBuy, currentAccount, isLoading }) {
    const { escrowId, nftId, nft, price, seller } = listing;
    const priceInSui = price / 1_000_000_000;
    const isOwner = currentAccount?.address === seller;

    // Get NFT details from the content
    const fields = nft?.content?.fields || {};
    let imageUrl = '';
    if (fields.url) {
        imageUrl = typeof fields.url === 'string' ? fields.url : fields.url.fields?.url || '';
    }

    return (
        <div className="listing-card">
            <div className="listing-image-container">
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={fields.name || 'NFT'} 
                        className="listing-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className="listing-image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                    🖼️
                </div>
            </div>

            <div className="listing-details">
                <h3 className="listing-name">{fields.name || 'Unnamed NFT'}</h3>
                <p className="listing-description">{fields.description || 'No description'}</p>
                
                <div className="listing-price">
                    <span className="price-label">Price:</span>
                    <span className="price-value">{priceInSui.toFixed(2)} SUI</span>
                </div>

                <p className="listing-seller">
                    Seller: {seller?.slice(0, 6)}...{seller?.slice(-4)}
                    {isOwner && <span className="owner-badge"> (You)</span>}
                </p>

                <button
                    className={`buy-btn ${isOwner ? 'disabled' : ''}`}
                    onClick={() => onBuy(escrowId, nftId, price)}
                    disabled={isOwner || isLoading || !currentAccount}
                >
                    {isOwner ? 'Your Listing' : isLoading ? 'Processing...' : `Buy for ${priceInSui.toFixed(2)} SUI`}
                </button>
            </div>
        </div>
    );
}

function Marketplace({ marketplaceId = MARKETPLACE_ID }) {
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [isLoadingListings, setIsLoadingListings] = useState(true);

    // Fetch listings from events (since we can't directly query the Table)
    useEffect(() => {
        const fetchListings = async () => {
            if (!marketplaceId) {
                setIsLoadingListings(false);
                return;
            }

            try {
                setIsLoadingListings(true);
                
                // Query NFTListed events
                const listedEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${PACKAGE_ID}::marketplace::NFTListed`,
                    },
                    limit: 50,
                });

                // Query NFTSold events to filter out sold items
                const soldEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${PACKAGE_ID}::marketplace::NFTSold`,
                    },
                    limit: 50,
                });

                // Query NFTDelisted events
                const delistedEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${PACKAGE_ID}::marketplace::NFTDelisted`,
                    },
                    limit: 50,
                });

                // Create sets of sold and delisted NFT IDs
                const soldIds = new Set(soldEvents.data.map(e => e.parsedJson?.nft_id));
                const delistedIds = new Set(delistedEvents.data.map(e => e.parsedJson?.nft_id));

                // Filter active listings
                const activeListings = listedEvents.data.filter(event => {
                    const nftId = event.parsedJson?.nft_id;
                    return !soldIds.has(nftId) && !delistedIds.has(nftId);
                });

                // Fetch NFT details for each listing
                const listingsWithDetails = await Promise.all(
                    activeListings.map(async (event) => {
                        const { nft_id, price, seller } = event.parsedJson || {};
                        
                        // Try to get escrow object containing the NFT
                        // This is a simplified version - in production you'd query by type
                        const escrowObjects = await suiClient.getOwnedObjects({
                            owner: marketplaceId,
                            filter: {
                                StructType: `${PACKAGE_ID}::marketplace::Escrow`,
                            },
                            options: {
                                showContent: true,
                            },
                        });

                        const escrow = escrowObjects.data.find(obj => 
                            obj.data?.content?.fields?.listing_id === nft_id
                        );

                        // Get the NFT from escrow if possible
                        let nftDetails = null;
                        if (escrow?.data?.content?.fields?.nft) {
                            nftDetails = { content: { fields: escrow.data.content.fields.nft.fields } };
                        }

                        return {
                            escrowId: escrow?.data?.objectId,
                            nftId: nft_id,
                            nft: nftDetails,
                            price: parseInt(price),
                            seller,
                        };
                    })
                );

                setListings(listingsWithDetails.filter(l => l.escrowId));
            } catch (error) {
                console.error('Error fetching listings:', error);
                setStatus('Failed to load marketplace listings');
            } finally {
                setIsLoadingListings(false);
            }
        };

        fetchListings();
    }, [marketplaceId, suiClient]);

    const handleBuy = async (escrowId, nftId, price) => {
        if (!currentAccount || !marketplaceId) {
            setStatus('Please connect wallet and ensure marketplace is configured');
            return;
        }

        setStatus('Processing purchase...');
        setIsLoading(true);

        try {
            const tx = new Transaction();

            // Split coins for payment
            const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(price)]);

            tx.moveCall({
                target: `${PACKAGE_ID}::marketplace::buy_nft`,
                arguments: [
                    tx.object(marketplaceId),
                    tx.object(escrowId),
                    paymentCoin,
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        setStatus('NFT purchased successfully! 🎉');
                        setIsLoading(false);
                        // Remove from local listings
                        setListings(prev => prev.filter(l => l.nftId !== nftId));
                        setTimeout(() => setStatus(''), 3000);
                    },
                    onError: (error) => {
                        setStatus(`Purchase failed: ${error.message}`);
                        setIsLoading(false);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setIsLoading(false);
        }
    };

    if (!marketplaceId) {
        return (
            <div className="marketplace-container">
                <div className="marketplace-header">
                    <h2>🏪 NFT Marketplace</h2>
                </div>
                <div className="marketplace-notice">
                    <h3>⚠️ Marketplace Not Configured</h3>
                    <p>To enable the marketplace, follow these steps:</p>
                    <ol>
                        <li>Deploy the updated contract: <code>sui client publish --gas-budget 100000000</code></li>
                        <li>Find the Marketplace shared object ID in the output</li>
                        <li>Update <code>MARKETPLACE_ID</code> in <code>Marketplace.js</code></li>
                        <li>Restart the application</li>
                    </ol>
                    <p className="note">The marketplace uses shared objects for decentralized trading!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="marketplace-container">
            <div className="marketplace-header">
                <h2>🏪 NFT Marketplace</h2>
                <div className="marketplace-stats">
                    <span className="stat-badge">{listings.length} Listed</span>
                </div>
            </div>

            {status && (
                <div className={`marketplace-status ${status.includes('failed') || status.includes('Error') ? 'error' : 'success'}`}>
                    {status}
                </div>
            )}

            {!currentAccount && (
                <div className="marketplace-notice warning">
                    <p>🔗 Connect your wallet to buy NFTs</p>
                </div>
            )}

            {isLoadingListings ? (
                <div className="marketplace-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading marketplace listings...</p>
                </div>
            ) : listings.length === 0 ? (
                <div className="marketplace-empty">
                    <p>🏷️ No NFTs listed for sale</p>
                    <p>List your NFTs from the Gallery tab!</p>
                </div>
            ) : (
                <div className="listings-grid">
                    {listings.map((listing) => (
                        <ListingCard
                            key={listing.nftId}
                            listing={listing}
                            onBuy={handleBuy}
                            currentAccount={currentAccount}
                            isLoading={isLoading}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Marketplace;
