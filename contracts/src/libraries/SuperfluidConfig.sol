// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SuperfluidConfig
/// @notice Configuration library for Superfluid Protocol host addresses
/// @dev Addresses sourced from: https://docs.superfluid.finance/docs/protocol/networks
library SuperfluidConfig {
    /// @notice Get Superfluid Host address for a given chain
    /// @param chainId The chain ID to get the host for
    /// @return host The Superfluid host address (address(0) if not supported)
    function getSuperfluidHost(uint256 chainId) internal pure returns (address host) {
        // Mainnet deployments
        if (chainId == 1) return 0x4E583d9390082B65Bef884b629DFA426114CED6d;        // Ethereum
        if (chainId == 137) return 0x3E14dC1b13c488a8d5D310918780c983bD5982E7;      // Polygon
        if (chainId == 10) return 0x567c4B141ED61923967cA25Ef4906C8781069a10;       // Optimism
        if (chainId == 42161) return 0xCf8Acb4eF033efF16E8080aed4c7D5B9285D2192;    // Arbitrum One
        if (chainId == 43114) return 0x60377C7016E4cdB03C87EF474896C11cB560752C;    // Avalanche
        if (chainId == 8453) return 0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74;     // Base
        if (chainId == 56) return 0xd1e2cFb6441680002Eb7A44223160aB9B67d7E6E;       // BNB Chain
        if (chainId == 100) return 0x2dFe937cD98Ab92e59cF3139138f18c823a4efE7;      // Gnosis Chain
        if (chainId == 42220) return 0x18bE99A3EE4DB1E64fa208b23e03E72d4E09Eca4;    // Celo
        
        // Testnet deployments
        if (chainId == 11155111) return 0x109412E3C84f0539b43d39dB691B08c90f58dC7c; // Sepolia
        if (chainId == 80002) return 0x22ff293e14F1EC3A09B137e9e06084AFd63adDF9;    // Polygon Amoy
        if (chainId == 84532) return 0x4C073B3baB6d8826b8C5b229f3cfdC1eC6E47E74;    // Base Sepolia
        if (chainId == 11155420) return 0xd399e2Fb5f4cf3722a11F65b88FAB6B2B8621005; // OP Sepolia
        if (chainId == 421614) return 0xCf8Acb4eF033efF16E8080aed4c7D5B9285D2192;   // Arbitrum Sepolia
        if (chainId == 44787) return 0xbF8e298D8C2E42C91cD160866FB48DDfcbfd5767;    // Celo Alfajores
        
        return address(0); // Chain not supported
    }

    /// @notice Check if Superfluid is available on a given chain
    /// @param chainId The chain ID to check
    /// @return available True if Superfluid is available
    function isSuperfluidAvailable(uint256 chainId) internal pure returns (bool available) {
        return getSuperfluidHost(chainId) != address(0);
    }

    /// @notice Get supported chain IDs
    /// @return chainIds Array of supported chain IDs
    function getSupportedChains() internal pure returns (uint256[] memory chainIds) {
        chainIds = new uint256[](15);
        chainIds[0] = 1;         // Ethereum
        chainIds[1] = 137;       // Polygon
        chainIds[2] = 10;        // Optimism
        chainIds[3] = 42161;     // Arbitrum One
        chainIds[4] = 43114;     // Avalanche
        chainIds[5] = 8453;      // Base
        chainIds[6] = 56;        // BNB Chain
        chainIds[7] = 100;       // Gnosis Chain
        chainIds[8] = 42220;     // Celo
        chainIds[9] = 11155111;  // Sepolia
        chainIds[10] = 80002;    // Polygon Amoy
        chainIds[11] = 84532;    // Base Sepolia
        chainIds[12] = 11155420; // OP Sepolia
        chainIds[13] = 421614;   // Arbitrum Sepolia
        chainIds[14] = 44787;    // Celo Alfajores
        return chainIds;
    }
}