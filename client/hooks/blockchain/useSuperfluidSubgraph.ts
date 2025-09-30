"use client";

import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { GraphQLClient } from "graphql-request";
import { getSuperfluidSubgraphUrl, isSubgraphAvailable } from "@/lib/blockchain/superfluid-subgraph";
import {
  GET_STREAMS_BY_RECEIVER,
  GET_ACCOUNT_STREAM_INFO,
  GET_STREAM_BY_PARTIES,
  GET_STREAM_HISTORY,
  type GetStreamsByReceiverResponse,
  type GetAccountStreamInfoResponse,
  type GetStreamByPartiesResponse,
  type GetStreamHistoryResponse,
  type StreamData,
  type AccountData,
  type FlowUpdatedEvent,
} from "@/lib/blockchain/superfluid-queries";

/**
 * Hook to get GraphQL client for current chain
 */
export function useSuperfluidSubgraphClient() {
  const chainId = useChainId();
  
  const client = isSubgraphAvailable(chainId)
    ? new GraphQLClient(getSuperfluidSubgraphUrl(chainId)!)
    : null;
  
  return {
    client,
    isAvailable: isSubgraphAvailable(chainId),
    chainId,
  };
}

/**
 * Hook to query all active streams flowing to a specific receiver (jar address)
 * 
 * @param receiver - The jar address receiving streams
 * @param options - Query options (first, skip for pagination)
 */
export function useStreamsByReceiver(
  receiver: `0x${string}` | undefined,
  options?: { first?: number; skip?: number }
) {
  const { client, isAvailable } = useSuperfluidSubgraphClient();
  
  return useQuery({
    queryKey: ["superfluid-streams", "receiver", receiver, options],
    queryFn: async (): Promise<StreamData[]> => {
      if (!client || !receiver) return [];
      
      try {
        const data = await client.request<GetStreamsByReceiverResponse>(
          GET_STREAMS_BY_RECEIVER,
          {
            receiver: receiver.toLowerCase(),
            first: options?.first ?? 100,
            skip: options?.skip ?? 0,
          }
        );
        
        return data.streams;
      } catch (error) {
        console.error("Failed to fetch streams from subgraph:", error);
        throw error;
      }
    },
    enabled: !!client && !!receiver && isAvailable,
    staleTime: 30_000, // 30 seconds - streams update frequently
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
    retry: 3,
  });
}

/**
 * Hook to query account stream information (net flow rates, deposits)
 * 
 * @param account - The account address to query
 */
export function useAccountStreamInfo(account: `0x${string}` | undefined) {
  const { client, isAvailable } = useSuperfluidSubgraphClient();
  
  return useQuery({
    queryKey: ["superfluid-account", account],
    queryFn: async (): Promise<AccountData | null> => {
      if (!client || !account) return null;
      
      try {
        const data = await client.request<GetAccountStreamInfoResponse>(
          GET_ACCOUNT_STREAM_INFO,
          {
            account: account.toLowerCase(),
          }
        );
        
        return data.account;
      } catch (error) {
        console.error("Failed to fetch account info from subgraph:", error);
        throw error;
      }
    },
    enabled: !!client && !!account && isAvailable,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 30_000,
    retry: 3,
  });
}

/**
 * Hook to query a specific stream by sender, receiver, and token
 * 
 * @param sender - The sender address
 * @param receiver - The receiver address
 * @param token - The super token address
 */
export function useStreamByParties(
  sender: `0x${string}` | undefined,
  receiver: `0x${string}` | undefined,
  token: `0x${string}` | undefined
) {
  const { client, isAvailable } = useSuperfluidSubgraphClient();
  
  return useQuery({
    queryKey: ["superfluid-stream", sender, receiver, token],
    queryFn: async (): Promise<StreamData | null> => {
      if (!client || !sender || !receiver || !token) return null;
      
      try {
        const data = await client.request<GetStreamByPartiesResponse>(
          GET_STREAM_BY_PARTIES,
          {
            sender: sender.toLowerCase(),
            receiver: receiver.toLowerCase(),
            token: token.toLowerCase(),
          }
        );
        
        return data.streams[0] || null;
      } catch (error) {
        console.error("Failed to fetch stream from subgraph:", error);
        throw error;
      }
    },
    enabled: !!client && !!sender && !!receiver && !!token && isAvailable,
    staleTime: 30_000,
    retry: 3,
  });
}

/**
 * Hook to query stream history (flow update events) for a receiver
 * 
 * @param receiver - The receiver address
 * @param first - Number of events to fetch (default: 50)
 */
export function useStreamHistory(
  receiver: `0x${string}` | undefined,
  first?: number
) {
  const { client, isAvailable } = useSuperfluidSubgraphClient();
  
  return useQuery({
    queryKey: ["superfluid-history", receiver, first],
    queryFn: async (): Promise<FlowUpdatedEvent[]> => {
      if (!client || !receiver) return [];
      
      try {
        const data = await client.request<GetStreamHistoryResponse>(
          GET_STREAM_HISTORY,
          {
            receiver: receiver.toLowerCase(),
            first: first ?? 50,
          }
        );
        
        return data.flowUpdatedEvents;
      } catch (error) {
        console.error("Failed to fetch stream history from subgraph:", error);
        throw error;
      }
    },
    enabled: !!client && !!receiver && isAvailable,
    staleTime: 60_000, // 1 minute - history doesn't change as frequently
    retry: 3,
  });
}
