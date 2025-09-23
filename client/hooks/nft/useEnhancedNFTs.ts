import {
  AlchemyNFTProvider,
  type EnhancedNFT,
  type NFTProvider,
} from "@/lib/nft/AlchemyProvider";
import { Network } from "alchemy-sdk";
import { useAccount, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/**
 * Rate limiting configuration to prevent API abuse
 */
const RATE_LIMIT_CONFIG = {
  /** Maximum API requests per minute */
  MAX_REQUESTS_PER_MINUTE: 60,
  /** Debounce delay in milliseconds to prevent excessive calls */
  DEBOUNCE_DELAY: 800,
  /** Maximum concurrent API requests */
  MAX_CONCURRENT_REQUESTS: 3,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 15000,
  /** Base retry backoff delay in milliseconds */
  RETRY_BACKOFF_BASE: 1000,
  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY: 10000,
} as const;

// Enhanced rate limiting hook
const useRateLimit = (maxRequests: number, windowMs: number) => {
  const requestTimesRef = useRef<number[]>([]);
  const activeRequestsRef = useRef<number>(0);

  const canMakeRequest = useCallback(() => {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Remove old requests outside the window
    requestTimesRef.current = requestTimesRef.current.filter(
      (time) => time > cutoff,
    );

    // Check concurrent request limit
    if (
      activeRequestsRef.current >= RATE_LIMIT_CONFIG.MAX_CONCURRENT_REQUESTS
    ) {
      return false;
    }

    // Check rate limit
    if (requestTimesRef.current.length < maxRequests) {
      requestTimesRef.current.push(now);
      return true;
    }

    return false;
  }, [maxRequests, windowMs]);

  const startRequest = useCallback(() => {
    activeRequestsRef.current += 1;
  }, []);

  const endRequest = useCallback(() => {
    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
  }, []);

  return { canMakeRequest, startRequest, endRequest };
};

// Debounced state hook
const useDebouncedState = <T>(value: T, delay: number): [T, boolean] => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      clearTimeout(handler);
      setIsPending(false);
    };
  }, [value, delay]);

  return [debouncedValue, isPending];
};

/**
 * Parameters for useEnhancedNFTs hook
 */
interface UseEnhancedNFTsParams {
  /** Specific user address to fetch NFTs for */
  userAddress?: string;
  /** Filter by specific contract addresses */
  contractAddresses?: string[];
  /** Whether to fetch detailed metadata (slower) */
  withMetadata?: boolean;
  /** Number of NFTs to fetch per page */
  pageSize?: number;
  /** Whether to enable automatic fetching */
  enabled?: boolean;
}

/**
 * Return type for useEnhancedNFTs hook
 */
interface UseEnhancedNFTsReturn {
  /** Array of user's NFTs with enhanced metadata */
  nfts: EnhancedNFT[];
  /** NFTs grouped by collection */
  collections: Array<{
    contractAddress: string;
    name?: string;
    nfts: EnhancedNFT[];
    verified?: boolean;
    floorPrice?: number;
  }>;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Whether debounce delay is active */
  isDebouncing: boolean;
  /** Error message if request failed */
  error: string | null;
  /** Function to refresh NFT data */
  refetch: () => void;
  /** Whether more pages are available */
  hasMore: boolean;
  /** Function to load next page */
  loadMore: () => void;
  /** Function to search NFTs by query */
  searchNFTs: (query: string) => EnhancedNFT[];
  /** Current rate limit status */
  rateLimitStatus: {
    canMakeRequest: boolean;
    remainingRequests: number;
  };
}

/**
 * Custom hook for fetching enhanced NFT data with Alchemy SDK integration
 * 
 * Provides comprehensive NFT data including metadata, rarity scores, collection
 * information, and analytics. Features advanced rate limiting, debouncing,
 * pagination, and error handling for optimal performance and reliability.
 * 
 * Features:
 * - Rate limiting and request debouncing
 * - Pagination with infinite scroll support
 * - Collection grouping and analysis
 * - Search functionality
 * - Comprehensive error handling
 * - Network-specific provider support
 * 
 * @param params - Configuration object for NFT fetching
 * @returns Object with NFT data, loading states, and control functions
 * 
 * @example
 * ```tsx
 * const {
 *   nfts,
 *   collections,
 *   isLoading,
 *   searchNFTs,
 *   loadMore,
 *   hasMore
 * } = useEnhancedNFTs({
 *   withMetadata: true,
 *   pageSize: 50
 * });
 * 
 * return (
 *   <div>
 *     {collections.map(collection => (
 *       <div key={collection.contractAddress}>
 *         <h3>{collection.name}</h3>
 *         {collection.nfts.map(nft => (
 *           <NFTCard key={nft.tokenId} nft={nft} />
 *         ))}
 *       </div>
 *     ))}
 *     {hasMore && <button onClick={loadMore}>Load More</button>}
 *   </div>
 * );
 * ```
 */
export const useEnhancedNFTs = ({
  userAddress,
  contractAddresses,
  withMetadata = true,
  pageSize = 50,
  enabled = true,
}: UseEnhancedNFTsParams = {}): UseEnhancedNFTsReturn => {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const [page, setPage] = useState(1);
  const [requestId, setRequestId] = useState(0);

  // Use connected address if none provided
  const effectiveAddress = userAddress || connectedAddress;

  // Enhanced rate limiting
  const { canMakeRequest, startRequest, endRequest } = useRateLimit(
    RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE,
    60 * 1000, // 1 minute window
  );

  // Debounced parameters to prevent excessive API calls
  const [debouncedAddress, isAddressPending] = useDebouncedState(
    effectiveAddress,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );
  const [debouncedContracts, isContractsPending] = useDebouncedState(
    contractAddresses,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );
  const [debouncedChainId, isChainPending] = useDebouncedState(
    chainId,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );

  const isDebouncing = isAddressPending || isContractsPending || isChainPending;

  // Stable provider instance with proper cleanup
  const provider = useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      console.warn(
        "Alchemy API key not configured. Please set NEXT_PUBLIC_ALCHEMY_API_KEY environment variable.",
      );
      return null;
    }

    // Map chainId to Alchemy network
    let network: Network;
    switch (debouncedChainId) {
      case 1:
        network = Network.ETH_MAINNET;
        break;
      case 11155111:
        network = Network.ETH_SEPOLIA;
        break;
      case 8453:
        network = Network.BASE_MAINNET;
        break;
      case 84532:
        network = Network.BASE_SEPOLIA;
        break;
      case 10:
        network = Network.OPT_MAINNET;
        break;
      case 11155420:
        network = Network.OPT_SEPOLIA;
        break;
      case 137:
        network = Network.MATIC_MAINNET;
        break;
      case 42161:
        network = Network.ARB_MAINNET;
        break;
      default:
        network = Network.ETH_MAINNET; // Default fallback
    }

    return new AlchemyNFTProvider(apiKey, network);
  }, [debouncedChainId]);

  // Enhanced query with timeout, rate limiting, and race condition protection
  const {
    data: nfts = [],
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: [
      "enhanced-nfts",
      debouncedAddress,
      debouncedContracts,
      debouncedChainId,
      page,
      requestId,
    ],
    queryFn: async ({ signal }) => {
      if (!debouncedAddress || !provider) return [];

      // Check rate limit
      if (!canMakeRequest()) {
        throw new Error(
          "Rate limit exceeded. Please wait before making another request.",
        );
      }

      startRequest();
      const currentRequestId = requestId;

      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timeout"));
          }, RATE_LIMIT_CONFIG.REQUEST_TIMEOUT);
        });

        // Create main request promise
        const requestPromise = provider.getUserNFTs(
          debouncedAddress,
          debouncedContracts,
        );

        // Race between timeout and request
        const result = await Promise.race([requestPromise, timeoutPromise]);

        // Check if this request is still current (avoid race conditions)
        if (currentRequestId !== requestId) {
          console.log("Request outdated, ignoring result");
          return [];
        }

        // Validate and sanitize results
        if (!Array.isArray(result)) {
          throw new Error("Invalid response format from NFT provider");
        }

        // Limit results to prevent memory issues
        return result.slice(0, 1000);
      } catch (err) {
        console.error("Enhanced NFTs fetch failed:", err);

        // Enhanced error handling
        if (err instanceof Error) {
          if (
            err.message.includes("rate limit") ||
            err.message.includes("429")
          ) {
            throw new Error(
              "API rate limit exceeded. Please wait and try again.",
            );
          }
          if (err.message.includes("timeout")) {
            throw new Error(
              "Request timed out. Please check your connection and try again.",
            );
          }
          if (err.message.includes("network")) {
            throw new Error("Network error. Please check your connection.");
          }
        }

        throw err;
      } finally {
        endRequest();
      }
    },
    enabled: enabled && !!debouncedAddress && !!provider && !isDebouncing,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry rate limit errors
      if (error instanceof Error && error.message.includes("rate limit")) {
        return false;
      }
      // Don't retry timeout errors immediately
      if (error instanceof Error && error.message.includes("timeout")) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) =>
      Math.min(
        RATE_LIMIT_CONFIG.RETRY_BACKOFF_BASE * 2 ** attemptIndex,
        RATE_LIMIT_CONFIG.MAX_RETRY_DELAY,
      ),
  });

  // Enhanced refetch with race condition protection
  const refetch = useCallback(() => {
    setRequestId((prev) => prev + 1);
    return queryRefetch();
  }, [queryRefetch]);

  // Group NFTs by collection
  const collections = useMemo(() => {
    const collectionMap = new Map<
      string,
      {
        contractAddress: string;
        name?: string;
        nfts: EnhancedNFT[];
        verified?: boolean;
        floorPrice?: number;
      }
    >();

    nfts.forEach((nft) => {
      const address = nft.contractAddress.toLowerCase();
      if (!collectionMap.has(address)) {
        collectionMap.set(address, {
          contractAddress: nft.contractAddress,
          name: nft.collection.name,
          nfts: [],
          verified: nft.collection.verified,
          floorPrice: nft.collection.floorPrice?.value,
        });
      }
      collectionMap.get(address)!.nfts.push(nft);
    });

    return Array.from(collectionMap.values()).sort(
      (a, b) => b.nfts.length - a.nfts.length,
    );
  }, [nfts]);

  // Search functionality
  const searchNFTs = (query: string): EnhancedNFT[] => {
    if (!query) return nfts;

    const searchLower = query.toLowerCase();
    return nfts.filter(
      (nft) =>
        nft.name?.toLowerCase().includes(searchLower) ||
        nft.description?.toLowerCase().includes(searchLower) ||
        nft.collection.name?.toLowerCase().includes(searchLower) ||
        nft.contractAddress.toLowerCase().includes(searchLower) ||
        nft.tokenId.includes(query) ||
        nft.traits?.some(
          (trait) =>
            trait.trait_type.toLowerCase().includes(searchLower) ||
            String(trait.value).toLowerCase().includes(searchLower),
        ),
    );
  };

  // Enhanced load more functionality with rate limiting
  const loadMore = useCallback(() => {
    if (!canMakeRequest()) {
      console.warn("Cannot load more: rate limit reached");
      return;
    }
    setPage((prev) => prev + 1);
  }, [canMakeRequest]);

  // Calculate remaining requests for rate limit status
  const rateLimitStatus = useMemo(() => {
    const requestTimes = useRef<number[]>([]);
    const now = Date.now();
    const cutoff = now - 60000; // 1 minute

    // This is a rough estimate - the actual logic is in the rate limit hook
    const recentRequests = requestTimes.current.filter(
      (time) => time > cutoff,
    ).length;

    return {
      canMakeRequest: canMakeRequest(),
      remainingRequests: Math.max(
        0,
        RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE - recentRequests,
      ),
    };
  }, [canMakeRequest]);

  // Calculate if there are more items to load
  const hasMore = nfts.length >= page * pageSize && canMakeRequest();

  return {
    nfts,
    collections,
    isLoading,
    isDebouncing,
    error: error instanceof Error ? error.message : null,
    refetch,
    hasMore,
    loadMore,
    searchNFTs,
    rateLimitStatus,
  };
};

/**
 * Hook for getting NFT metadata for a specific token
 *
 * @param contractAddress NFT contract address
 * @param tokenId Token ID
 * @param enabled Whether to fetch metadata
 * @returns NFT metadata with enhanced information
 */
export const useNFTMetadata = (
  contractAddress: string,
  tokenId: string,
  enabled: boolean = true,
) => {
  const chainId = useChainId();

  // Rate limiting for metadata requests
  const { canMakeRequest, startRequest, endRequest } = useRateLimit(
    RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE,
    60 * 1000,
  );

  // Debounce inputs to prevent excessive API calls
  const [debouncedAddress] = useDebouncedState(
    contractAddress,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );
  const [debouncedTokenId] = useDebouncedState(
    tokenId,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );
  const [debouncedChainId] = useDebouncedState(
    chainId,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );

  const provider = useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) return null;

    let network: Network;
    switch (debouncedChainId) {
      case 1:
        network = Network.ETH_MAINNET;
        break;
      case 11155111:
        network = Network.ETH_SEPOLIA;
        break;
      case 8453:
        network = Network.BASE_MAINNET;
        break;
      case 84532:
        network = Network.BASE_SEPOLIA;
        break;
      case 10:
        network = Network.OPT_MAINNET;
        break;
      case 11155420:
        network = Network.OPT_SEPOLIA;
        break;
      default:
        network = Network.ETH_MAINNET;
    }

    return new AlchemyNFTProvider(apiKey, network);
  }, [debouncedChainId]);

  return useQuery({
    queryKey: [
      "nft-metadata",
      debouncedAddress,
      debouncedTokenId,
      debouncedChainId,
    ],
    queryFn: async () => {
      if (!provider) throw new Error("Alchemy provider not available");

      if (!canMakeRequest()) {
        throw new Error("Rate limit exceeded for metadata requests");
      }

      startRequest();

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Metadata request timeout")),
            RATE_LIMIT_CONFIG.REQUEST_TIMEOUT,
          );
        });

        const metadataPromise = provider.getNFTMetadata(
          debouncedAddress,
          debouncedTokenId,
        );

        return await Promise.race([metadataPromise, timeoutPromise]);
      } finally {
        endRequest();
      }
    },
    enabled: enabled && !!provider && !!debouncedAddress && !!debouncedTokenId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("rate limit")) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) =>
      Math.min(
        RATE_LIMIT_CONFIG.RETRY_BACKOFF_BASE * 2 ** attemptIndex,
        RATE_LIMIT_CONFIG.MAX_RETRY_DELAY,
      ),
  });
};

/**
 * Hook for enhanced NFT contract validation using SDK
 *
 * @param contractAddress Contract address to validate
 * @returns Enhanced validation results
 */
export const useEnhancedNFTValidation = (contractAddress: string) => {
  const chainId = useChainId();

  // Rate limiting for validation requests
  const { canMakeRequest, startRequest, endRequest } = useRateLimit(
    RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE,
    60 * 1000,
  );

  // Debounce inputs
  const [debouncedAddress] = useDebouncedState(
    contractAddress,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );
  const [debouncedChainId] = useDebouncedState(
    chainId,
    RATE_LIMIT_CONFIG.DEBOUNCE_DELAY,
  );

  const provider = useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) return null;

    let network: Network;
    switch (debouncedChainId) {
      case 1:
        network = Network.ETH_MAINNET;
        break;
      case 11155111:
        network = Network.ETH_SEPOLIA;
        break;
      case 8453:
        network = Network.BASE_MAINNET;
        break;
      case 84532:
        network = Network.BASE_SEPOLIA;
        break;
      case 10:
        network = Network.OPT_MAINNET;
        break;
      case 11155420:
        network = Network.OPT_SEPOLIA;
        break;
      default:
        network = Network.ETH_MAINNET;
    }

    return new AlchemyNFTProvider(apiKey, network);
  }, [debouncedChainId]);

  return useQuery({
    queryKey: ["nft-validation", debouncedAddress, debouncedChainId],
    queryFn: async () => {
      if (!provider) throw new Error("Alchemy provider not available");

      if (!canMakeRequest()) {
        throw new Error("Rate limit exceeded for validation requests");
      }

      startRequest();

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Validation request timeout")),
            RATE_LIMIT_CONFIG.REQUEST_TIMEOUT,
          );
        });

        const validationPromise = provider.validateContract(debouncedAddress);

        const result = await Promise.race([validationPromise, timeoutPromise]);

        // Additional security check for malicious contracts
        if (result.isMalicious) {
          console.warn("Malicious contract detected:", debouncedAddress);
        }

        return result;
      } finally {
        endRequest();
      }
    },
    enabled: !!provider && !!debouncedAddress && debouncedAddress.length === 42,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("rate limit")) {
        return false;
      }
      return failureCount < 1; // Less retries for validation to avoid hammering APIs
    },
    retryDelay: (attemptIndex) =>
      Math.min(
        RATE_LIMIT_CONFIG.RETRY_BACKOFF_BASE * 2 ** attemptIndex,
        RATE_LIMIT_CONFIG.MAX_RETRY_DELAY,
      ),
  });
};
