import {
  mainnet,
  base,
  optimism,
  arbitrum, 
  gnosis,
  sepolia,
  baseSepolia,
  optimismSepolia,
  celoAlfajores
} from 'wagmi/chains'
import { Chain, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { Address } from 'viem'

// For RainbowKit provider
export const supportedChains: readonly [Chain, ...Chain[]] = [
  // Testnets
  sepolia,
  baseSepolia, 
  optimismSepolia,
  celoAlfajores,
  // Mainnets
  // mainnet,
  // base,
  optimism,
  // arbitrum,
  // gnosis
]

interface ContractAddresses {
  cookieJarFactory:Record<number, Address>
  cookieJarRegistry:Record<number, Address>
}

// Define the contract addresses for supported networks
export const contractAddresses: ContractAddresses = {
  cookieJarFactory: {
    [sepolia.id]: "0x8339F06023625F903dc7e8c258aCF3E02d14A3CC",
    [baseSepolia.id]: "0x64e50110A562539d12cEc047f4b7Ded24D1174d2" ,
    [optimismSepolia.id]: "0xca424e55D7Bf40442397a33790B18665FFb961c3",
    [celoAlfajores.id]: "0x8339F06023625F903dc7e8c258aCF3E02d14A3CC",
    [optimism.id]: "0x8339F06023625F903dc7e8c258aCF3E02d14A3CC"
  },
  cookieJarRegistry: {
    [sepolia.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356" ,
    [baseSepolia.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356",
    [optimismSepolia.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356",
    [celoAlfajores.id]: "0x8FF4E393D983fb2EEdCfcFcB55a0aaB9250d0AE6",
  }
}
// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ""
const infuraId = process.env.NEXT_PUBLIC_INFURA_ID || ""

// Export the Wagmi config
export const wagmiConfig = getDefaultConfig({
  appName: "Cookie Jar V3",
  projectId,
  chains: supportedChains,
  ssr: true,
  transports: {
    [base.id]: http(`https://base-mainnet.infura.io/v3/${infuraId}`),
    [optimism.id]: http(`https://optimism-mainnet.infura.io/v3/${infuraId}`),
    [arbitrum.id]: http(`https://arbitrum-mainnet.infura.io/v3/${infuraId}`),
    [gnosis.id]: http(`https://gnosis-mainnet.infura.io/v3/${infuraId}`),
    [baseSepolia.id]: http(`https://sepolia.base.org`),
    [sepolia.id]: http(`https://sepolia.infura.io/v3/${infuraId}`),
    [mainnet.id]: http(`https://mainnet.infura.io/v3/${infuraId}`),
    [optimismSepolia.id]: http(`https://sepolia.optimism.io`),
    [celoAlfajores.id]: http(`https://alfajores-forno.celo-testnet.org`),
  },
})

