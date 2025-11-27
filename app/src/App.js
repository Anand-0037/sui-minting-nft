import React, { useState, useCallback } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider, ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';
import MintNFT from './components/MintNFT';
import NFTGallery from './components/NFTGallery';
import Marketplace from './components/Marketplace';
import ErrorBoundary from './components/ErrorBoundary';

const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl('testnet') },
});

const queryClient = new QueryClient();

// Tab navigation component
function TabNavigation({ activeTab, setActiveTab }) {
    const tabs = [
        { id: 'mint', label: 'Mint', icon: '' },
        { id: 'gallery', label: 'Gallery', icon: '' },
        { id: 'marketplace', label: 'Market', icon: '' },
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
                <h1>Sui NFT Studio</h1>
                <span className="network-badge">Testnet</span>
            </div>
            <div className="header-wallet">
                {currentAccount && (
                    <span className="wallet-address">
                        {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
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

    // Callback to refresh gallery after minting
    const handleMintSuccess = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <div className="app-wrapper">
            <AppHeader />
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <main className="app-main">
                {activeTab === 'mint' && (
                    <MintNFT onMintSuccess={handleMintSuccess} />
                )}
                {activeTab === 'gallery' && (
                    <NFTGallery key={refreshKey} marketplaceId="0xfe0ab263064cef19889664cfa066ba4ab2945ee11ec759b93960592d9e0d2174" />
                )}
                {activeTab === 'marketplace' && (
                    <Marketplace />
                )}
            </main>

            <footer className="app-footer">
                <p><a href="https://github.com/Anand-0037" target="_blank" rel="noopener noreferrer">@Anand-0037</a></p>
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
