"use client";

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { cookieJarAbi } from "@/generated";
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
  id: number;
  sender: string;
  token: string;
  ratePerSecond: bigint;
  startTime: number;
  endTime: number;
  lastProcessed: number;
  totalStreamed: bigint;
  isActive: boolean;
  isApproved: boolean;
}

/**
 * Hook for reading streaming configuration and data
 */
export const useStreamingData = (jarAddress: `0x${string}`) => {
  
  // Get total number of streams
  const { data: totalStreams } = useReadContract({
    address: jarAddress,
    abi: cookieJarAbi,
    functionName: "getTotalStreams",
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Get active streams
  const { data: activeStreams } = useReadContract({
    address: jarAddress,
    abi: cookieJarAbi,
    functionName: "getActiveStreams",
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Get streaming configuration (mock for now - add this to contract if needed)
  const streamingConfig: StreamingConfig = {
    streamingEnabled: true,
    requireStreamApproval: true,
    maxStreamRate: BigInt("1000000000000000000"), // 1 token per second
    minStreamDuration: 3600, // 1 hour
  };

  // Get individual stream details
  const useStreamDetails = (streamId: number) => {
    return useReadContract({
      address: jarAddress,
      abi: cookieJarAbi,
      functionName: "getStream",
      args: [BigInt(streamId)],
      query: {
        enabled: streamId >= 0,
        refetchInterval: 15000, // Refetch every 15 seconds for individual streams
      },
    });
  };

  // Process streams data into a more usable format
  const processedStreams = useQuery({
    queryKey: ["processedStreams", jarAddress, activeStreams],
    queryFn: async (): Promise<StreamInfo[]> => {
      if (!activeStreams || !Array.isArray(activeStreams)) {
        return [];
      }

      // For each active stream, we would fetch detailed info
      // This is a simplified version - in practice you'd batch these calls
      const streamDetails: StreamInfo[] = [];
      
      for (let i = 0; i < (totalStreams ? Number(totalStreams) : 0); i++) {
        // In a real implementation, you'd use useStreamDetails or batch call
        // For now, we'll create mock data based on the pattern
        streamDetails.push({
          id: i,
          sender: "0x742C69AC1C207Cf1E595F9eED60d3E30f4d8d5F0",
          token: "0xA0b86a33E6417E9fF1C9683779ab69Vc56C95a78",
          ratePerSecond: BigInt("100000000000000000"), // 0.1 tokens per second
          startTime: Date.now() - 86400000, // Started 1 day ago
          endTime: 0, // Indefinite
          lastProcessed: Date.now() - 3600000, // Last processed 1 hour ago
          totalStreamed: BigInt("8640000000000000000000"), // 8640 tokens
          isActive: true,
          isApproved: i === 0, // First stream approved, others pending
        });
      }

      return streamDetails;
    },
    enabled: !!activeStreams,
    refetchInterval: 30000,
  });

  // Helper function to calculate claimable amount
  const calculateClaimable = (stream: StreamInfo): bigint => {
    const now = Math.floor(Date.now() / 1000);
    const lastProcessed = Math.floor(stream.lastProcessed / 1000);
    const timeElapsed = BigInt(now - lastProcessed);
    return timeElapsed * stream.ratePerSecond;
  };

  // Helper function to format stream rate
  const formatStreamRate = (ratePerSecond: bigint, decimals: number): string => {
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
    totalStreams: totalStreams ? Number(totalStreams) : 0,
    activeStreams,
    streamingConfig,

    // Processed data
    streams: processedStreams.data || [],
    isLoadingStreams: processedStreams.isLoading,
    streamsError: processedStreams.error,

    // Utilities
    calculateClaimable,
    formatStreamRate,
    useStreamDetails,

    // Query controls
    refetchStreams: processedStreams.refetch,
  };
};
