import { formatEther, formatUnits } from "viem";

import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";
import type { CookieJarInfo } from "@/hooks/jar/useJarFactory";
import type { NativeCurrency } from "@/config/supported-networks";

/**
 * Utility functions for jar data formatting and processing
 */

export type JarData = CookieJarInfo;

/**
 * Get formatted currency amount from jar data
 * 
 * @param jar - The jar data containing currency information
 * @param tokenDecimals - Optional mapping of token addresses to their decimal counts
 * @returns Formatted currency amount string
 */
export function getCurrencyAmount(jar: JarData, tokenDecimals?: Record<string, number>) {
  const amount = jar.currencyHeldByJar || BigInt(0);
  
  // Handle cases where currency might be undefined
  if (!jar.currency) {
    return "0";
  }
  
  if (jar.currency.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    return formatEther(amount);
  } else {
    // Use actual token decimals if available, otherwise default to 18
    const decimals = tokenDecimals?.[jar.currency.toLowerCase()] ?? 18;
    return formatUnits(amount, decimals);
  }
}

/**
 * Get currency symbol for a jar, using token symbols mapping for ERC20 tokens
 */
export function getCurrencySymbol(
  jar: JarData,
  nativeCurrency: NativeCurrency,
  tokenSymbols: Record<string, string>,
) {
  // Handle cases where currency might be undefined
  if (!jar.currency) {
    return "TOKEN";
  }
  
  if (jar.currency.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    return nativeCurrency.symbol;
  } else {
    // Use the fetched token symbols instead of hardcoded "TOKEN"
    return tokenSymbols[jar.currency.toLowerCase()] || "TOKEN";
  }
}

/**
 * Get withdrawal amount display string for a jar
 * 
 * @param jar - The jar data containing withdrawal information  
 * @param nativeCurrency - Native currency configuration
 * @param tokenSymbols - Mapping of token addresses to symbols
 * @param tokenDecimals - Optional mapping of token addresses to their decimal counts
 * @returns Formatted withdrawal amount display string
 */
export function getWithdrawalAmountDisplay(
  jar: JarData,
  nativeCurrency: NativeCurrency,
  tokenSymbols: Record<string, string>,
  tokenDecimals?: Record<string, number>,
) {
  const symbol = getCurrencySymbol(jar, nativeCurrency, tokenSymbols);
  
  // Handle cases where currency might be undefined
  if (!jar.currency) {
    return "N/A";
  }
  
  const isEth = jar.currency.toLowerCase() === ETH_ADDRESS.toLowerCase();
  const decimals = tokenDecimals?.[jar.currency.toLowerCase()] ?? 18;

  if (jar.withdrawalOption === 0) {
    // Fixed
    const amount = isEth 
      ? formatEther(jar.fixedAmount || BigInt(0))
      : formatUnits(jar.fixedAmount || BigInt(0), decimals);
    return `Fixed: ${amount} ${symbol}`;
  } else {
    // Variable
    const amount = isEth 
      ? formatEther(jar.maxWithdrawal || BigInt(0))
      : formatUnits(jar.maxWithdrawal || BigInt(0), decimals);
    return `Max: ${amount} ${symbol}`;
  }
}

/**
 * Parse jar name from metadata
 */
export function getJarName(jar: JarData) {
  if (jar.metadata) {
    try {
      const parsed = JSON.parse(jar.metadata);
      return parsed.name || "Cookie Jar";
    } catch (e) {
      return jar.metadata || "Cookie Jar";
    }
  }
  return "Cookie Jar";
}
