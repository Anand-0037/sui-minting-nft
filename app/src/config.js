// Sui NFT dApp Configuration

export const CONFIG = {
    NETWORK: 'testnet',
    
    // Contract addresses - Update after deployment
    PACKAGE_ID: '0x65d3b58287684ab6e57e384d58016bedab225f06c23f512eeeaf008b0f1c213f',
    MARKETPLACE_ID: '0xbbc44d377e566952edb9e25094ec65ae372f9f44b7b20a3f1581459366d872fc',
    STAKING_POOL_ID: '0x7c1ae18b810104e72722a6ce14dc62a844343b15f1cde2667a4d69e4a2abe905',
    
    // Explorer
    EXPLORER_BASE: 'https://suiscan.xyz/testnet',
    
    // Transaction settings
    DEFAULT_GAS_BUDGET: 100000000,
    
    // Limits
    MAX_BATCH_SIZE: 50,
    MAX_DESCRIPTION_LENGTH: 200,
};

// Helper: Format Sui address for display
export const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper: Get explorer URL
export const getExplorerUrl = (type, id) => {
    return `${CONFIG.EXPLORER_BASE}/${type}/${id}`;
};

// Helper: Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
// Uses string manipulation to avoid floating point precision errors
export const suiToMist = (sui) => {
    // Handle edge cases
    if (sui === undefined || sui === null || sui === '') {
        return 0;
    }
    
    const num = Number(sui);
    if (isNaN(num) || num < 0) {
        return 0;
    }
    
    const suiStr = String(num);
    const [whole = '0', decimal = ''] = suiStr.split('.');
    // Pad decimal to 9 digits (MIST has 9 decimal places)
    const paddedDecimal = decimal.padEnd(9, '0').slice(0, 9);
    const mistStr = whole + paddedDecimal;
    // Parse as integer - remove leading zeros
    return parseInt(mistStr, 10);
};

// Helper: Convert MIST to SUI
export const mistToSui = (mist) => {
    return Number(mist) / 1_000_000_000;
};

// Helper: Format price for display (consistent formatting)
export const formatPrice = (priceInMist, decimals = 2) => {
    const sui = mistToSui(priceInMist);
    // Use fixed decimals but trim trailing zeros
    if (sui >= 1) {
        return sui.toFixed(decimals);
    } else if (sui >= 0.01) {
        return sui.toFixed(4);
    } else {
        return sui.toFixed(6);
    }
};

// Helper: Validate Sui address
export const isValidSuiAddress = (address) => {
    return /^0x[a-fA-F0-9]{64}$/.test(address);
};

// Helper: Extract image URL from NFT fields (handles various structures)
export const extractImageUrl = (fields) => {
    if (!fields) return '';
    
    // Direct string URL
    if (typeof fields.url === 'string') {
        return fields.url;
    }
    
    // Nested fields structure
    if (fields.url?.fields?.url) {
        return fields.url.fields.url;
    }
    
    // Alternative field names
    if (typeof fields.image_url === 'string') {
        return fields.image_url;
    }
    
    if (typeof fields.image === 'string') {
        return fields.image;
    }
    
    if (typeof fields.uri === 'string') {
        return fields.uri;
    }
    
    return '';
};
