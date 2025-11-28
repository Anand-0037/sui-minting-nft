import React, { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG, formatAddress, formatPrice, extractImageUrl } from '../config';
import './Marketplace.css';

function ListingCard({ listing, onBuy, currentAccount, loadingId }) {
    const { escrowId, nftId, nft, price, seller } = listing;
    const [imageError, setImageError] = useState(false);
    const formattedPrice = formatPrice(price);
    const isOwner = currentAccount?.address === seller;
    const isLoading = loadingId === escrowId;

    const fields = nft?.content?.fields || {};
    const imageUrl = extractImageUrl(fields);

    return (
        <div className="listing-card">
            <div className="listing-image-container">
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={fields.name || 'NFT'} 
                        className="listing-image"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="listing-image-placeholder">
                        NFT
                    </div>
                )}
            </div>

            <div className="listing-details">
                <h3 className="listing-name">{fields.name || 'Unnamed NFT'}</h3>
                <p className="listing-description">{fields.description || 'No description'}</p>
                
                <div className="listing-price">
                    <span className="price-label">Price:</span>
                    <span className="price-value">{formattedPrice} SUI</span>
                </div>

                <p className="listing-seller">
                    Seller: {formatAddress(seller)}
                    {isOwner && <span className="owner-badge"> (You)</span>}
                </p>

                <button
                    className={`buy-btn ${isOwner ? 'disabled' : ''}`}
                    onClick={() => onBuy(escrowId, nftId, price)}
                    disabled={isOwner || isLoading || !currentAccount}
                >
                    {isOwner ? 'Your Listing' : isLoading ? 'Processing...' : `Buy for ${formattedPrice} SUI`}
                </button>
            </div>
        </div>
    );
}

function Marketplace({ marketplaceId = CONFIG.MARKETPLACE_ID }) {
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    
    const [listings, setListings] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [status, setStatus] = useState('');
    const [isLoadingListings, setIsLoadingListings] = useState(true);
    const [failedCount, setFailedCount] = useState(0);

    const fetchListings = useCallback(async () => {
        if (!marketplaceId) {
            setIsLoadingListings(false);
            return;
        }

        try {
            setIsLoadingListings(true);
            
            // Step 1: Get listing events to find escrow IDs
            // Note: Events are used only to discover escrow IDs, not as source of truth
            // The actual source of truth is whether the Escrow object still exists
            const listedEvents = await suiClient.queryEvents({
                query: { MoveEventType: `${CONFIG.PACKAGE_ID}::marketplace::NFTListed` },
                limit: 100, // Increased limit for better coverage
            });

            if (listedEvents.data.length === 0) {
                setListings([]);
                setFailedCount(0);
                return;
            }

            // Extract escrow IDs from events
            const escrowIds = listedEvents.data
                .map(e => e.parsedJson?.escrow_id)
                .filter(Boolean);

            if (escrowIds.length === 0) {
                setListings([]);
                setFailedCount(0);
                return;
            }

            // Step 2: Batch fetch all escrow objects
            // This is the SOURCE OF TRUTH - if object exists, listing is active
            // If object was deleted (sold/delisted), it won't be returned
            const escrowObjects = await suiClient.multiGetObjects({
                ids: escrowIds,
                options: { showContent: true, showType: true },
            });

            // Step 3: Process only existing escrow objects (active listings)
            // No need to query sold/delisted events - non-existent objects = inactive
            const activeListings = [];
            let failed = 0;

            escrowObjects.forEach((obj, index) => {
                // If object doesn't exist or has error, it's been sold/delisted
                if (!obj?.data || obj.error) {
                    return; // Skip - listing no longer active
                }

                const escrowContent = obj.data.content;
                if (!escrowContent?.fields) {
                    failed++;
                    return;
                }

                // Extract NFT data from escrow
                const nftData = escrowContent.fields.nft;
                let nftFields = {};
                
                if (nftData) {
                    nftFields = nftData.fields || nftData;
                }

                // Get listing info from the original event
                const event = listedEvents.data[index];
                const { nft_id, price, seller } = event?.parsedJson || {};

                activeListings.push({
                    escrowId: obj.data.objectId,
                    nftId: nft_id || escrowContent.fields.listing_id,
                    nft: { 
                        content: { 
                            fields: nftFields
                        } 
                    },
                    price: parseInt(price || escrowContent.fields.price || 0),
                    seller: seller || escrowContent.fields.seller,
                });
            });

            setListings(activeListings);
            setFailedCount(failed);
        } catch (error) {
            console.error('Error fetching listings:', error);
            setStatus('Failed to load marketplace');
            setTimeout(() => setStatus(''), 5000);
        } finally {
            setIsLoadingListings(false);
        }
    }, [marketplaceId, suiClient]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    const handleBuy = async (escrowId, nftId, price) => {
        if (!currentAccount || !marketplaceId) {
            setStatus('Please connect wallet');
            return;
        }

        setStatus('Processing purchase...');
        setLoadingId(escrowId);

        try {
            const tx = new Transaction();
            const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(price)]);

            tx.moveCall({
                target: `${CONFIG.PACKAGE_ID}::marketplace::buy_nft`,
                arguments: [
                    tx.object(marketplaceId),
                    tx.object(escrowId),
                    paymentCoin,
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: () => {
                        setStatus('NFT purchased successfully!');
                        setLoadingId(null);
                        // Refresh listings from the server to get accurate state
                        setTimeout(() => {
                            fetchListings();
                            setStatus('');
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Purchase failed: ${error.message}`);
                        setLoadingId(null);
                        setTimeout(() => setStatus(''), 5000);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setLoadingId(null);
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
                    <p>Deploy the contract and update MARKETPLACE_ID in config.js</p>
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
                    {failedCount > 0 && (
                        <span className="stat-badge warning">{failedCount} unavailable</span>
                    )}
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
                    <p>Loading marketplace...</p>
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
                            key={listing.escrowId}
                            listing={listing}
                            onBuy={handleBuy}
                            currentAccount={currentAccount}
                            loadingId={loadingId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Marketplace;
