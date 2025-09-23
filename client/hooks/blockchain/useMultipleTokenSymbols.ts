"use client";

import { erc20Abi } from "viem";
import { useReadContracts } from "wagmi";

/**
 * Custom hook to fetch multiple ERC-20 token symbols efficiently
 * 
 * Batches multiple token symbol requests into a single multicall for optimal
 * performance. Caches results to minimize redundant network requests.
 * 
 * @param currencies - Array of ERC-20 token contract addresses
 * @returns Object mapping each currency address to its symbol
 * 
 * @example
 * ```tsx
 * const tokens = ['0x...', '0x...'];
 * const symbolsMap = useMultipleTokenSymbols(tokens);
 * 
 * // symbolsMap['0x...'] = 'USDC'
 * console.log(symbolsMap[tokens[0]]); // 'USDC'
 * ```
 */
export function useMultipleTokenSymbols(currencies: string[]): Record<string, string> {
  const { data: symbolsData } = useReadContracts({
    contracts: currencies.map((currency) => ({
      address: currency as `0x${string}`,
      abi: erc20Abi,
      functionName: "symbol",
    })),
    query: {
      enabled: currencies.length > 0,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000, // Keep in cache for 5 minutes
    },
  });

  // Create a mapping of currency address to symbol
  const symbolsMap: Record<string, string> = {};
  currencies.forEach((currency, index) => {
    const result = symbolsData?.[index];
    symbolsMap[currency.toLowerCase()] =
      result?.status === "success" ? (result.result as string) : "TOKEN";
  });

  return symbolsMap;
}
