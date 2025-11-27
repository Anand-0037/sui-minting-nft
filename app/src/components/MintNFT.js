import React, { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './MintNFT.css';

const PACKAGE_ID = '0xb71b6701e4d6e9baec490494212ce78655760f73388e452ad90fb71d51c3981b';

function MintNFT({ onMintSuccess }) {
    const currentAccount = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [status, setStatus] = useState('');
    const [txDigest, setTxDigest] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imagePreviewError, setImagePreviewError] = useState(false);

    const handleMint = async (e) => {
        e.preventDefault();

        if (!currentAccount) {
            setStatus('Please connect your wallet first');
            return;
        }

        if (!name || !description || !imageUrl) {
            setStatus('Please fill in all fields');
            return;
        }

        setStatus('Minting NFT...');
        setIsLoading(true);

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::mint_nft::mint_nft`,
                arguments: [
                    tx.pure.string(name),
                    tx.pure.string(description),
                    tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
                ],
            });

            signAndExecute(
                {
                    transaction: tx,
                },
                {
                    onSuccess: (result) => {
                        setStatus('NFT minted successfully!');
                        setTxDigest(result.digest);
                        setName('');
                        setDescription('');
                        setImageUrl('');
                        setIsLoading(false);
                        setImagePreviewError(false);
                        // Notify parent component to refresh gallery
                        if (onMintSuccess) {
                            onMintSuccess();
                        }
                    },
                    onError: (error) => {
                        setStatus(`Error: ${error.message}`);
                        setIsLoading(false);
                    },
                }
            );
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="mint-container">
            <div className="mint-card">
                <h1>Mint Your First Sui NFT</h1>

                <div className="wallet-section">
                    <ConnectButton />
                </div>

                {currentAccount && (
                    <div className="connected-info">
                        <p>Connected: {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}</p>
                    </div>
                )}

                <form onSubmit={handleMint} className="mint-form">
                    <div className="form-group">
                        <label htmlFor="name">NFT Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome NFT"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A unique NFT on Sui blockchain"
                            rows="3"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="imageUrl">Image URL</label>
                        <input
                            id="imageUrl"
                            type="url"
                            value={imageUrl}
                            onChange={(e) => {
                                setImageUrl(e.target.value);
                                setImagePreviewError(false);
                            }}
                            placeholder="https://example.com/image.png"
                            required
                        />
                        {imageUrl && (
                            <div className="image-preview">
                                <p className="preview-label">Preview:</p>
                                {!imagePreviewError ? (
                                    <img 
                                        src={imageUrl} 
                                        alt="NFT Preview" 
                                        className="preview-image"
                                        onError={() => setImagePreviewError(true)}
                                    />
                                ) : (
                                    <div className="preview-error">
                                        Unable to load image preview
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button type="submit" className="mint-button" disabled={!currentAccount || isLoading}>
                        {isLoading ? 'Minting...' : currentAccount ? 'Mint NFT' : 'Connect Wallet to Mint'}
                    </button>
                </form>

                {status && (
                    <div className={`status-message ${status.includes('Error') ? 'error' : 'success'}`}>
                        {status}
                    </div>
                )}

                {txDigest && (
                    <div className="explorer-link">
                        <a
                            href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View on Explorer →
                        </a>
                    </div>
                )}

                <div className="info-box">
                    <h3>Instructions</h3>
                    <ol>
                        <li>Connect your Sui wallet (Sui Wallet or Ethos)</li>
                        <li>Make sure you have testnet SUI tokens</li>
                        <li>Fill in the NFT details</li>
                        <li>Click "Mint NFT" and approve the transaction</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default MintNFT;
