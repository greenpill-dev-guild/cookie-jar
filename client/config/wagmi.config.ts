import { defineConfig } from '@wagmi/cli'
import { foundry, react } from '@wagmi/cli/plugins'
import { erc20Abi } from 'viem'
import {
  sepolia,
  baseSepolia,
  optimismSepolia,
  celoAlfajores
} from 'viem/chains'

// Load local deployment if exists
let localDeployment: any = {};
try {
  localDeployment = require('./contracts/local-deployment.json');
} catch (e) {
  // Local deployment not found, using testnet only
}

const contractAddresses = {
  cookieJarFactory: {
    [sepolia.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f" as `0x${string}`,
    [baseSepolia.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f" as `0x${string}`,
    [optimismSepolia.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f" as `0x${string}`,
    [celoAlfajores.id]: "0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f" as `0x${string}`,
    // Local development
    31337: localDeployment.CookieJarFactory as `0x${string}`
  }
}

export default defineConfig({
  out: 'generated.ts',
  // Add ERC20 to the root level contracts array
  contracts: [
    {
      name: 'erc20',
      abi: erc20Abi,
    }
  ],
  plugins: [
    foundry({
      project: '../contracts',
      include: [
        'CookieJar.sol/*.json', 
        'CookieJarFactory.sol/*.json',
        'CookieJarRegistry.sol/*.json'
      ],
      deployments: {
        cookieJarFactory: contractAddresses.cookieJarFactory,
      }
    }),
    react(),
  ],
})