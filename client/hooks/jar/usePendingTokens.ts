"use client";

import { useQuery } from "@tanstack/react-query";
import { useReadContract, useAccount } from "wagmi";
import { cookieJarAbi } from "@/generated";
import { formatUnits, erc20Abi, isAddress } from "viem";
import { usePublicClient } from "wagmi";

/**
 * Pending token data structure
 */
export interface PendingToken {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: bigint;
  decimals: number;
  isSwappable: boolean;
  estimatedOutput?: bigint;
}

/**
 * Hook for reading pending token balances and information
 */
export const usePendingTokens = (jarAddress: `0x${string}`) => {
  const publicClient = usePublicClient();

  // Mock function to get pending token addresses from events or contract state
  // In a real implementation, this might come from contract events or a view function
  const getPendingTokenAddresses = async (): Promise<string[]> => {
    // This would typically be implemented by:
    // 1. Reading events for direct token transfers to the jar
    // 2. Calling a view function that returns pending token addresses
    // 3. Or maintaining an off-chain index
    
    // For now, return mock addresses for demonstration
    return [
      "0xA0b86a33E6417E9fF1C9683779ab69Vc56C95a78", // USDC
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
    ];
  };

  // Get token details for a specific token address
  const getTokenDetails = async (tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    balance: bigint;
  } | null> => {
    if (!publicClient || !isAddress(tokenAddress)) return null;

    try {
      // Get token metadata
      const [name, symbol, decimals, balance] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "name",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [jarAddress],
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        balance: balance as bigint,
      };
    } catch (error) {
      console.error(`Error fetching token details for ${tokenAddress}:`, error);
      return null;
    }
  };

  // Main query for pending tokens
  const pendingTokensQuery = useQuery({
    queryKey: ["pendingTokens", jarAddress],
    queryFn: async (): Promise<PendingToken[]> => {
      const tokenAddresses = await getPendingTokenAddresses();
      const pendingTokens: PendingToken[] = [];

      for (const tokenAddress of tokenAddresses) {
        const tokenDetails = await getTokenDetails(tokenAddress);
        
        if (tokenDetails && tokenDetails.balance > 0n) {
          // Determine if token is swappable (mock logic)
          const isSwappable = !["0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"].includes(tokenAddress);
          
          // Mock estimated output (would come from DEX price oracle)
          let estimatedOutput: bigint | undefined;
          if (isSwappable) {
            if (tokenAddress === "0xA0b86a33E6417E9fF1C9683779ab69Vc56C95a78") {
              // USDC to DAI (1:1 roughly)
              estimatedOutput = tokenDetails.balance * BigInt(10**(18-6)); // Convert 6 decimals to 18
            } else if (tokenAddress === "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") {
              // WETH to DAI (assume 1600 DAI per ETH)
              estimatedOutput = (tokenDetails.balance * BigInt(1600));
            }
          }

          pendingTokens.push({
            tokenAddress,
            tokenName: tokenDetails.name,
            tokenSymbol: tokenDetails.symbol,
            balance: tokenDetails.balance,
            decimals: tokenDetails.decimals,
            isSwappable,
            estimatedOutput,
          });
        }
      }

      return pendingTokens;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!publicClient && !!jarAddress,
  });

  // Helper function to get total estimated value
  const getTotalEstimatedValue = (): bigint => {
    if (!pendingTokensQuery.data) return 0n;
    
    return pendingTokensQuery.data
      .filter(token => token.estimatedOutput)
      .reduce((total, token) => total + (token.estimatedOutput || 0n), 0n);
  };

  // Helper function to get swappable tokens count
  const getSwappableTokensCount = (): number => {
    if (!pendingTokensQuery.data) return 0;
    return pendingTokensQuery.data.filter(token => token.isSwappable).length;
  };

  // Helper function to format token balance
  const formatTokenBalance = (balance: bigint, decimals: number, maxDecimals: number = 6): string => {
    const formatted = formatUnits(balance, decimals);
    const parts = formatted.split('.');
    if (parts.length > 1 && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`;
    }
    return formatted;
  };

  return {
    // Data
    pendingTokens: pendingTokensQuery.data || [],
    isLoading: pendingTokensQuery.isLoading,
    error: pendingTokensQuery.error,

    // Computed values
    totalEstimatedValue: getTotalEstimatedValue(),
    swappableTokensCount: getSwappableTokensCount(),

    // Utilities
    formatTokenBalance,
    
    // Query controls
    refetch: pendingTokensQuery.refetch,
    isRefetching: pendingTokensQuery.isRefetching,
  };
};
