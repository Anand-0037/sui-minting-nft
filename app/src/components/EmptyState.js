import React from 'react';
import './EmptyState.css';

const EmptyState = ({
    icon = '',
    title = 'Nothing here yet',
    description = 'Start by adding some items',
    actionLabel,
    onAction,
    variant = 'default' // default, compact, illustrated
}) => {
    return (
        <div className={`empty-state empty-state-${variant}`}>
            {icon && <div className="empty-state-icon">{icon}</div>}
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-description">{description}</p>
            {actionLabel && onAction && (
                <button className="empty-state-action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

// Preset empty states for common use cases
export const NFTEmptyState = () => (
    <EmptyState
        title="No NFTs Found"
        description="You don't have any NFTs yet. Mint your first one!"
    />
);

export const MarketplaceEmptyState = () => (
    <EmptyState
        title="No Listings Available"
        description="The marketplace is empty. Be the first to list an NFT!"
    />
);

export const StakingEmptyState = () => (
    <EmptyState
        title="No Staked NFTs"
        description="You haven't staked any NFTs yet. Stake to earn rewards!"
    />
);

export const WalletEmptyState = () => (
    <EmptyState
        title="Connect Your Wallet"
        description="Connect your Sui wallet to get started"
    />
);

export const ErrorEmptyState = ({ message }) => (
    <EmptyState
        title="Something Went Wrong"
        description={message || "An error occurred. Please try again."}
    />
);

export const SearchEmptyState = ({ query }) => (
    <EmptyState
        title="No Results Found"
        description={`No results found for "${query}". Try a different search.`}
    />
);

export default EmptyState;
