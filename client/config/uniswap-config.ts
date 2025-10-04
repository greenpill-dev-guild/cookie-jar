/**
 * Unified Uniswap Configuration for Cookie Jar Frontend
 *
 * This module provides a unified configuration for Uniswap integration using the
 * Universal Router, which automatically handles v2, v3, and v4 routing.
 * No more version-specific configuration needed!
 */

import type { Address } from 'viem';

// Official Universal Router addresses from Uniswap v4 deployments
// Source: https://docs.uniswap.org/contracts/v4/deployments
export const UNIVERSAL_ROUTER_ADDRESSES = {
  // Mainnet deployments
  1: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af' as Address, // Ethereum
  8453: '0x198d7387Fa97A73F05b8578CdEFf8F2A1f34Cd1F' as Address, // Base
  10: '0xb555edF5dcF85f42cEeF1f3630a52A108E55A654' as Address, // Optimism
  42161: '0x5E325eDA8064b456f4781070C0738d849c824258' as Address, // Arbitrum One
  137: '0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2' as Address, // Polygon
  81457: '0x334e3F7f5A9740627fA47Fa9Aa51cE0ccbD765cF' as Address, // Blast
  7777777: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Zora
  480: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Worldchain
  57073: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Ink
  1868: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Soneium
  43114: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Avalanche
  56: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // BNB Smart Chain
  130: '0xef740bf23acae26f6492b10de645d6b98dc8eaf3' as Address, // Unichain

  // Testnet deployments
  1301: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Unichain Sepolia
  11155111: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Sepolia
  84532: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Base Sepolia
  421614: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265' as Address, // Arbitrum Sepolia
  420120000: '0x4a5C956e6626c552c9e830beFDDf8F5e02bBf60a' as Address, // interop-alpha-0
  420120001: '0x4a5C956e6626c552c9e830beFDDf8F5e02bBf60a' as Address, // interop-alpha-1
} as const;

// Permit2 address (consistent across all chains)
export const PERMIT2_ADDRESS =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address;

// Wrapped native token addresses by chain
export const WRAPPED_NATIVE_ADDRESSES = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address, // WETH - Ethereum
  8453: '0x4200000000000000000000000000000000000006' as Address, // WETH - Base
  10: '0x4200000000000000000000000000000000000006' as Address, // WETH - Optimism
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address, // WETH - Arbitrum
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address, // WMATIC - Polygon
  81457: '0x4300000000000000000000000000000000000004' as Address, // WETH - Blast
  7777777: '0x4200000000000000000000000000000000000006' as Address, // WETH - Zora
  480: '0x4200000000000000000000000000000000000006' as Address, // WETH - Worldchain
  57073: '0x4200000000000000000000000000000000000006' as Address, // WETH - Ink
  1868: '0x4200000000000000000000000000000000000006' as Address, // WETH - Soneium
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' as Address, // WAVAX - Avalanche
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address, // WBNB - BSC
  130: '0x4200000000000000000000000000000000000006' as Address, // WETH - Unichain

  // Testnets
  1301: '0x4200000000000000000000000000000000000006' as Address, // WETH - Unichain Sepolia
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address, // WETH - Sepolia
  84532: '0x4200000000000000000000000000000000000006' as Address, // WETH - Base Sepolia
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73' as Address, // WETH - Arbitrum Sepolia
  420120000: '0x4200000000000000000000000000000000000006' as Address, // WETH - interop-alpha-0
  420120001: '0x4200000000000000000000000000000000000006' as Address, // WETH - interop-alpha-1
} as const;

export type SupportedChain = keyof typeof UNIVERSAL_ROUTER_ADDRESSES;

/**
 * Universal fee tiers (work across v2, v3, v4)
 */
export const FEE_TIERS = {
  LOWEST: 100, // 0.01%
  LOW: 500, // 0.05%
  MEDIUM: 3000, // 0.30% - Most common
  HIGH: 10000, // 1.00%
} as const;

/**
 * Simplified multi-token configuration for Cookie Jar
 * Universal Router handles all routing automatically
 */
export interface UniversalMultiTokenConfig {
  enabled: boolean; // Enable multi-token support
  maxSlippagePercent: number; // Slippage tolerance (e.g., 500 = 5%)
  minSwapAmount: bigint; // Minimum swap amount
  defaultFee: number; // Default fee tier (3000 = 0.3%)
  autoSwapETH: boolean; // Auto-swap received ETH
}

/**
 * Chain capabilities with Universal Router
 */
export interface ChainCapabilities {
  hasUniversalRouter: boolean; // Universal Router available
  hasNativeETHSupport: boolean; // Native ETH support
  hasAdvancedRouting: boolean; // Advanced multi-hop routing
  hasGasOptimization: boolean; // Gas-optimized routing
  supportedVersions: string[]; // Supported Uniswap versions
}

/**
 * Check if Universal Router is available on a given chain
 */
export function isUniversalRouterAvailable(
  chainId: number
): chainId is SupportedChain {
  return chainId in UNIVERSAL_ROUTER_ADDRESSES;
}

/**
 * Get Universal Router address for a given chain
 */
export function getUniversalRouter(chainId: number): Address | null {
  if (!isUniversalRouterAvailable(chainId)) {
    return null;
  }
  return UNIVERSAL_ROUTER_ADDRESSES[chainId];
}

/**
 * Get wrapped native token address for a given chain
 */
export function getWrappedNative(chainId: number): Address | null {
  return (
    WRAPPED_NATIVE_ADDRESSES[
      chainId as keyof typeof WRAPPED_NATIVE_ADDRESSES
    ] || null
  );
}

/**
 * Get default multi-token configuration for Universal Router
 */
export function getDefaultMultiTokenConfig(
  chainId: number
): UniversalMultiTokenConfig {
  return {
    enabled: isUniversalRouterAvailable(chainId), // Enable if Universal Router available
    maxSlippagePercent: 500, // 5% default
    minSwapAmount: BigInt(0), // No minimum
    defaultFee: FEE_TIERS.MEDIUM, // 0.3% default
    autoSwapETH: false, // Disabled by default
  };
}

/**
 * Get capabilities for a given chain with Universal Router
 */
export function getChainCapabilities(chainId: number): ChainCapabilities {
  const hasUniversalRouter = isUniversalRouterAvailable(chainId);

  return {
    hasUniversalRouter,
    hasNativeETHSupport: hasUniversalRouter, // Universal Router supports native ETH
    hasAdvancedRouting: hasUniversalRouter, // Advanced multi-version routing
    hasGasOptimization: hasUniversalRouter, // Gas-optimized batch operations
    supportedVersions: hasUniversalRouter ? ['v2', 'v3', 'v4'] : [], // Universal Router supports all versions
  };
}

/**
 * Get recommended fee tier for token pair (simplified)
 */
export function getRecommendedFeeTier(
  _tokenA: Address,
  _tokenB: Address,
  isStablecoin = false
): number {
  // Use lower fees for stablecoin pairs
  if (isStablecoin) {
    return FEE_TIERS.LOW;
  }

  // Standard fee for most pairs
  return FEE_TIERS.MEDIUM;
}

/**
 * Format fee tier for display
 */
export function formatFeeTier(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}

/**
 * Check if a token pair is likely a stablecoin pair
 */
export function isLikelyStablePair(tokenA: Address, tokenB: Address): boolean {
  // Simplified check - in production you might want more sophisticated detection
  const stablecoins = [
    '0xA0b86a33E6441146F04Bb5C6B6A8B4A4A8b8F9F6', // USDC on various chains
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI on mainnet
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on mainnet
    '0x4Fabb145d64652a948d72533023f6E7A623C7C53', // BUSD on mainnet
    // Add more stablecoin addresses as needed
  ];

  return (
    stablecoins.includes(tokenA.toLowerCase() as Address) ||
    stablecoins.includes(tokenB.toLowerCase() as Address)
  );
}

/**
 * Calculate minimum output with slippage tolerance
 */
export function calculateMinOutput(
  amountOut: bigint,
  slippagePercent: number
): bigint {
  return (amountOut * BigInt(10000 - slippagePercent)) / BigInt(10000);
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChains(): number[] {
  return Object.keys(UNIVERSAL_ROUTER_ADDRESSES).map(Number);
}

/**
 * Unified export object
 */
export default {
  ADDRESSES: {
    UNIVERSAL_ROUTER: UNIVERSAL_ROUTER_ADDRESSES,
    PERMIT2: PERMIT2_ADDRESS,
    WRAPPED_NATIVE: WRAPPED_NATIVE_ADDRESSES,
  },
  FEE_TIERS,
  isUniversalRouterAvailable,
  getUniversalRouter,
  getWrappedNative,
  getDefaultMultiTokenConfig,
  getChainCapabilities,
  getRecommendedFeeTier,
  formatFeeTier,
  isLikelyStablePair,
  calculateMinOutput,
  getSupportedChains,
};
