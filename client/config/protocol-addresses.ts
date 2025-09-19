/**
 * Protocol Addresses Configuration
 * 
 * Network-specific addresses for external protocols used in Cookie Jar access control.
 * This allows for proper testing, development, and multi-chain support.
 */

export interface ProtocolAddresses {
  poap: string
  hats: string
  // Add more protocols as they become available on different networks
  unlock?: string
  hypercerts?: string
}

export const PROTOCOL_ADDRESSES: Record<number, ProtocolAddresses> = {
  // Ethereum Mainnet
  1: {
    poap: '0x22C1f6050E56d2876009903609a2cC3fEf83B415', // Official POAP contract
    hats: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Official Hats Protocol
  },

  // Base Mainnet  
  8453: {
    poap: '0x22C1f6050E56d2876009903609a2cC3fEf83B415', // POAP is same across networks
    hats: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Hats deployment on Base
  },

  // Optimism
  10: {
    poap: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
    hats: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
  },

  // Gnosis Chain
  100: {
    poap: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
    hats: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
  },

  // Arbitrum
  42161: {
    poap: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
    hats: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
  },

  // Base Sepolia (Testnet)
  84532: {
    poap: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
    hats: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
  },

  // Local development (Anvil)
  31337: {
    poap: '0x0000000000000000000000000000000000000001', // Mock address for testing
    hats: '0x0000000000000000000000000000000000000002', // Mock address for testing
  },

  // Hardhat local
  1337: {
    poap: '0x0000000000000000000000000000000000000001',
    hats: '0x0000000000000000000000000000000000000002',
  }
}

/**
 * Get protocol addresses for a specific network
 */
export function getProtocolAddresses(chainId: number): ProtocolAddresses {
  const addresses = PROTOCOL_ADDRESSES[chainId]
  
  if (!addresses) {
    console.warn(`Protocol addresses not configured for chain ID: ${chainId}. Using Ethereum mainnet defaults.`)
    return PROTOCOL_ADDRESSES[1] // Fallback to mainnet
  }
  
  return addresses
}

/**
 * Check if a protocol is supported on a specific network
 */
export function isProtocolSupported(chainId: number, protocol: keyof ProtocolAddresses): boolean {
  const addresses = getProtocolAddresses(chainId)
  return !!addresses[protocol]
}

/**
 * Get a specific protocol address for a network
 */
export function getProtocolAddress(chainId: number, protocol: keyof ProtocolAddresses): string {
  const addresses = getProtocolAddresses(chainId)
  const address = addresses[protocol]
  
  if (!address) {
    throw new Error(`${protocol} not supported on chain ID: ${chainId}`)
  }
  
  return address
}
