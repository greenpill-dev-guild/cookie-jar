"use client"

import { useReadContracts } from "wagmi"
import { erc20Abi } from "viem"

/**
 * Hook to fetch multiple token symbols efficiently
 * Batches requests and caches results for performance
 */
export function useMultipleTokenSymbols(currencies: string[]) {
  const { data: symbolsData } = useReadContracts({
    contracts: currencies.map(currency => ({
      address: currency as `0x${string}`,
      abi: erc20Abi,
      functionName: "symbol",
    })),
    query: {
      enabled: currencies.length > 0,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000,   // Keep in cache for 5 minutes
    },
  })

  // Create a mapping of currency address to symbol
  const symbolsMap: Record<string, string> = {}
  currencies.forEach((currency, index) => {
    const result = symbolsData?.[index]
    symbolsMap[currency.toLowerCase()] = result?.status === 'success' ? result.result as string : "TOKEN"
  })

  return symbolsMap
}
