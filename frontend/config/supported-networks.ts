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

// Local Anvil chain (Celo fork)
export const anvilLocal = {
  id: 31337,
  name: "Anvil Local",
  network: "anvil-local",
  nativeCurrency: {
    decimals: 18,
    name: "Celo",
    symbol: "CELO",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Local", url: "http://127.0.0.1:8545" },
  },
  testnet: true,
} as const
import { Chain, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { createConfig, http, fallback } from 'wagmi'
import { Address } from 'viem'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

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
export const supportedChains: readonly [Chain, ...Chain[]] = 
  process.env.NODE_ENV === 'development' 
    ? [anvilLocal as Chain, ...chains]
    : chains

interface ContractAddresses {
  cookieJarFactory: Record<number, Address>
  cookieJarRegistry: Record<number, Address>
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
    symbol: "XDAI",
    name: "xDai",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [celo.id]: {
    symbol: "CELO",
    name: "Celo",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [sepolia.id]: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  },
  [baseSepolia.id]: {
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
  // Local Anvil (Celo fork)
  31337: {
    symbol: "CELO",
    name: "Celo",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  }
}

// Helper function to get native currency for a chain
export function getNativeCurrency(chainId: number): NativeCurrency {
  return nativeCurrencies[chainId] || {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000003"
  }
}

// Load local deployment if exists  
let localDeployment: { CookieJarFactory?: Address } = {};
try {
  if (typeof window === 'undefined') {
    // Server-side: try to load from file
    const fs = require('fs');
    const path = require('path');
    const deploymentPath = path.join(process.cwd(), 'contracts', 'local-deployment.json');
    if (fs.existsSync(deploymentPath)) {
      localDeployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
    }
  }
} catch (error) {
  // Local deployment not found, using testnet contracts
}

// Define the contract addresses for supported networks
export const contractAddresses: ContractAddresses = {
  cookieJarFactory: {
    [gnosis.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    [base.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    [optimism.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    [celo.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    [baseSepolia.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    [optimismSepolia.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    [mainnet.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
    // Local development
    31337: localDeployment.CookieJarFactory || "0x0000000000000000000000000000000000000000"
  },
  cookieJarRegistry: {}
}

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ""
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID || ""

// Helper function to create fallback transports with automatic failover
const createFallbackTransport = (primaryUrls: string[], fallbackUrls: string[]) => {
  const transports: ReturnType<typeof http>[] = []
  // Add all primary transports
  primaryUrls.forEach(url => transports.push(http(url)))
  // Add all fallback transports
  fallbackUrls.forEach(url => transports.push(http(url)))
  // If no transports were added, throw error (should not happen)
  if (transports.length === 0) {
    throw new Error('No RPC URLs provided for transport')
  }
  return fallback(transports)
}

// Export the Wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  ssr: true,
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({ projectId }),
  ],
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
    // Local Anvil network
    ...(process.env.NODE_ENV === 'development' ? {
      31337: http('http://127.0.0.1:8545')
    } : {}),
  },
})


// Register the config type globally for TypeScript inference
declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}