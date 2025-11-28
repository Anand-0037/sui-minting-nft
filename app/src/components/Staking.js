import React, { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG, formatAddress, mistToSui, extractImageUrl } from '../config';
import './Staking.css';

// Reward rate: 1 MIST per second (matches contract)
const REWARD_RATE_PER_SECOND = 1;

function StakedNFTCard({ stake, onUnstake, loadingId, currentTime }) {
    const { stakeId, nft, stakeTime } = stake;
    const [imageError, setImageError] = useState(false);
    const isLoading = loadingId === stakeId;

    const fields = nft?.content?.fields || {};
    const imageUrl = extractImageUrl(fields);

    // Calculate real-time rewards
    const stakeDurationMs = currentTime - stakeTime;
    const stakeDurationSeconds = Math.floor(stakeDurationMs / 1000);
    const pendingRewards = stakeDurationSeconds * REWARD_RATE_PER_SECOND;
    const rewardsInSui = mistToSui(pendingRewards);

    // Format duration
    const hours = Math.floor(stakeDurationSeconds / 3600);
    const minutes = Math.floor((stakeDurationSeconds % 3600) / 60);
    const seconds = stakeDurationSeconds % 60;
    const durationStr = `${hours}h ${minutes}m ${seconds}s`;

    return (
        <div className="staked-nft-card">
            <div className="staked-nft-image">
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={fields.name || 'NFT'} 
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="staked-placeholder">
                        NFT
                    </div>
                )}
                <div className="staked-badge">STAKED</div>
            </div>

            <div className="staked-nft-details">
                <h3>{fields.name || 'Unnamed NFT'}</h3>
                <p className="stake-duration">Staked: {durationStr}</p>
                
                <div className="rewards-display">
                    <span className="rewards-label">Pending Rewards:</span>
                    <span className="rewards-value">{rewardsInSui.toFixed(9)} SUI</span>
                </div>

                <button
                    className="unstake-btn"
                    onClick={() => onUnstake(stakeId)}
                    disabled={isLoading}
                >
                    {isLoading ? 'Unstaking...' : `Unstake & Claim ${rewardsInSui.toFixed(4)} SUI`}
                </button>
            </div>
        </div>
    );
}

function UnstakedNFTCard({ nft, onStake, loadingId }) {
    const [imageError, setImageError] = useState(false);
    const objectId = nft.data?.objectId;
    const fields = nft.data?.content?.fields || {};
    const isLoading = loadingId === objectId;
    const imageUrl = extractImageUrl(fields);

    return (
        <div className="unstaked-nft-card">
            <div className="unstaked-nft-image">
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={fields.name || 'NFT'} 
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="unstaked-placeholder">
                        NFT
                    </div>
                )}
            </div>

            <div className="unstaked-nft-details">
                <h3>{fields.name || 'Unnamed NFT'}</h3>
                <p className="nft-id">ID: {formatAddress(objectId)}</p>
                
                <button
                    className="stake-btn"
                    onClick={() => onStake(objectId)}
                    disabled={isLoading}
                >
                    {isLoading ? 'Staking...' : 'Stake NFT'}
                </button>
            </div>
        </div>
    );
}

function Staking({ stakingPoolId, onStakeChange }) {
    const currentAccount = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [stakedNFTs, setStakedNFTs] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [status, setStatus] = useState('');
    const [isLoadingStakes, setIsLoadingStakes] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time every second for real-time rewards
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch unstaked NFTs (owned by user)
    const { data: ownedNFTs, isLoading: isLoadingOwned, refetch: refetchOwned } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: currentAccount?.address,
            filter: {
                StructType: `${CONFIG.PACKAGE_ID}::mint_nft::NFT`,
            },
            options: {
                showContent: true,
            },
        },
        {
            enabled: !!currentAccount,
        }
    );

    // Fetch staked NFTs (StakeRecord objects owned by user)
    const fetchStakedNFTs = useCallback(async () => {
        if (!currentAccount || !stakingPoolId) {
            setIsLoadingStakes(false);
            return;
        }

        try {
            setIsLoadingStakes(true);

            // Query StakeRecord objects owned by user
            const stakeRecords = await suiClient.getOwnedObjects({
                owner: currentAccount.address,
                filter: {
                    StructType: `${CONFIG.PACKAGE_ID}::staking::StakeRecord`,
                },
                options: {
                    showContent: true,
                },
            });

            const stakes = stakeRecords.data
                .filter(obj => obj.data?.content?.fields)
                .map(obj => {
                    const fields = obj.data.content.fields;
                    return {
                        stakeId: obj.data.objectId,
                        nftId: fields.nft?.fields?.id?.id || '',
                        nft: { content: { fields: fields.nft?.fields || {} } },
                        stakeTime: parseInt(fields.stake_time_ms || 0),
                        owner: fields.owner,
                    };
                });

            setStakedNFTs(stakes);
        } catch (error) {
            console.error('Error fetching staked NFTs:', error);
        } finally {
            setIsLoadingStakes(false);
        }
    }, [currentAccount, stakingPoolId, suiClient]);

    useEffect(() => {
        fetchStakedNFTs();
    }, [fetchStakedNFTs]);

    const handleStake = async (nftId) => {
        if (!currentAccount || !stakingPoolId) {
            setStatus('Please connect wallet');
            return;
        }

        setStatus('Staking NFT...');
        setLoadingId(nftId);

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${CONFIG.PACKAGE_ID}::staking::stake_nft`,
                arguments: [
                    tx.object(stakingPoolId),
                    tx.object(nftId),
                    tx.object('0x6'), // Clock object
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: () => {
                        setStatus('NFT staked successfully! Start earning rewards.');
                        setLoadingId(null);
                        setTimeout(() => {
                            refetchOwned();
                            fetchStakedNFTs();
                            setStatus('');
                            // Notify parent to refresh gallery
                            if (onStakeChange) onStakeChange();
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Staking failed: ${error.message}`);
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

    const handleUnstake = async (stakeId) => {
        if (!currentAccount || !stakingPoolId) {
            setStatus('Please connect wallet');
            return;
        }

        setStatus('Unstaking NFT and claiming rewards...');
        setLoadingId(stakeId);

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${CONFIG.PACKAGE_ID}::staking::unstake_nft`,
                arguments: [
                    tx.object(stakingPoolId),
                    tx.object(stakeId),
                    tx.object('0x6'), // Clock object
                ],
            });

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: () => {
                        setStatus('NFT unstaked! Rewards claimed.');
                        setLoadingId(null);
                        setTimeout(() => {
                            refetchOwned();
                            fetchStakedNFTs();
                            setStatus('');
                            // Notify parent to refresh gallery
                            if (onStakeChange) onStakeChange();
                        }, 2000);
                    },
                    onError: (error) => {
                        setStatus(`Unstaking failed: ${error.message}`);
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

    if (!currentAccount) {
        return (
            <div className="staking-container">
                <div className="staking-empty">
                    <h2>NFT Staking</h2>
                    <p>Connect your wallet to stake NFTs and earn rewards</p>
                </div>
            </div>
        );
    }

    if (!stakingPoolId) {
        return (
            <div className="staking-container">
                <div className="staking-notice">
                    <h2>NFT Staking</h2>
                    <h3>Staking Pool Not Configured</h3>
                    <p>Deploy the staking contract and update STAKING_POOL_ID in config.js</p>
                </div>
            </div>
        );
    }

    const unstakedNFTs = ownedNFTs?.data || [];
    const totalStaked = stakedNFTs.length;
    const totalUnstaked = unstakedNFTs.length;

    // Calculate total pending rewards
    const totalPendingRewards = stakedNFTs.reduce((sum, stake) => {
        const durationMs = currentTime - stake.stakeTime;
        const durationSeconds = Math.floor(durationMs / 1000);
        return sum + (durationSeconds * REWARD_RATE_PER_SECOND);
    }, 0);

    return (
        <div className="staking-container">
            <div className="staking-header">
                <h2>NFT Staking</h2>
                <p className="staking-subtitle">Stake your NFTs to earn rewards over time</p>
                
                <div className="staking-stats">
                    <div className="stat-card">
                        <span className="stat-value">{totalStaked}</span>
                        <span className="stat-label">Staked</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{totalUnstaked}</span>
                        <span className="stat-label">Available</span>
                    </div>
                    <div className="stat-card rewards">
                        <span className="stat-value">{mistToSui(totalPendingRewards).toFixed(6)}</span>
                        <span className="stat-label">Pending SUI</span>
                    </div>
                </div>
            </div>

            {status && (
                <div className={`staking-status ${status.includes('failed') || status.includes('Error') ? 'error' : 'success'}`}>
                    {status}
                </div>
            )}

            {/* Staked NFTs Section */}
            <div className="staking-section">
                <h3>Your Staked NFTs</h3>
                {isLoadingStakes ? (
                    <div className="staking-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading staked NFTs...</p>
                    </div>
                ) : stakedNFTs.length === 0 ? (
                    <div className="staking-empty-section">
                        <p>No NFTs staked yet. Stake some to start earning!</p>
                    </div>
                ) : (
                    <div className="staked-grid">
                        {stakedNFTs.map((stake) => (
                            <StakedNFTCard
                                key={stake.stakeId}
                                stake={stake}
                                onUnstake={handleUnstake}
                                loadingId={loadingId}
                                currentTime={currentTime}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Available NFTs Section */}
            <div className="staking-section">
                <h3>Available to Stake</h3>
                {isLoadingOwned ? (
                    <div className="staking-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading your NFTs...</p>
                    </div>
                ) : unstakedNFTs.length === 0 ? (
                    <div className="staking-empty-section">
                        <p>No NFTs available. Mint some first!</p>
                    </div>
                ) : (
                    <div className="unstaked-grid">
                        {unstakedNFTs.map((nft) => (
                            <UnstakedNFTCard
                                key={nft.data?.objectId}
                                nft={nft}
                                onStake={handleStake}
                                loadingId={loadingId}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="staking-info">
                <h3>How Staking Works</h3>
                <ul>
                    <li>Stake your NFTs to earn <strong>1 MIST per second</strong></li>
                    <li>Rewards accumulate in real-time while staked</li>
                    <li>Unstake anytime to get your NFT back + rewards</li>
                    <li>No lock-up period - full flexibility!</li>
                </ul>
                <p className="staking-disclaimer">
                    <strong>Demo Notice:</strong> This is a testnet demonstration. Reward calculations are shown for educational purposes.
                </p>
            </div>
        </div>
    );
}

export default Staking;
