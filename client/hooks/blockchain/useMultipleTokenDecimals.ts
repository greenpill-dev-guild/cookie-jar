"use client";

import { erc20Abi } from "viem";
import { useReadContracts } from "wagmi";

/**
 * Custom hook to fetch multiple ERC-20 token decimals efficiently
 *
 * Batches multiple token decimals requests into a single multicall for optimal
 * performance. Caches results to minimize redundant network requests.
 *
 * @param currencies - Array of ERC-20 token contract addresses
 * @returns Object mapping each currency address to its decimal count
 *
 * @example
 * ```tsx
 * const tokens = ['0x...', '0x...'];
 * const decimalsMap = useMultipleTokenDecimals(tokens);
 *
 * // decimalsMap['0x...'] = 18
 * console.log(decimalsMap[tokens[0]]); // 18
 * ```
 */
export function useMultipleTokenDecimals(
	currencies: string[],
): Record<string, number> {
	const { data: decimalsData } = useReadContracts({
		contracts: currencies.map((currency) => ({
			address: currency as `0x${string}`,
			abi: erc20Abi,
			functionName: "decimals",
		})),
		query: {
			enabled: currencies.length > 0,
			staleTime: 300000, // Cache for 5 minutes (decimals rarely change)
			gcTime: 900000, // Keep in cache for 15 minutes
		},
	});

	// Create a mapping of currency address to decimals
	const decimalsMap: Record<string, number> = {};
	currencies.forEach((currency, index) => {
		const result = decimalsData?.[index];
		decimalsMap[currency.toLowerCase()] =
			result?.status === "success" ? (result.result as number) : 18; // Default to 18 decimals
	});

	return decimalsMap;
}
