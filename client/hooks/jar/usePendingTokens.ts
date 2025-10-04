"use client";

import { useQueries } from "@tanstack/react-query";
import { erc20Abi, formatUnits, isAddress } from "viem";
import { usePublicClient, useReadContract } from "wagmi";
import { cookieJarAbi } from "@/generated";

/**
 * Pending token data structure
 */
export interface PendingToken {
	address: string;
	name: string;
	symbol: string;
	balance: bigint;
	decimals: number;
	formattedBalance: string;
	isSwappable: boolean;
	estimatedOutput?: bigint;
}

/**
 * Hook for reading pending token balances and information using contract data
 */
export const usePendingTokens = (jarAddress: `0x${string}`) => {
	const publicClient = usePublicClient();

	// Get pending token addresses from contract
	const { data: pendingTokenAddresses } = useReadContract({
		address: jarAddress,
		abi: cookieJarAbi,
		functionName: "getPendingTokenAddresses",
	});

	// For each token, get balance and metadata
	const tokenQueries = useQueries({
		queries: (pendingTokenAddresses || []).map((token) => ({
			queryKey: ["pendingToken", jarAddress, token],
			queryFn: async (): Promise<PendingToken | null> => {
				if (!publicClient || !isAddress(token)) return null;

				try {
					const [name, symbol, decimals, balance] = await Promise.all([
						publicClient.readContract({
							address: token,
							abi: erc20Abi,
							functionName: "name",
						}),
						publicClient.readContract({
							address: token,
							abi: erc20Abi,
							functionName: "symbol",
						}),
						publicClient.readContract({
							address: token,
							abi: erc20Abi,
							functionName: "decimals",
						}),
						publicClient.readContract({
							address: token,
							abi: erc20Abi,
							functionName: "balanceOf",
							args: [jarAddress],
						}),
					]);

					return {
						address: token,
						name: name as string,
						symbol: symbol as string,
						balance: balance as bigint,
						decimals: decimals as number,
						formattedBalance: formatUnits(
							balance as bigint,
							decimals as number,
						),
						isSwappable: true, // For now, assume all tokens are swappable
					};
				} catch (error) {
					console.error(`Error fetching token details for ${token}:`, error);
					return null;
				}
			},
			enabled: !!pendingTokenAddresses && !!publicClient,
			staleTime: 30000, // 30 seconds
		})),
	});

	const pendingTokens = tokenQueries
		.map((q) => q.data)
		.filter(Boolean) as PendingToken[];

	// Helper function to get total estimated value (mock for now)
	const getTotalEstimatedValue = (): bigint => {
		// In production, this would query DEX oracles for price conversion
		return pendingTokens.reduce((total, token) => total + token.balance, 0n);
	};

	// Helper function to get swappable tokens count
	const getSwappableTokensCount = (): number => {
		return pendingTokens.filter((token) => token.isSwappable).length;
	};

	// Helper function to format token balance
	const formatTokenBalance = (
		balance: bigint,
		decimals: number,
		maxDecimals: number = 6,
	): string => {
		const formatted = formatUnits(balance, decimals);
		const parts = formatted.split(".");
		if (parts.length > 1 && parts[1].length > maxDecimals) {
			return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`;
		}
		return formatted;
	};

	return {
		// Data
		pendingTokens,
		isLoading: tokenQueries.some((q) => q.isLoading),
		error: tokenQueries.find((q) => q.error)?.error,

		// Computed values
		totalEstimatedValue: getTotalEstimatedValue(),
		swappableTokensCount: getSwappableTokensCount(),

		// Utilities
		formatTokenBalance,

		// Query controls
		refetch: () => tokenQueries.forEach((q) => q.refetch()),
		isRefetching: tokenQueries.some((q) => q.isRefetching),
	};
};
