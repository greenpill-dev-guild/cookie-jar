"use client";

import { useQuery } from "@tanstack/react-query";
import { useSuperfluidFramework } from "../blockchain/useSuperfluidFramework";
import { formatUnits } from "viem";

/**
 * Stream configuration structure
 */
export interface StreamingConfig {
  streamingEnabled: boolean;
  requireStreamApproval: boolean;
  maxStreamRate: bigint;
  minStreamDuration: number;
}

/**
 * Individual stream data
 */
export interface StreamInfo {
  id: string;
  sender: string;
  token: string;
  tokenSymbol?: string;
  ratePerSecond: bigint;
  totalStreamed: bigint;
  isActive: boolean;
  lastUpdated: number;
  flowRate: bigint;
}

/**
 * Hook for reading streaming data using Superfluid SDK
 */
export const useStreamingData = (jarAddress: `0x${string}`) => {
  const { data: sf } = useSuperfluidFramework();

  // Query all flows to this jar using Superfluid SDK
  const { data: streamsQuery, isLoading, error, refetch } = useQuery({
    queryKey: ["superfluidStreams", jarAddress],
    queryFn: async (): Promise<StreamInfo[]> => {
      if (!sf) return [];

      const cfa = sf.cfa;

      // Get all flows where this jar is the receiver
      // Note: This is a simplified approach. In production, you might need to:
      // 1. Use event listeners to track stream creation
      // 2. Maintain a local index of active streams
      // 3. Query specific known super tokens

      // For now, we'll query a few common super tokens that might have streams
      const commonSuperTokens = [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (ETHx)
        "0xA0b86a33E6417E9fF1C9683779ab69Vc56C95a78", // USDC
        "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      ];

      const streams: StreamInfo[] = [];

      for (const tokenAddress of commonSuperTokens) {
        try {
          // Try to get flow info for this token
          const flowInfo = await cfa.getFlow({
            superToken: tokenAddress,
            sender: "0x0000000000000000000000000000000000000000", // Any sender
            receiver: jarAddress,
          });

          // If flow rate is non-zero, there's an active stream
          if (flowInfo.flowRate !== "0") {
            // Get account flow info for additional details
            const accountFlowInfo = await cfa.getAccountFlowInfo({
              superToken: tokenAddress,
              account: jarAddress,
            });

            // Load super token for symbol
            const superToken = await sf.loadSuperToken(tokenAddress);

            streams.push({
              id: `${tokenAddress}-${flowInfo.sender}`,
              sender: flowInfo.sender,
              token: tokenAddress,
              tokenSymbol: await superToken.symbol(),
              ratePerSecond: BigInt(flowInfo.flowRate),
              totalStreamed: BigInt(accountFlowInfo.deposit),
              isActive: BigInt(flowInfo.flowRate) !== 0n,
              lastUpdated: Number(flowInfo.timestamp) * 1000,
              flowRate: BigInt(flowInfo.flowRate),
            });
          }
        } catch (error) {
          // Token might not be a super token or no streams exist
          console.warn(`No streams found for token ${tokenAddress}:`, error);
        }
      }

      return streams;
    },
    enabled: !!sf && !!jarAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get streaming configuration (mock for now - could be added to contract if needed)
  const streamingConfig: StreamingConfig = {
    streamingEnabled: true,
    requireStreamApproval: true,
    maxStreamRate: BigInt("1000000000000000000"), // 1 token per second
    minStreamDuration: 3600, // 1 hour
  };

  // Helper function to calculate claimable amount for a stream
  const calculateClaimable = (stream: StreamInfo): bigint => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const lastUpdated = BigInt(Math.floor(stream.lastUpdated / 1000));
    const timeElapsed = now - lastUpdated;
    return timeElapsed * stream.ratePerSecond;
  };

  // Helper function to format stream rate
  const formatStreamRate = (ratePerSecond: bigint, decimals: number = 18): string => {
    const ratePerHour = ratePerSecond * BigInt(3600);
    const ratePerDay = ratePerSecond * BigInt(86400);

    if (ratePerDay < BigInt(10) ** BigInt(decimals)) {
      return `${formatUnits(ratePerHour, decimals)}/hour`;
    } else {
      return `${formatUnits(ratePerDay, decimals)}/day`;
    }
  };

  return {
    // Raw data
    streamingConfig,

    // Processed data
    streams: streamsQuery || [],
    isLoadingStreams: isLoading,
    streamsError: error,

    // Utilities
    calculateClaimable,
    formatStreamRate,

    // Query controls
    refetchStreams: refetch,
  };
};
