"use client";

import { useQuery } from "@tanstack/react-query";
import { erc20Abi } from "viem";
import { usePublicClient } from "wagmi";

/**
 * Superfluid token information
 */
export interface SuperfluidTokenInfo {
	address: string;
	symbol: string;
	name: string;
	decimals: number;
	totalSupply: bigint;
}

/**
 * Hook for getting Superfluid token information
 * Uses viem to read token properties directly from the contract
 */
export const useSuperfluidTokenInfo = (tokenAddress: `0x${string}`) => {
	const publicClient = usePublicClient();

	return useQuery({
		queryKey: ["superfluidTokenInfo", tokenAddress],
		queryFn: async (): Promise<SuperfluidTokenInfo | null> => {
			if (!publicClient) return null;

			try {
				// Read token properties directly using viem multicall
				const [symbol, name, decimals, totalSupply] = await Promise.all([
					publicClient.readContract({
						address: tokenAddress,
						abi: erc20Abi,
						functionName: "symbol",
					}),
					publicClient.readContract({
						address: tokenAddress,
						abi: erc20Abi,
						functionName: "name",
					}),
					publicClient.readContract({
						address: tokenAddress,
						abi: erc20Abi,
						functionName: "decimals",
					}),
					publicClient.readContract({
						address: tokenAddress,
						abi: erc20Abi,
						functionName: "totalSupply",
					}),
				]);

				return {
					address: tokenAddress,
					symbol,
					name,
					decimals,
					totalSupply,
				};
			} catch (error) {
				console.warn(`Failed to fetch token info for ${tokenAddress}:`, error);
				return null;
			}
		},
		enabled: !!publicClient && !!tokenAddress,
		staleTime: 5 * 60 * 1000, // 5 minutes - token info doesn't change often
		retry: 2,
	});
};
