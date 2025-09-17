import {
  mainnet,
  base,
  optimism,
  arbitrum,
  gnosis,
  sepolia,
  baseSepolia,
  celo,
  optimismSepolia,
  celoAlfajores
} from 'wagmi/chains'

// V2 Contract Chains - Add chain IDs here as v2 contracts get deployed  
export const V2_CHAINS = [
  31337, // Anvil local
  // Add new chain IDs here as v2 contracts are deployed
  // Example: 8453, // Base
  // Example: 10,   // Optimism  
] as const

// Helper function to check if a chain uses v2 contracts
export function isV2Chain(chainId: number): boolean {
  return V2_CHAINS.includes(chainId as any)
}

// Local Anvil chain (Ethereum fork with multicall3 support)
export const anvilLocal = {
  id: 31337,
  name: "Anvil Local",
  network: "anvil-local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Local", url: "http://127.0.0.1:8545" },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 14353601,
    },
  },
  testnet: true,
} as const
import { Chain } from '@rainbow-me/rainbowkit'
import { createConfig, http, fallback } from 'wagmi'
import { Address } from 'viem'
import { walletConnect, injected } from 'wagmi/connectors'

// For RainbowKit provider (include local only in dev)
const chains = [
  base,
  celo,
  gnosis,
  optimism,
  baseSepolia,
  optimismSepolia,
  // celoAlfajores,
  // Mainnets
  // mainnet,
];

// Add local development chain in dev mode
export const supportedChains = (
  process.env.NODE_ENV === 'development' 
    ? [anvilLocal, ...chains]
    : chains
) as readonly [Chain, ...Chain[]]

interface ContractAddresses {
  cookieJarFactory: Record<number, Address>
}

// Chain-specific native currency configuration
export interface NativeCurrency {
  symbol: string
  name: string
  decimals: number
  address: Address // Special address to represent native currency
}

export const nativeCurrencies: Record<number, NativeCurrency> = {
  [mainnet.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [base.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [optimism.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [arbitrum.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [gnosis.id]: {
    symbol: "xDAI",
    name: "xDAI",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [baseSepolia.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [sepolia.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [optimismSepolia.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [celoAlfajores.id]: {
    symbol: "CELO",
    name: "Celo",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [celo.id]: {
    symbol: "CELO",
    name: "Celo",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [anvilLocal.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
}

export function getNativeCurrency(chainId: number): NativeCurrency {
  return nativeCurrencies[chainId] || nativeCurrencies[mainnet.id]
}

// Default addresses for deployments (fallback)
export const contractAddresses: ContractAddresses = {
  cookieJarFactory: {
    [gnosis.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [base.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [optimism.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [celo.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [baseSepolia.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [optimismSepolia.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [mainnet.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
    [anvilLocal.id]: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as Address, // Static fallback for local development
  },
}

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ""
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID || ""

// Helper function to create fallback transports with automatic failover
function createFallbackTransport(primary: string[], fallbackUrls: string[]) {
  const transports: ReturnType<typeof http>[] = []
  
  // Add primary transports
  primary.forEach(url => {
    if (url) transports.push(http(url))
  })
  
  // Add fallback transports
  fallbackUrls.forEach(url => {
    if (url) transports.push(http(url))
  })
  
  // If no transports were added, throw error (should not happen)
  if (transports.length === 0) {
    throw new Error('No RPC URLs provided for transport')
  }
  return fallback(transports)
}

// Client-side only connectors to avoid SSR issues
function getConnectors() {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    // Server-side: only return injected connector without WalletConnect
    return [
      injected({
        shimDisconnect: true,
      }),
    ]
  }
  
  // Client-side: return all connectors including WalletConnect
  const connectors: any[] = [
    injected({
      shimDisconnect: true,
    }),
  ]
  
  // Only add WalletConnect if projectId is available
  if (projectId) {
    connectors.push(walletConnect({ 
      projectId,
      metadata: {
        name: 'Cookie Jar',
        description: 'Decentralized funding jars with flexible access controls',
        url: 'https://cookiejar.greenpill.network',
        icons: ['https://cookiejar.greenpill.network/logo.png']
      }
    }))
  }
  
  return connectors
}

// Export the Wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  ssr: true,
  multiInjectedProviderDiscovery: true,
  connectors: getConnectors(),
  transports: {
    // Base Mainnet - POKT not available, use Alchemy as secondary
    [base.id]: createFallbackTransport(
      [
        `https://base-mainnet.g.alchemy.com/v2/${alchemyId}`
      ],
      [
        'https://mainnet.base.org',
        'https://base.blockpi.network/v1/rpc/public',
        'https://1rpc.io/base'
      ]
    ),
    // Optimism Mainnet
    [optimism.id]: createFallbackTransport(
      [
        'https://op-pokt.nodies.app',
        `https://opt-mainnet.g.alchemy.com/v2/${alchemyId}`
      ],
      [
        'https://mainnet.optimism.io',
        'https://optimism.blockpi.network/v1/rpc/public',
        'https://1rpc.io/op'
      ]
    ),
    // Arbitrum Mainnet
    [arbitrum.id]: createFallbackTransport(
      [
        'https://arb-pokt.nodies.app',
        `https://arb-mainnet.g.alchemy.com/v2/${alchemyId}`
      ],
      [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum.blockpi.network/v1/rpc/public',
        'https://1rpc.io/arb'
      ]
    ),
    // Gnosis Chain
    [gnosis.id]: createFallbackTransport(
      [
        'https://gnosis-pokt.nodies.app'
      ],
      [
        'https://rpc.gnosischain.com',
        'https://gnosis.blockpi.network/v1/rpc/public',
        'https://1rpc.io/gnosis'
      ]
    ),
    // Base Sepolia Testnet - POKT not available, keep as is
    [baseSepolia.id]: createFallbackTransport(
      [
        'https://sepolia.base.org'
      ],
      [
        'https://base-sepolia.blockpi.network/v1/rpc/public',
        'https://1rpc.io/base-sepolia'
      ]
    ),
    // Sepolia Testnet - POKT not available, use Alchemy as secondary
    [sepolia.id]: createFallbackTransport(
      [
        `https://eth-sepolia.g.alchemy.com/v2/${alchemyId}`
      ],
      [
        'https://rpc.sepolia.org',
        'https://sepolia.blockpi.network/v1/rpc/public',
        'https://1rpc.io/eth-sepolia'
      ]
    ),
    // Mainnet (Ethereum)
    [mainnet.id]: createFallbackTransport(
      [
        'https://eth-pokt.nodies.app',
        `https://eth-mainnet.g.alchemy.com/v2/${alchemyId}`
      ],
      [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.blockpi.network/v1/rpc/public'
      ]
    ),
    // Optimism Sepolia Testnet
    [optimismSepolia.id]: createFallbackTransport(
      [
        'https://op-sepolia-pokt.nodies.app',
        'https://opt-sepolia.g.alchemy.com/v2/${alchemyId}'
      ],
      [
        'https://optimism-sepolia.blockpi.network/v1/rpc/public',
        'https://1rpc.io/op-sepolia'
      ]
    ),
    // Celo Alfajores Testnet - POKT not available, keep as is
    [celoAlfajores.id]: createFallbackTransport(
      [
        'https://alfajores-forno.celo-testnet.org'
      ],
      [
        'https://celo-alfajores.blockpi.network/v1/rpc/public'
      ]
    ),
    // Celo Mainnet - POKT not available, keep as is
    [celo.id]: createFallbackTransport(
      [
        'https://forno.celo.org'
      ],
      [
        'https://celo.blockpi.network/v1/rpc/public',
        'https://1rpc.io/celo'
      ]
    ),
    // Local Anvil network (only in development)
    ...(process.env.NODE_ENV === 'development' ? {
      [anvilLocal.id]: http('http://127.0.0.1:8545')
    } : {} as Record<number, never>),
  },
})


// Register the config type globally for TypeScript inference
declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}