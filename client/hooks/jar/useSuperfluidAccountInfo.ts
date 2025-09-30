"use client";

import { useQuery } from "@tanstack/react-query";
import { useSuperfluidFramework } from "../blockchain/useSuperfluidFramework";
import { formatUnits } from "viem";

/**
 * Superfluid account flow information
 */
export interface SuperfluidAccountInfo {
  netFlowRate: bigint;
  totalDeposit: bigint;
  owedDeposit: bigint;
  lastUpdated: number;
  formattedNetFlowRate: string;
  formattedTotalDeposit: string;
}

/**
 * Hook for getting Superfluid account flow information for a jar
 */
export const useSuperfluidAccountInfo = (jarAddress: `0x${string}`) => {
  const { data: sf } = useSuperfluidFramework();

  return useQuery({
    queryKey: ["superfluidAccountInfo", jarAddress],
    queryFn: async (): Promise<SuperfluidAccountInfo | null> => {
      if (!sf) return null;

      try {
        const cfa = sf.cfa;

        // Get comprehensive account flow information
        // This gives us net flow rate, total deposit, owed deposit
        const accountFlowInfo = await cfa.getAccountFlowInfo({
          superToken: "0x0000000000000000000000000000000000000000", // ETHx or other
          account: jarAddress,
        });

        // Get net flow rate for the jar
        const netFlowRate = await cfa.getNetFlow({
          superToken: "0x0000000000000000000000000000000000000000",
          account: jarAddress,
        });

        const info: SuperfluidAccountInfo = {
          netFlowRate: BigInt(netFlowRate),
          totalDeposit: BigInt(accountFlowInfo.deposit),
          owedDeposit: BigInt(accountFlowInfo.owedDeposit),
          lastUpdated: Number(accountFlowInfo.timestamp) * 1000,
          formattedNetFlowRate: formatUnits(BigInt(netFlowRate), 18),
          formattedTotalDeposit: formatUnits(BigInt(accountFlowInfo.deposit), 18),
        };

        return info;
      } catch (error) {
        console.warn("Failed to fetch Superfluid account info:", error);
        return null;
      }
    },
    enabled: !!sf && !!jarAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry if it's a known issue
      if (error.message?.includes("not supported")) return false;
      return failureCount < 3;
    },
  });
};