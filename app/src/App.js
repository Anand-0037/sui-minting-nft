import React, { useState, useCallback, useEffect } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider, ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';
import { CONFIG, formatAddress } from './config';
import MintNFT from './components/MintNFT';
import NFTGallery from './components/NFTGallery';
import Marketplace from './components/Marketplace';
import Staking from './components/Staking';
import ErrorBoundary from './components/ErrorBoundary';

const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl('testnet') },
});

const queryClient = new QueryClient();

// Tab navigation component
function TabNavigation({ activeTab, setActiveTab }) {
    const tabs = [
        { id: 'mint', label: 'Mint' },
        { id: 'gallery', label: 'Gallery' },
        { id: 'marketplace', label: 'Marketplace' },
        { id: 'staking', label: 'Staking' },
    ];

    return (
        <div className="tab-navigation">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// Header component
function AppHeader() {
    const currentAccount = useCurrentAccount();
    
    return (
        <header className="app-header">
            <div className="header-brand">
                <div className="brand-logo">S</div>
                <h1>Sui NFT Studio</h1>
                <span className="network-badge">{CONFIG.NETWORK}</span>
            </div>
            <div className="header-wallet">
                {currentAccount && (
                    <span className="wallet-address">
                        {formatAddress(currentAccount.address)}
                    </span>
                )}
                <ConnectButton />
            </div>
        </header>
    );
}

// Main app content
function AppContent() {
    const [activeTab, setActiveTab] = useState('mint');
    const [refreshKey, setRefreshKey] = useState(0);
    const currentAccount = useCurrentAccount();

    // Callback to refresh gallery after minting or staking changes
    const handleMintSuccess = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    // Handle wallet disconnect - reset to mint tab
    useEffect(() => {
        if (!currentAccount) {
            setActiveTab('mint');
        }
    }, [currentAccount]);

    // Show connect prompt if not connected
    if (!currentAccount) {
        return (
            <div className="app-wrapper">
                <AppHeader />
                <main className="app-main">
                    <div className="connect-prompt">
                        <div className="connect-prompt-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                <path d="M9 12l2 2 4-4"/>
                            </svg>
                        </div>
                        <h2>Welcome to Sui NFT Studio</h2>
                        <p>Connect your wallet to start minting, trading, and staking NFTs on the Sui blockchain.</p>
                        <ConnectButton />
                    </div>
                </main>
                <footer className="app-footer">
                    <div className="footer-content">
                        <span>Built by</span>
                        <a href="https://github.com/Anand-0037" target="_blank" rel="noopener noreferrer">Anand Vashishtha</a>
                    </div>
                </footer>
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            <AppHeader />
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <main className="app-main">
                {activeTab === 'mint' && (
                    <MintNFT onMintSuccess={handleMintSuccess} />
                )}
                {activeTab === 'gallery' && (
                    <NFTGallery key={refreshKey} marketplaceId={CONFIG.MARKETPLACE_ID} />
                )}
                {activeTab === 'marketplace' && (
                    <Marketplace />
                )}
                {activeTab === 'staking' && (
                    <Staking stakingPoolId={CONFIG.STAKING_POOL_ID} onStakeChange={handleMintSuccess} />
                )}
            </main>

            <footer className="app-footer">
                <div className="footer-content">
                    <span>Built by</span>
                    <a href="https://github.com/Anand-0037" target="_blank" rel="noopener noreferrer">Anand Vashishtha</a>
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
                    <WalletProvider autoConnect>
                        <div className="App">
                            <AppContent />
                        </div>
                    </WalletProvider>
                </SuiClientProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

export default App;
