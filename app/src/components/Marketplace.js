import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './Marketplace.css';

const PACKAGE_ID = '0xb71b6701e4d6e9baec490494212ce78655760f73388e452ad90fb71d51c3981b';

// Marketplace shared object ID from deployment
const MARKETPLACE_ID = '0xfe0ab263064cef19889664cfa066ba4ab2945ee11ec759b93960592d9e0d2174';

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
                    NFT
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

    // Bug #4 & #5 Fix: Optimized fetching with cleanup to prevent memory leaks
    useEffect(() => {
        let isCancelled = false;
        
        const fetchListings = async () => {
            if (!marketplaceId) {
                if (!isCancelled) setIsLoadingListings(false);
                return;
            }

            try {
                if (!isCancelled) setIsLoadingListings(true);
                
                // Fetch all events once (not per listing - fixes race condition)
                const [listedEvents, soldEvents, delistedEvents] = await Promise.all([
                    suiClient.queryEvents({
                        query: { MoveEventType: `${PACKAGE_ID}::marketplace::NFTListed` },
                        limit: 50,
                    }),
                    suiClient.queryEvents({
                        query: { MoveEventType: `${PACKAGE_ID}::marketplace::NFTSold` },
                        limit: 50,
                    }),
                    suiClient.queryEvents({
                        query: { MoveEventType: `${PACKAGE_ID}::marketplace::NFTDelisted` },
                        limit: 50,
                    }),
                ]);

                if (isCancelled) return;

                // Create sets for O(1) lookup
                const soldIds = new Set(soldEvents.data.map(e => e.parsedJson?.nft_id));
                const delistedIds = new Set(delistedEvents.data.map(e => e.parsedJson?.nft_id));

                // Filter active listings from events
                const activeListedEvents = listedEvents.data.filter(event => {
                    const nftId = event.parsedJson?.nft_id;
                    return !soldIds.has(nftId) && !delistedIds.has(nftId);
                });

                // Query Escrow objects from list_nft transactions
                const escrowQuery = await suiClient.queryTransactionBlocks({
                    filter: {
                        MoveFunction: {
                            package: PACKAGE_ID,
                            module: 'marketplace',
                            function: 'list_nft',
                        },
                    },
                    options: { showEffects: true },
                    limit: 50,
                });

                if (isCancelled) return;

                // Get shared object IDs from transactions
                const escrowIds = [];
                for (const tx of escrowQuery.data) {
                    const created = tx.effects?.created || [];
                    for (const obj of created) {
                        if (obj.owner && typeof obj.owner === 'object' && 'Shared' in obj.owner) {
                            escrowIds.push(obj.reference.objectId);
                        }
                    }
                }

                // Batch fetch all escrow objects at once (not per listing!)
                const escrowObjects = await Promise.all(
                    escrowIds.map(async (id) => {
                        try {
                            return await suiClient.getObject({
                                id,
                                options: { showContent: true, showType: true },
                            });
                        } catch {
                            return null;
                        }
                    })
                );

                if (isCancelled) return;

                // Create map for O(1) lookup by listing_id
                const escrowMap = new Map();
                for (const obj of escrowObjects) {
                    if (!obj?.data?.content?.fields) continue;
                    const type = obj.data?.type || '';
                    if (!type.includes('::marketplace::Escrow')) continue;
                    escrowMap.set(obj.data.content.fields.listing_id, obj);
                }

                // Build active listings with escrow data
                const activeListings = [];
                for (const event of activeListedEvents) {
                    const { nft_id, price, seller } = event.parsedJson || {};
                    const escrow = escrowMap.get(nft_id);
                    
                    if (!escrow?.data?.objectId) continue;

                    const nftFields = escrow.data.content.fields.nft?.fields || {};
                    
                    activeListings.push({
                        escrowId: escrow.data.objectId,
                        nftId: nft_id,
                        nft: { content: { fields: nftFields } },
                        price: parseInt(price || 0),
                        seller,
                    });
                }

                if (!isCancelled) {
                    setListings(activeListings);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error('Error fetching listings:', error);
                    setStatus('Failed to load marketplace listings');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingListings(false);
                }
            }
        };

        fetchListings();
        
        // Cleanup function to prevent memory leak
        return () => {
            isCancelled = true;
        };
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
                        setStatus('NFT purchased successfully!');
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
                    <h2>NFT Marketplace</h2>
                </div>
                <div className="marketplace-notice">
                    <h3>Marketplace Not Configured</h3>
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
                <h2>NFT Marketplace</h2>
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
                    <p>Connect your wallet to buy NFTs</p>
                </div>
            )}

            {isLoadingListings ? (
                <div className="marketplace-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading marketplace listings...</p>
                </div>
            ) : listings.length === 0 ? (
                <div className="marketplace-empty">
                    <p>No NFTs listed for sale</p>
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
