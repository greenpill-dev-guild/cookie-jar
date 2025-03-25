import { type BaseContract, Contract, type ethers } from "ethers"

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

// Cookie Jar Factory ABI
export const CookieJarFactoryABI = [
  "function createCookieJar(string name, string description, uint256 maxWithdrawalAmount, uint256 cooldownPeriod, bool requirePurpose, bool fixedWithdrawalAmount, bool emergencyWithdrawalEnabled, bool useWhitelist) external returns (address)",
  "function cookieJars(uint256 index) external view returns (address)",
  "function getCookieJarsCount() external view returns (uint256)",
  "function isCookieJar(address jarAddress) external view returns (bool)",
  "function blacklistJar(address jarAddress, bool isBlacklisted) external",
  "function blacklistOwner(address ownerAddress, bool isBlacklisted) external",
  "function isJarBlacklisted(address jarAddress) external view returns (bool)",
  "function isOwnerBlacklisted(address ownerAddress) external view returns (bool)",
  "function blacklistedJars(address jarAddress) external view returns (bool)",
  "function blacklistedOwners(address ownerAddress) external view returns (bool)",
  "function feeCollector() external view returns (address)",
  "event CookieJarCreated(address indexed jarAddress, address indexed creator, string name, string description)",
  "event JarBlacklistUpdated(address indexed jarAddress, bool isBlacklisted)",
  "event OwnerBlacklistUpdated(address indexed ownerAddress, bool isBlacklisted)",
  "event FeeCollectorUpdated(address indexed newFeeCollector)",
]

// Cookie Jar ABI
export const CookieJarABI = [
  // Read functions
  "function jarConfig() external view returns (string name, string description, uint256 maxWithdrawalAmount, uint256 cooldownPeriod, bool requirePurpose, bool fixedWithdrawalAmount, bool emergencyWithdrawalEnabled)",
  "function useWhitelist() external view returns (bool)",
  "function whitelist(address user) external view returns (bool)",
  "function blacklist(address user) external view returns (bool)",
  "function lastWithdrawalTime(address user) external view returns (uint256)",
  "function isAdmin(address user) external view returns (bool)",
  "function feeCollector() external view returns (address)",
  "function isEligibleToWithdraw(address user) external view returns (bool)",
  "function getBalance(address token) external view returns (uint256)",
  "function getWithdrawalHistoryLength() external view returns (uint256)",
  "function withdrawalHistory(uint256 index) external view returns (address user, uint256 amount, string purpose, uint256 timestamp)",
  "function nftGates(uint256 index) external view returns (address nftAddress, uint256 tokenId, bool isERC1155, uint256 minBalance)",
  "function getNFTGatesLength() external view returns (uint256)",

  // Write functions
  "function depositETH() external payable",
  "function depositERC20(address token, uint256 amount) external",
  "function withdrawETH(uint256 amount, string calldata purpose) external",
  "function withdrawERC20(address token, uint256 amount, string calldata purpose) external",
  "function emergencyWithdraw(address token) external",
  "function addToWhitelist(address user) external",
  "function removeFromWhitelist(address user) external",
  "function addToBlacklist(address user) external",
  "function removeFromBlacklist(address user) external",
  "function addNFTGate(address nftAddress, uint256 tokenId, bool isERC1155, uint256 minBalance) external",
  "function removeNFTGate(uint256 index) external",
  "function setAdmin(address admin, bool status) external",
  "function setFeeCollector(address newFeeCollector) external",
  "function updateJarConfig(string memory _name, string memory _description, uint256 _maxWithdrawalAmount, uint256 _cooldownPeriod, bool _requirePurpose, bool _fixedWithdrawalAmount, bool _emergencyWithdrawalEnabled) external",

  // Events
  "event Deposit(address indexed sender, address indexed token, uint256 amount)",
  "event Withdrawal(address indexed user, address indexed token, uint256 amount, string purpose)",
  "event WhitelistUpdated(address indexed user, bool isWhitelisted)",
  "event BlacklistUpdated(address indexed user, bool isBlacklisted)",
  "event NFTGateAdded(address indexed nftAddress, uint256 tokenId, bool isERC1155, uint256 minBalance)",
  "event NFTGateRemoved(uint256 indexed gateIndex)",
  "event AdminUpdated(address indexed admin, bool isAdmin)",
  "event FeeCollectorUpdated(address indexed newFeeCollector)",
  "event JarConfigUpdated()",
  "event EmergencyWithdrawal(address indexed admin, address indexed token, uint256 amount)",
]

// ERC20 ABI (minimal for what we need)
export const ERC20ABI = [
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
]

// Network configurations with contract addresses
export const networks = {
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    factoryAddress: "0x1234567890123456789012345678901234567890", // Replace with actual address
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
    factoryAddress: "0x2345678901234567890123456789012345678901", // Replace with actual address
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
    factoryAddress: "0x3456789012345678901234567890123456789012", // Replace with actual address
    nativeCurrency: {
      name: "xDai",
      symbol: "xDAI",
      decimals: 18,
    },
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    factoryAddress: "0x4567890123456789012345678901234567890123", // Replace with actual address
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    factoryAddress: "0x5678901234567890123456789012345678901234", // Replace with actual address
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

// Update the helper functions to use the typed interfaces
export function getFactoryContract(provider: ethers.Provider, networkKey: string): CookieJarFactoryContract {
  const network = networks[networkKey as keyof typeof networks]
  if (!network) throw new Error(`Network ${networkKey} not supported`)

  return new Contract(network.factoryAddress, CookieJarFactoryABI, provider) as unknown as CookieJarFactoryContract
}

export function getJarContract(provider: ethers.Provider, jarAddress: string): CookieJarContract {
  return new Contract(jarAddress, CookieJarABI, provider) as unknown as CookieJarContract
}

export function getERC20Contract(provider: ethers.Provider, tokenAddress: string): ERC20Contract {
  return new Contract(tokenAddress, ERC20ABI, provider) as unknown as ERC20Contract
}

