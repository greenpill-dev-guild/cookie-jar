import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';

/**
 * Alchemy network identifier mapping by chain ID
 */
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: 'eth-mainnet', // Ethereum Mainnet
  11155111: 'eth-sepolia', // Sepolia Testnet
  8453: 'base-mainnet', // Base
  84532: 'base-sepolia', // Base Sepolia
  10: 'opt-mainnet', // Optimism
  11155420: 'opt-sepolia', // Optimism Sepolia
  42161: 'arb-mainnet', // Arbitrum One
};

/**
 * NFT metadata structure from Alchemy API
 */
export interface NFTMetadata {
  /** Display name of the NFT */
  name?: string;
  /** Description of the NFT */
  description?: string;
  /** Image URL */
  image?: string;
  /** External website URL */
  external_url?: string;
}

/**
 * Individual NFT data structure
 */
export interface UserNFT {
  /** Contract information */
  contract: {
    /** Contract address */
    address: string;
    /** Collection name */
    name?: string;
    /** Collection symbol */
    symbol?: string;
    /** Token standard (ERC721 or ERC1155) */
    tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN';
  };
  /** Token ID within the contract */
  tokenId: string;
  /** Token balance (for ERC1155 tokens) */
  balance?: string;
  /** Parsed metadata object */
  metadata?: NFTMetadata;
  /** Raw token URI */
  tokenUri?: string;
  /** Last update timestamp */
  timeLastUpdated?: string;
}

/**
 * Collection data with grouped NFTs
 */
export interface NFTCollection {
  /** Contract address of the collection */
  contractAddress: string;
  /** Collection name */
  name?: string;
  /** Collection symbol */
  symbol?: string;
  /** Token standard used by collection */
  tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN';
  /** All NFTs in this collection */
  nfts: UserNFT[];
}

/**
 * Return type for useUserNFTs hook
 */
export interface useUserNFTsResult {
  /** Flat array of all user NFTs */
  nfts: UserNFT[];
  /** NFTs grouped by collection */
  collections: NFTCollection[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refresh NFT data */
  refetch: () => void;
  /** Whether more pages are available */
  hasMore: boolean;
  /** Function to load next page */
  loadMore: () => void;
}

/**
 * Options for configuring NFT fetching
 */
export interface useUserNFTsOptions {
  /** Filter by specific contract addresses */
  contractAddresses?: string[];
  /** Whether to include metadata (slower) */
  withMetadata?: boolean;
  /** Maximum NFTs per page request */
  pageSize?: number;
  /** Whether to auto-fetch on mount */
  enabled?: boolean;
}

/**
 * Custom hook to fetch user's NFTs using Alchemy API
 *
 * Fetches NFTs owned by the connected user with support for filtering,
 * pagination, and metadata fetching. Uses Alchemy's getNFTsForOwner API
 * for reliable cross-chain NFT data.
 *
 * Features:
 * - Multi-chain support (Ethereum, Base, Optimism, Arbitrum)
 * - Contract address filtering
 * - Pagination with infinite loading
 * - Collection grouping
 * - Metadata fetching toggle
 * - Automatic error handling and retries
 *
 * @param options - Configuration options for NFT fetching
 * @returns Object with NFT data, loading state, and control functions
 *
 * @example
 * ```tsx
 * const {
 *   nfts,
 *   collections,
 *   isLoading,
 *   error,
 *   refetch,
 *   hasMore,
 *   loadMore
 * } = useUserNFTs({
 *   withMetadata: true,
 *   pageSize: 50,
 *   contractAddresses: ['0x...'] // Optional filter
 * });
 *
 * if (isLoading) return <div>Loading NFTs...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return (
 *   <div>
 *     {collections.map(collection => (
 *       <CollectionView key={collection.contractAddress} collection={collection} />
 *     ))}
 *     {hasMore && (
 *       <button onClick={loadMore} disabled={isLoading}>
 *         Load More
 *       </button>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useUserNFTs(
  options: useUserNFTsOptions = {}
): useUserNFTsResult {
  const {
    contractAddresses,
    withMetadata = true,
    pageSize = 100,
    enabled = true,
  } = options;

  const { address } = useAccount();
  const chainId = useChainId();

  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const alchemyNetwork = ALCHEMY_NETWORKS[chainId];

  const fetchNFTs = useCallback(
    async (isLoadMore = false) => {
      if (!address || !alchemyId || !alchemyNetwork) {
        setError(
          !address
            ? 'Wallet not connected'
            : !alchemyId
              ? 'Alchemy API key not configured'
              : 'Network not supported by Alchemy'
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const baseUrl = `https://${alchemyNetwork}.g.alchemy.com/nft/v3/${alchemyId}`;

        // Build query parameters
        const params = new URLSearchParams({
          owner: address,
          withMetadata: withMetadata.toString(),
          pageSize: pageSize.toString(),
        });

        // Add contract addresses filter if specified
        if (contractAddresses && contractAddresses.length > 0) {
          params.append('contractAddresses', contractAddresses.join(','));
        }

        // Add pagination if loading more
        if (isLoadMore && pageKey) {
          params.append('pageKey', pageKey);
        }

        const url = `${baseUrl}/getNFTsForOwner?${params.toString()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Alchemy API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Map Alchemy response to our NFT format
        const fetchedNFTs: UserNFT[] =
          data.ownedNfts?.map((nft: any) => ({
            contract: {
              address: nft.contract.address,
              name: nft.contract.name,
              symbol: nft.contract.symbol,
              tokenType: mapTokenType(nft.contract.tokenType),
            },
            tokenId: nft.tokenId,
            balance: nft.balance, // For ERC1155
            metadata: nft.metadata
              ? {
                  name: nft.metadata.name,
                  description: nft.metadata.description,
                  image: nft.metadata.image,
                  external_url: nft.metadata.external_url,
                }
              : undefined,
            tokenUri: nft.tokenUri?.raw,
            timeLastUpdated: nft.timeLastUpdated,
          })) || [];

        if (isLoadMore) {
          setNfts((prev) => [...prev, ...fetchedNFTs]);
        } else {
          setNfts(fetchedNFTs);
        }

        // Update pagination
        setPageKey(data.pageKey);
        setHasMore(!!data.pageKey);

        // Group NFTs by collection
        const collectionsMap = new Map<string, NFTCollection>();

        const allNFTs = isLoadMore ? [...nfts, ...fetchedNFTs] : fetchedNFTs;

        allNFTs.forEach((nft) => {
          const key = nft.contract.address.toLowerCase();
          if (!collectionsMap.has(key)) {
            collectionsMap.set(key, {
              contractAddress: nft.contract.address,
              name: nft.contract.name,
              symbol: nft.contract.symbol,
              tokenType: nft.contract.tokenType,
              nfts: [],
            });
          }
          collectionsMap.get(key)?.nfts.push(nft);
        });

        setCollections(Array.from(collectionsMap.values()));
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
      } finally {
        setIsLoading(false);
      }
    },
    [
      address,
      alchemyId,
      alchemyNetwork,
      contractAddresses,
      withMetadata,
      pageSize,
      pageKey,
      nfts,
    ]
  );

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchNFTs(true);
    }
  }, [hasMore, isLoading, fetchNFTs]);

  const refetch = useCallback(() => {
    setPageKey(undefined);
    setHasMore(true);
    fetchNFTs(false);
  }, [fetchNFTs]);

  // Fetch NFTs on mount or when dependencies change
  useEffect(() => {
    if (enabled && address) {
      refetch();
    }
  }, [enabled, address, refetch]);

  return {
    nfts,
    collections,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}

// Helper function to map Alchemy token types to our format
function mapTokenType(alchemyType: string): 'ERC721' | 'ERC1155' | 'UNKNOWN' {
  switch (alchemyType?.toUpperCase()) {
    case 'ERC721':
      return 'ERC721';
    case 'ERC1155':
      return 'ERC1155';
    default:
      return 'UNKNOWN';
  }
}
