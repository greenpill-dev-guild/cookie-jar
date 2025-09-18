import { ethers } from "ethers"
import { ETH_ADDRESS } from "./token-utils"
import type { NativeCurrency } from "@/config/supported-networks"

/**
 * Utility functions for jar data formatting and processing
 */

export interface JarData {
  currency?: string
  currencyHeldByJar?: string
  withdrawalOption?: number
  fixedAmount?: string
  maxWithdrawal?: string
  metadata?: string
  jarAddress: string
}

/**
 * Get formatted currency amount from jar data
 */
export function getCurrencyAmount(jar: JarData) {
  if (jar.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    return ethers.formatEther(jar.currencyHeldByJar || "0")
  } else {
    // For ERC20 tokens, we might need to handle different decimals
    // TODO: Could be enhanced to fetch actual decimals per token
    return ethers.formatUnits(jar.currencyHeldByJar || "0", 18) // Assuming 18 decimals for now
  }
}

/**
 * Get currency symbol for a jar, using token symbols mapping for ERC20 tokens
 */
export function getCurrencySymbol(jar: JarData, nativeCurrency: NativeCurrency, tokenSymbols: Record<string, string>) {
  if (jar.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    return nativeCurrency.symbol
  } else {
    // Use the fetched token symbols instead of hardcoded "TOKEN"
    return tokenSymbols[jar.currency?.toLowerCase() || ""] || "TOKEN"
  }
}

/**
 * Get withdrawal amount display string for a jar
 */
export function getWithdrawalAmountDisplay(jar: JarData, nativeCurrency: NativeCurrency, tokenSymbols: Record<string, string>) {
  const symbol = getCurrencySymbol(jar, nativeCurrency, tokenSymbols)
  
  if (jar.withdrawalOption === 0) { // Fixed
    return `Fixed: ${ethers.formatEther(jar.fixedAmount || "0")} ${symbol}`
  } else { // Variable
    return `Max: ${ethers.formatEther(jar.maxWithdrawal || "0")} ${symbol}`
  }
}

/**
 * Parse jar name from metadata
 */
export function getJarName(jar: JarData) {
  if (jar.metadata) {
    try {
      const parsed = JSON.parse(jar.metadata)
      return parsed.name || 'Cookie Jar'
    } catch (e) {
      return jar.metadata || 'Cookie Jar'
    }
  }
  return 'Cookie Jar'
}
