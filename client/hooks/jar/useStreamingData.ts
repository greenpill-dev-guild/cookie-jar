"use client";

import { useQuery } from "@tanstack/react-query";
import { useSuperfluidFramework } from "../blockchain/useSuperfluidFramework";
import { useStreamsByReceiver } from "../blockchain/useSuperfluidSubgraph";
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

  // Query all active streams to this jar using The Graph subgraph
  const { 
    data: subgraphStreams, 
    isLoading: isLoadingSubgraph, 
    error: subgraphError,
    refetch 
  } = useStreamsByReceiver(jarAddress);

  // Transform subgraph data into StreamInfo format
  const { data: streamsQuery, isLoading, error } = useQuery({
    queryKey: ["superfluidStreams", "transformed", jarAddress, subgraphStreams],
    queryFn: async (): Promise<StreamInfo[]> => {
      if (!subgraphStreams) return [];

      // Transform subgraph stream data to our StreamInfo format
      return subgraphStreams.map((stream) => {
        const currentFlowRate = BigInt(stream.currentFlowRate);
        const streamedUntil = BigInt(stream.streamedUntilUpdatedAt);
        const lastUpdated = Number(stream.updatedAtTimestamp) * 1000;

        return {
          id: stream.id,
          sender: stream.sender.id,
          token: stream.token.id,
          tokenSymbol: stream.token.symbol,
          ratePerSecond: currentFlowRate,
          totalStreamed: streamedUntil,
          isActive: currentFlowRate > 0n,
          lastUpdated,
          flowRate: currentFlowRate,
        };
      });
    },
    enabled: !!subgraphStreams,
    staleTime: 30_000, // 30 seconds
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
    isLoadingStreams: isLoading || isLoadingSubgraph,
    streamsError: error || subgraphError,

    // Utilities
    calculateClaimable,
    formatStreamRate,

    // Query controls
    refetchStreams: refetch,
  };
};
