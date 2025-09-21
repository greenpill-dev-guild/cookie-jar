/**
 * NFT Provider Configuration
 * Centralizes API keys and provider settings for NFT data fetching
 */

export interface NFTProviderConfig {
  // Alchemy configuration
  alchemy: {
    mainnet?: string
    base?: string
    sepolia?: string
    baseSepolia?: string
    fallback?: string
  }
  
  // Alternative providers
  moralis?: string
  opensea?: string
  reservoir?: string
  
  // IPFS and metadata
  ipfs: {
    gateway: string
    pinataJwt?: string
  }
  
  // Performance and security settings
  settings: {
    debugMode: boolean
    useMockData: boolean
    cacheDuration: number
    maxNftsPerCollection: number
    apiRateLimit: number
    fetchTimeout: number
    maxConcurrentValidations: number
    enableAnalytics: boolean
  }
}

/**
 * Get NFT provider configuration from environment variables
 */
export function getNFTProviderConfig(): NFTProviderConfig {
  const config: NFTProviderConfig = {
    alchemy: {
      mainnet: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_MAINNET,
      base: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BASE,
      sepolia: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_SEPOLIA,
      baseSepolia: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BASE_SEPOLIA,
      fallback: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
    },
    
    moralis: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
    opensea: process.env.NEXT_PUBLIC_OPENSEA_API_KEY,
    reservoir: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY,
    
    ipfs: {
      gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
      pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT
    },
    
    settings: {
      debugMode: process.env.NEXT_PUBLIC_DEBUG_NFT_VALIDATION === 'true',
      useMockData: process.env.NEXT_PUBLIC_USE_MOCK_NFT_DATA === 'true',
      cacheDuration: parseInt(process.env.NEXT_PUBLIC_NFT_CACHE_DURATION || '60'),
      maxNftsPerCollection: parseInt(process.env.NEXT_PUBLIC_MAX_NFTS_PER_COLLECTION || '1000'),
      apiRateLimit: parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT || '60'),
      fetchTimeout: parseInt(process.env.NEXT_PUBLIC_NFT_FETCH_TIMEOUT || '10000'),
      maxConcurrentValidations: parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_VALIDATIONS || '5'),
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_NFT_ANALYTICS !== 'false'
    }
  }
  
  return config
}

/**
 * Get the best available Alchemy API key for a given network
 */
export function getAlchemyApiKey(network: 'mainnet' | 'base' | 'sepolia' | 'base-sepolia'): string {
  const config = getNFTProviderConfig()
  
  // Try network-specific key first
  const networkKey = {
    'mainnet': config.alchemy.mainnet,
    'base': config.alchemy.base,
    'sepolia': config.alchemy.sepolia,
    'base-sepolia': config.alchemy.baseSepolia
  }[network]
  
  if (networkKey) return networkKey
  
  // Fall back to general key
  if (config.alchemy.fallback) return config.alchemy.fallback
  
  // Development warning
  if (process.env.NODE_ENV === 'development') {
    console.warn(`No Alchemy API key found for network: ${network}. Some NFT features may not work.`)
  }
  
  return ''
}

/**
 * Validate that required environment variables are set
 */
export function validateNFTProviderConfig(): {
  isValid: boolean
  missingKeys: string[]
  warnings: string[]
} {
  const config = getNFTProviderConfig()
  const missingKeys: string[] = []
  const warnings: string[] = []
  
  // Check for at least one Alchemy key
  const hasAlchemyKey = !!(
    config.alchemy.mainnet ||
    config.alchemy.base ||
    config.alchemy.sepolia ||
    config.alchemy.baseSepolia ||
    config.alchemy.fallback
  )
  
  if (!hasAlchemyKey) {
    missingKeys.push('NEXT_PUBLIC_ALCHEMY_API_KEY (or network-specific keys)')
  }
  
  // Optional but recommended
  if (!config.opensea) {
    warnings.push('NEXT_PUBLIC_OPENSEA_API_KEY not set - collection verification may be limited')
  }
  
  if (!config.ipfs.pinataJwt) {
    warnings.push('NEXT_PUBLIC_PINATA_JWT not set - IPFS uploads disabled')
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    warnings
  }
}

/**
 * Development helper to check configuration on app start
 */
if (process.env.NODE_ENV === 'development') {
  const validation = validateNFTProviderConfig()
  
  if (!validation.isValid) {
    console.warn('❌ NFT Provider Configuration Issues:')
    validation.missingKeys.forEach(key => console.warn(`  Missing: ${key}`))
  }
  
  if (validation.warnings.length > 0) {
    console.info('⚠️ NFT Provider Configuration Warnings:')
    validation.warnings.forEach(warning => console.info(`  ${warning}`))
  }
  
  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ NFT Provider Configuration: All good!')
  }
}
