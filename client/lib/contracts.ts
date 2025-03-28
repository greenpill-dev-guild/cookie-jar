import { type BaseContract, Contract, type ethers } from "ethers"
import { CONTRACT_ADDRESSES, FACTORY_ABI, COOKIE_JAR_ABI } from "./contract-config"

// Type definitions for our contracts
export interface CookieJarFactoryContract extends BaseContract {
  createCookieJar(
    name: string,
    description: string,
    maxWithdrawalAmount: bigint | string,
    cooldownPeriod: number,
    requirePurpose: boolean,
    fixedWithdrawalAmount: boolean,
    emergencyWithdrawalEnabled: boolean,
    useWhitelist: boolean,
  ): Promise<any>
  cookieJars(index: number): Promise<string>
  getCookieJarsCount(): Promise<bigint>
  isCookieJar(jarAddress: string): Promise<boolean>
  blacklistJar(jarAddress: string, isBlacklisted: boolean): Promise<any>
  blacklistOwner(ownerAddress: string, isBlacklisted: boolean): Promise<any>
  isJarBlacklisted(jarAddress: string): Promise<boolean>
  isOwnerBlacklisted(ownerAddress: string): Promise<boolean>
  blacklistedJars(jarAddress: string): Promise<boolean>
  blacklistedOwners(ownerAddress: string): Promise<boolean>
  feeCollector(): Promise<string>
}

export interface CookieJarContract extends BaseContract {
  jarConfig(): Promise<[string, string, bigint, bigint, boolean, boolean, boolean]>
  useWhitelist(): Promise<boolean>
  whitelist(user: string): Promise<boolean>
  blacklist(user: string): Promise<boolean>
  lastWithdrawalTime(user: string): Promise<bigint>
  isAdmin(user: string): Promise<boolean>
  feeCollector(): Promise<string>
  isEligibleToWithdraw(user: string): Promise<boolean>
  getBalance(token: string): Promise<bigint>
  getWithdrawalHistoryLength(): Promise<bigint>
  withdrawalHistory(index: number): Promise<[string, bigint, string, bigint]>
  nftGates(index: number): Promise<[string, bigint, boolean, bigint]>
  getNFTGatesLength(): Promise<bigint>

  // Write functions
  depositETH(): Promise<any>
  depositERC20(token: string, amount: bigint): Promise<any>
  withdrawETH(amount: bigint, purpose: string): Promise<any>
  withdrawERC20(token: string, amount: bigint, purpose: string): Promise<any>
  emergencyWithdraw(token: string): Promise<any>
  addToWhitelist(user: string): Promise<any>
  removeFromWhitelist(user: string): Promise<any>
  addToBlacklist(user: string): Promise<any>
  removeFromBlacklist(user: string): Promise<any>
  addNFTGate(nftAddress: string, tokenId: bigint, isERC1155: boolean, minBalance: bigint): Promise<any>
  removeNFTGate(index: number): Promise<any>
  setAdmin(admin: string, status: boolean): Promise<any>
  setFeeCollector(newFeeCollector: string): Promise<any>
  updateJarConfig(
    name: string,
    description: string,
    maxWithdrawalAmount: bigint,
    cooldownPeriod: bigint,
    requirePurpose: boolean,
    fixedWithdrawalAmount: boolean,
    emergencyWithdrawalEnabled: boolean,
  ): Promise<any>
}

export interface ERC20Contract extends BaseContract {
  name(): Promise<string>
  symbol(): Promise<string>
  decimals(): Promise<number>
  balanceOf(owner: string): Promise<bigint>
  allowance(owner: string, spender: string): Promise<bigint>
  approve(spender: string, value: bigint): Promise<any>
  transfer(to: string, value: bigint): Promise<any>
  transferFrom(from: string, to: string, value: bigint): Promise<any>
}

// Network configurations with contract addresses
export const networks = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/",
    blockExplorer: "https://sepolia.etherscan.io",
    factoryAddress: CONTRACT_ADDRESSES.FACTORY,
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    factoryAddress: "", // To be added when deployed to Base
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  optimism: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    blockExplorer: "https://optimistic.etherscan.io",
    factoryAddress: "", // To be added when deployed to Optimism
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  gnosis: {
    chainId: 100,
    name: "Gnosis Chain",
    rpcUrl: "https://rpc.gnosischain.com",
    blockExplorer: "https://gnosisscan.io",
    factoryAddress: "", // To be added when deployed to Gnosis
    nativeCurrency: {
      name: "xDai",
      symbol: "xDAI",
      decimals: 18,
    },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    factoryAddress: "", // To be added when deployed to Arbitrum
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
}

// Helper function to get network by chain ID
export function getNetworkByChainId(chainId: number) {
  const network = Object.values(networks).find((network) => network.chainId === chainId)
  return network
}

// Update the helper functions to use the real contracts
export function getFactoryContract(provider: ethers.Provider, networkKey: string): CookieJarFactoryContract {
  const network = networks[networkKey as keyof typeof networks]
  if (!network) throw new Error(`Network ${networkKey} not supported`)

  return new Contract(network.factoryAddress, FACTORY_ABI, provider) as unknown as CookieJarFactoryContract
}

// Similarly modify the getJarContract function
export function getJarContract(provider: ethers.Provider, jarAddress: string): CookieJarContract {
  return new Contract(jarAddress, COOKIE_JAR_ABI, provider) as unknown as CookieJarContract
}

export function getERC20Contract(provider: ethers.Provider, tokenAddress: string): ERC20Contract {
  return new Contract(
    tokenAddress,
    [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address owner) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(spender: string, value: bigint) returns (bool)",
      "function transfer(address to, uint256 value) returns (bool)",
      "function transferFrom(address from, address to, uint256 value) returns (bool)",
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
    ],
    provider,
  ) as unknown as ERC20Contract
}

