import React, { useState } from 'react';
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './NFTGallery.css';

const PACKAGE_ID = '0xb71b6701e4d6e9baec490494212ce78655760f73388e452ad90fb71d51c3981b';

function NFTCard({ nft, onTransfer, onList }) {
    const [showTransfer, setShowTransfer] = useState(false);
    const [showList, setShowList] = useState(false);
    const [recipient, setRecipient] = useState('');
    const [price, setPrice] = useState('');

    const content = nft.data?.content;
    const fields = content?.fields || {};
    const objectId = nft.data?.objectId;

    // Handle different URL formats
    let imageUrl = '';
    if (fields.url) {
        imageUrl = typeof fields.url === 'string' ? fields.url : fields.url.fields?.url || '';
    }

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
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={fields.name || 'NFT'} 
                        className="nft-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className="nft-image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                    NFT
                </div>
            </div>
            
            <div className="nft-details">
                <h3 className="nft-name">{fields.name || 'Unnamed NFT'}</h3>
                <p className="nft-description">{fields.description || 'No description'}</p>
                <p className="nft-id">ID: {objectId?.slice(0, 8)}...{objectId?.slice(-6)}</p>
                
                <div className="nft-actions">
                    <button 
                        className="action-btn transfer-btn"
                        onClick={() => {
                            setShowTransfer(!showTransfer);
                            setShowList(false);
                        }}
                    >
                        {showTransfer ? 'Cancel' : 'Transfer'}
                    </button>
                    <button 
                        className="action-btn list-btn"
                        onClick={() => {
                            setShowList(!showList);
                            setShowTransfer(false);
                        }}
                    >
                        {showList ? 'Cancel' : 'List for Sale'}
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
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { data: ownedObjects, isLoading: isLoadingNFTs, refetch } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: currentAccount?.address,
            filter: {
                StructType: `${PACKAGE_ID}::mint_nft::NFT`,
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

    const handleTransfer = async (nftId, recipientAddress) => {
        // Bug #6 Fix: Proper Sui address validation (0x + 64 hex chars = 66 total)
        const addressRegex = /^0x[a-fA-F0-9]{64}$/;
        
        if (!addressRegex.test(recipientAddress)) {
            setStatus('Invalid Sui address. Must be 0x followed by 64 hex characters');
            return;
        }

        setStatus('Transferring NFT...');
        setIsLoading(true);

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::mint_nft::transfer_nft`,
                arguments: [
                    tx.object(nftId),
                    tx.pure.address(recipientAddress),
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        setStatus('NFT transferred successfully!');
                        setIsLoading(false);
                        // Refresh the gallery after transfer
                        setTimeout(() => {
                            refetch();
                            setStatus('');
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Transfer failed: ${error.message}`);
                        setIsLoading(false);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setIsLoading(false);
        }
    };

    const handleList = async (nftId, priceInSui) => {
        if (!marketplaceId) {
            setStatus('Marketplace not configured. Deploy marketplace contract first.');
            return;
        }

        setStatus('Listing NFT...');
        setIsLoading(true);

        try {
            const tx = new Transaction();
            
            // Bug #7 Fix: Avoid floating point precision issues
            const priceStr = priceInSui.toString();
            const [whole, decimal = '0'] = priceStr.split('.');
            const paddedDecimal = decimal.padEnd(9, '0').slice(0, 9);
            // eslint-disable-next-line no-undef
            const priceInMist = window.BigInt(whole) * window.BigInt(1000000000) + window.BigInt(paddedDecimal);

            tx.moveCall({
                target: `${PACKAGE_ID}::marketplace::list_nft`,
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
                        setIsLoading(false);
                        setTimeout(() => {
                            refetch();
                            setStatus('');
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Listing failed: ${error.message}`);
                        setIsLoading(false);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setIsLoading(false);
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

    const nfts = ownedObjects?.data || [];
    const nftCount = nfts.length;

    return (
        <div className="gallery-container">
            <div className="gallery-header">
                <h2>My NFT Collection</h2>
                <div className="nft-count">
                    <span className="count-badge">{nftCount}</span> NFT{nftCount !== 1 ? 's' : ''} owned
                </div>
            </div>

            {status && (
                <div className={`gallery-status ${status.includes('failed') || status.includes('Error') ? 'error' : 'success'}`}>
                    {isLoading && <span className="spinner"></span>}
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
                    <p>No NFTs yet!</p>
                    <p>Mint your first NFT to start your collection.</p>
                </div>
            ) : (
                <div className="nft-grid">
                    {nfts.map((nft) => (
                        <NFTCard 
                            key={nft.data?.objectId} 
                            nft={nft} 
                            onTransfer={handleTransfer}
                            onList={handleList}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default NFTGallery;
