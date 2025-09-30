"use client";

import { useQuery } from "@tanstack/react-query";
import { useSuperfluidFramework } from "./useSuperfluidFramework";

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
 */
export const useSuperfluidTokenInfo = (tokenAddress: `0x${string}`) => {
  const { data: sf } = useSuperfluidFramework();

  return useQuery({
    queryKey: ["superfluidTokenInfo", tokenAddress],
    queryFn: async (): Promise<SuperfluidTokenInfo | null> => {
      if (!sf) return null;

      try {
        const superToken = await sf.loadSuperToken(tokenAddress);

        const [symbol, name, decimals, totalSupply] = await Promise.all([
          superToken.symbol(),
          superToken.name(),
          superToken.decimals(),
          superToken.totalSupply(),
        ]);

        return {
          address: tokenAddress,
          symbol,
          name,
          decimals,
          totalSupply,
        };
      } catch (error) {
        console.warn(`Failed to fetch Superfluid token info for ${tokenAddress}:`, error);
        return null;
      }
    },
    enabled: !!sf && !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes - token info doesn't change often
    retry: (failureCount, error) => {
      // Don't retry if token doesn't exist or isn't a super token
      if (error.message?.includes("not a super token")) return false;
      return failureCount < 2;
    },
  });
};