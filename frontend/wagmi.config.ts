import { defineConfig } from '@wagmi/cli'
import { foundry, react } from '@wagmi/cli/plugins'
import { erc20Abi } from 'wagmi'
import {
  sepolia,
  baseSepolia,
  optimismSepolia,
  celoAlfajores
} from 'wagmi/chains'

// Define contract addresses per network
const contractAddresses = {
  cookieJarFactory: {
    [sepolia.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f",
    [baseSepolia.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f",
    [optimismSepolia.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f",
    [celoAlfajores.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f"
  },
  cookieJarRegistry: {
    [sepolia.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356",
    [baseSepolia.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356",
    [optimismSepolia.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356",
    [celoAlfajores.id]: "0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356"
  }
}

export default defineConfig({
  out: 'generated.ts',
  plugins: [
    foundry({
      project: '../contracts/src',
      include: [
        'CookieJar.sol/*.sol', 
        'CookieJarFactory.sol/*.sol',
        'CookieJarRegistry.sol/*.sol'
      ],
    }),
    react({
      useContractRead: true,
      useContractWrite: true,
      useContractEvent: true,
      useContractFunctionRead: {
        enabled: true,
      },
      useContractFunctionWrite: {
        enabled: true,
      },
      // Include all contracts here
      contracts: [
        {
          name: 'erc20',
          abi: erc20Abi,
        },
        {
          name: 'cookieJarFactory',
          address: contractAddresses.cookieJarFactory,
        },
        {
          name: 'cookieJarRegistry',
          address: contractAddresses.cookieJarRegistry,
        }
      ],
    }),
  ],
})