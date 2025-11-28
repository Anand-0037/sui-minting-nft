import React, { useState, useEffect, useMemo } from 'react';
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG, formatAddress, isValidSuiAddress, suiToMist, extractImageUrl } from '../config';
import './NFTGallery.css';

function NFTCard({ nft, onTransfer, onList, loadingNftId }) {
    const [showTransfer, setShowTransfer] = useState(false);
    const [showList, setShowList] = useState(false);
    const [recipient, setRecipient] = useState('');
    const [price, setPrice] = useState('');
    const [imageError, setImageError] = useState(false);

    const content = nft.data?.content;
    const fields = content?.fields || {};
    const objectId = nft.data?.objectId;
    const isThisLoading = loadingNftId === objectId;
    const imageUrl = extractImageUrl(fields);

    const handleTransferSubmit = () => {
        if (recipient && objectId) {
            onTransfer(objectId, recipient);
            setShowTransfer(false);
            setRecipient('');
        }
    };

    const handleListSubmit = () => {
        if (price && objectId) {
            onList(objectId, parseFloat(price));
            setShowList(false);
            setPrice('');
        }
    };

    return (
        <div className="nft-card">
            <div className="nft-image-container">
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={fields.name || 'NFT'} 
                        className="nft-image"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="listing-image-placeholder">
                        NFT
                    </div>
                )}
            </div>
            
            <div className="nft-details">
                <h3 className="nft-name">{fields.name || 'Unnamed NFT'}</h3>
                <p className="nft-description">{fields.description || 'No description'}</p>
                <p className="nft-id">ID: {formatAddress(objectId)}</p>
                
                <div className="nft-actions">
                    <button 
                        className="action-btn transfer-btn"
                        disabled={isThisLoading}
                        onClick={() => {
                            setShowTransfer(!showTransfer);
                            setShowList(false);
                        }}
                    >
                        {isThisLoading ? 'Processing...' : showTransfer ? 'Cancel' : 'Transfer'}
                    </button>
                    <button 
                        className="action-btn list-btn"
                        disabled={isThisLoading}
                        onClick={() => {
                            setShowList(!showList);
                            setShowTransfer(false);
                        }}
                    >
                        {isThisLoading ? 'Processing...' : showList ? 'Cancel' : 'List for Sale'}
                    </button>
                </div>

                {showTransfer && (
                    <div className="action-form">
                        <input
                            type="text"
                            placeholder="Recipient address (0x...)"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                        />
                        <button onClick={handleTransferSubmit} className="confirm-btn">
                            Send NFT
                        </button>
                    </div>
                )}

                {showList && (
                    <div className="action-form">
                        <input
                            type="number"
                            placeholder="Price in SUI"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            step="0.1"
                            min="0"
                        />
                        <button onClick={handleListSubmit} className="confirm-btn">
                            List NFT
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NFTGallery({ marketplaceId }) {
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const [status, setStatus] = useState('');
    const [loadingNftId, setLoadingNftId] = useState(null);
    const [stakedNftIds, setStakedNftIds] = useState(new Set());
    const [listedNftIds, setListedNftIds] = useState(new Set());

    const { data: ownedObjects, isLoading: isLoadingNFTs, refetch } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: currentAccount?.address,
            filter: {
                StructType: `${CONFIG.PACKAGE_ID}::mint_nft::NFT`,
            },
            options: {
                showContent: true,
                showDisplay: true,
            },
        },
        {
            enabled: !!currentAccount,
        }
    );

    // Fetch staked NFT IDs to filter them out of the gallery
    useEffect(() => {
        const fetchStakedNfts = async () => {
            if (!currentAccount || !CONFIG.STAKING_POOL_ID) {
                setStakedNftIds(new Set());
                return;
            }

            try {
                const stakeRecords = await suiClient.getOwnedObjects({
                    owner: currentAccount.address,
                    filter: {
                        StructType: `${CONFIG.PACKAGE_ID}::staking::StakeRecord`,
                    },
                    options: {
                        showContent: true,
                    },
                });

                const stakedIds = new Set(
                    stakeRecords.data
                        .map(obj => obj.data?.content?.fields?.nft?.fields?.id?.id)
                        .filter(Boolean)
                );
                setStakedNftIds(stakedIds);
            } catch (error) {
                console.error('Error fetching staked NFTs:', error);
            }
        };

        fetchStakedNfts();
    }, [currentAccount, suiClient]);

    // Fetch listed NFT IDs to filter them out (NFTs in escrow)
    useEffect(() => {
        const fetchListedNfts = async () => {
            if (!currentAccount || !CONFIG.MARKETPLACE_ID) {
                setListedNftIds(new Set());
                return;
            }

            try {
                // Query NFTListed events by this user
                const listedEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${CONFIG.PACKAGE_ID}::marketplace::NFTListed`,
                    },
                    limit: 100,
                });

                // Get NFT IDs listed by current user
                const userListedIds = listedEvents.data
                    .filter(event => event.parsedJson?.seller === currentAccount.address)
                    .map(event => event.parsedJson?.nft_id);

                // Query delisted events to remove from the set
                const delistedEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${CONFIG.PACKAGE_ID}::marketplace::NFTDelisted`,
                    },
                    limit: 100,
                });

                const delistedIds = new Set(
                    delistedEvents.data
                        .filter(event => event.parsedJson?.seller === currentAccount.address)
                        .map(event => event.parsedJson?.nft_id)
                );

                // Query sold events to remove from the set
                const soldEvents = await suiClient.queryEvents({
                    query: {
                        MoveEventType: `${CONFIG.PACKAGE_ID}::marketplace::NFTSold`,
                    },
                    limit: 100,
                });

                const soldIds = new Set(
                    soldEvents.data.map(event => event.parsedJson?.nft_id)
                );

                // Listed = listed - delisted - sold
                const activelyListedIds = new Set(
                    userListedIds.filter(id => id && !delistedIds.has(id) && !soldIds.has(id))
                );

                setListedNftIds(activelyListedIds);
            } catch (error) {
                console.error('Error fetching listed NFTs:', error);
            }
        };

        fetchListedNfts();
    }, [currentAccount, suiClient]);

    // Filter out staked AND listed NFTs from the gallery
    const availableNfts = useMemo(() => {
        if (!ownedObjects?.data) return [];
        return ownedObjects.data.filter(nft => {
            const nftId = nft.data?.objectId;
            return !stakedNftIds.has(nftId) && !listedNftIds.has(nftId);
        });
    }, [ownedObjects, stakedNftIds, listedNftIds]);

    const handleTransfer = async (nftId, recipientAddress) => {
        if (!isValidSuiAddress(recipientAddress)) {
            setStatus('Invalid address. Must be 0x followed by 64 hex characters');
            return;
        }

        setStatus('Transferring NFT...');
        setLoadingNftId(nftId);

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${CONFIG.PACKAGE_ID}::mint_nft::transfer_nft`,
                arguments: [
                    tx.object(nftId),
                    tx.pure.address(recipientAddress),
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: () => {
                        setStatus('NFT transferred successfully!');
                        setLoadingNftId(null);
                        setTimeout(() => {
                            refetch();
                            setStatus('');
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Transfer failed: ${error.message}`);
                        setLoadingNftId(null);
                        setTimeout(() => setStatus(''), 5000);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setLoadingNftId(null);
        }
    };

    const handleList = async (nftId, priceInSui) => {
        if (!marketplaceId) {
            setStatus('Marketplace not configured');
            return;
        }

        // Validate price
        if (!priceInSui || isNaN(priceInSui) || priceInSui <= 0) {
            setStatus('Please enter a valid price greater than 0');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        if (priceInSui < 0.001) {
            setStatus('Minimum listing price is 0.001 SUI');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        if (priceInSui > 1000000) {
            setStatus('Maximum listing price is 1,000,000 SUI');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        setStatus('Listing NFT...');
        setLoadingNftId(nftId);

        try {
            const tx = new Transaction();
            const priceInMist = suiToMist(priceInSui);

            tx.moveCall({
                target: `${CONFIG.PACKAGE_ID}::marketplace::list_nft`,
                arguments: [
                    tx.object(marketplaceId),
                    tx.object(nftId),
                    tx.pure.u64(Number(priceInMist)),
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: () => {
                        setStatus('NFT listed successfully!');
                        setLoadingNftId(null);
                        setTimeout(() => {
                            refetch();
                            setStatus('');
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Listing failed: ${error.message}`);
                        setLoadingNftId(null);
                        setTimeout(() => setStatus(''), 5000);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setLoadingNftId(null);
        }
    };

    if (!currentAccount) {
        return (
            <div className="gallery-container">
                <div className="gallery-empty">
                    <p>Connect your wallet to view your NFT collection</p>
                </div>
            </div>
        );
    }

    const nftCount = availableNfts.length;
    const stakedCount = stakedNftIds.size;
    const listedCount = listedNftIds.size;

    return (
        <div className="gallery-container">
            <div className="gallery-header">
                <h2>My NFT Collection</h2>
                <div className="nft-count">
                    <span className="count-badge">{nftCount}</span> NFT{nftCount !== 1 ? 's' : ''} available
                    {(stakedCount > 0 || listedCount > 0) && (
                        <span className="staked-info">
                            {stakedCount > 0 && ` (${stakedCount} staked)`}
                            {listedCount > 0 && ` (${listedCount} listed)`}
                        </span>
                    )}
                </div>
            </div>

            {status && (
                <div className={`gallery-status ${status.includes('failed') || status.includes('Error') ? 'error' : 'success'}`}>
                    {loadingNftId && <span className="spinner"></span>}
                    {status}
                </div>
            )}

            {isLoadingNFTs ? (
                <div className="gallery-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your NFTs...</p>
                </div>
            ) : nftCount === 0 ? (
                <div className="gallery-empty">
                    <p>No NFTs available!</p>
                    <p>
                        {(stakedCount > 0 || listedCount > 0) 
                            ? 'Your NFTs are staked or listed. Unstake or delist to see them here.' 
                            : 'Mint your first NFT to start your collection.'}
                    </p>
                </div>
            ) : (
                <div className="nft-grid">
                    {availableNfts.map((nft) => (
                        <NFTCard 
                            key={nft.data?.objectId} 
                            nft={nft} 
                            onTransfer={handleTransfer}
                            onList={handleList}
                            loadingNftId={loadingNftId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default NFTGallery;
