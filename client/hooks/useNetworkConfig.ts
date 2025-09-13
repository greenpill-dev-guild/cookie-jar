/**
 * Network Configuration Hook
 * 
 * Provides network-specific configuration for protocol integrations,
 * including addresses, API endpoints, and feature flags.
 */

import { useChainId } from 'wagmi'
import { useMemo } from 'react'
import { getProtocolAddresses, isProtocolSupported, type ProtocolAddresses } from '@/config/protocol-addresses'

interface NetworkConfig {
  /** Protocol contract addresses for current network */
  protocolAddresses: ProtocolAddresses
  
  /** API endpoints for protocol services */
  apiEndpoints: {
    poap: string
    alchemy?: string
    hypercerts?: string
  }
  
  /** Feature availability flags */
  features: {
    poapSupported: boolean
    hatsSupported: boolean
    unlockSupported: boolean
    hypercerrtsSupported: boolean
    nftValidationSupported: boolean
  }
  
  /** Network-specific settings */
  settings: {
    blockConfirmations: number
    gasMultiplier: number
    cacheTimeout: number
  }
}

/**
 * Get network-specific configuration for the current chain
 */
export function useNetworkConfig(): NetworkConfig {
  const chainId = useChainId()
  
  return useMemo((): NetworkConfig => {
    const protocolAddresses = getProtocolAddresses(chainId)
    
    // Network-specific API endpoints
    const apiEndpoints = {
      poap: 'https://api.poap.tech',
      alchemy: process.env.NEXT_PUBLIC_ALCHEMY_ID ? 
        `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}` : 
        undefined,
      hypercerts: 'https://api.hypercerts.io'
    }
    
    // Feature availability based on network
    const features = {
      poapSupported: isProtocolSupported(chainId, 'poap'),
      hatsSupported: isProtocolSupported(chainId, 'hats'),
      unlockSupported: isProtocolSupported(chainId, 'unlock'),
      hypercerrtsSupported: isProtocolSupported(chainId, 'hypercerts'),
      nftValidationSupported: chainId !== 31337 && chainId !== 1337 // Disable on local networks
    }
    
    // Network-specific settings
    const settings = getNetworkSettings(chainId)
    
    return {
      protocolAddresses,
      apiEndpoints,
      features,
      settings
    }
  }, [chainId])
}

/**
 * Get network-specific settings based on chain characteristics
 */
function getNetworkSettings(chainId: number): NetworkConfig['settings'] {
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
 * Check if a specific protocol is available on the current network
 */
export function useProtocolSupport(protocol: keyof ProtocolAddresses): boolean {
  const chainId = useChainId()
  return isProtocolSupported(chainId, protocol)
}

/**
 * Get a specific protocol address for the current network
 */
export function useProtocolAddress(protocol: keyof ProtocolAddresses): string | undefined {
  const chainId = useChainId()
  try {
    return getProtocolAddresses(chainId)[protocol]
  } catch {
    return undefined
  }
}
