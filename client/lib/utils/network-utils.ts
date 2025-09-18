/**
 * Network Configuration Utilities
 * 
 * Simple utility functions for network-specific configuration,
 * extracted from the complex useNetworkConfig hook.
 */

import { getProtocolAddresses, isProtocolSupported, type ProtocolAddresses } from '@/config/protocol-addresses'

/**
 * Get network-specific settings based on chain characteristics
 */
export function getNetworkSettings(chainId: number) {
  // Layer 2 networks (faster, cheaper)
  const isLayer2 = [10, 8453, 42161, 100].includes(chainId)
  
  // Test networks
  const isTestnet = [84532, 11155111, 31337, 1337].includes(chainId)
  
  return {
    blockConfirmations: isTestnet ? 1 : isLayer2 ? 3 : 6,
    gasMultiplier: isLayer2 ? 1.1 : 1.2,
    cacheTimeout: isTestnet ? 30000 : 300000 // 30s for testnet, 5min for mainnet
  }
}

/**
 * Get network-specific API endpoints
 */
export function getAPIEndpoints(chainId: number) {
  return {
    poap: 'https://api.poap.tech',
    alchemy: process.env.NEXT_PUBLIC_ALCHEMY_ID ? 
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}` : 
      undefined,
    hypercerts: 'https://api.hypercerts.io'
  }
}

/**
 * Get feature availability flags for a network
 */
export function getNetworkFeatures(chainId: number) {
  return {
    poapSupported: isProtocolSupported(chainId, 'poap'),
    hatsSupported: isProtocolSupported(chainId, 'hats'),
    unlockSupported: isProtocolSupported(chainId, 'unlock'),
    hypercerrtsSupported: isProtocolSupported(chainId, 'hypercerts'),
    nftValidationSupported: chainId !== 31337 && chainId !== 1337 // Disable on local networks
  }
}

/**
 * Get complete network configuration for a chain
 */
export function getNetworkConfig(chainId: number) {
  return {
    protocolAddresses: getProtocolAddresses(chainId),
    apiEndpoints: getAPIEndpoints(chainId),
    features: getNetworkFeatures(chainId),
    settings: getNetworkSettings(chainId)
  }
}

/**
 * Get network name for display
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1: return 'Ethereum'
    case 8453: return 'Base'
    case 84532: return 'Base Sepolia'
    case 10: return 'Optimism'
    case 11155420: return 'Optimism Sepolia'
    case 42161: return 'Arbitrum'
    case 421614: return 'Arbitrum Sepolia'
    case 100: return 'Gnosis'
    case 137: return 'Polygon'
    case 11155111: return 'Sepolia'
    case 31337: return 'Local'
    case 1337: return 'Localhost'
    default: return `Chain ${chainId}`
  }
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerAddressUrl(address: string, chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    10: 'https://optimistic.etherscan.io',
    11155420: 'https://sepolia-optimism.etherscan.io',
    42161: 'https://arbiscan.io',
    421614: 'https://sepolia.arbiscan.io',
    100: 'https://gnosisscan.io',
    137: 'https://polygonscan.com',
    11155111: 'https://sepolia.etherscan.io',
  }

  const baseUrl = explorers[chainId] || 'https://etherscan.io'
  return `${baseUrl}/address/${address}`
}