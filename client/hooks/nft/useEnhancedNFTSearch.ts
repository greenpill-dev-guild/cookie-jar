import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { useDebounce } from '@/hooks/app/useDebounce';
import { AlchemyNFTProvider, type EnhancedNFT } from '@/lib/nft/AlchemyProvider';
import { getAlchemyApiKey } from '@/lib/nft/config';
import { Network } from 'alchemy-sdk';

export interface SearchFilters {
  protocols: ('NFT' | 'POAP' | 'HATS' | 'HYPERCERT' | 'UNLOCK')[];
  verified: boolean;
  tokenTypes: ('ERC721' | 'ERC1155')[];
  collections: string[];
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface NFTCollection {
  address: string;
  name: string;
  verified: boolean;
  nftCount: number;
  floorPrice?: number;
}

export interface EnhancedSearchResult {
  userNFTs: EnhancedNFT[];
  searchResults: EnhancedNFT[];
  collections: NFTCollection[];
  totalResults: number;
  isLoading: boolean;
  error: Error | null;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

const defaultFilters: SearchFilters = {
  protocols: ['NFT'],
  verified: false,
  tokenTypes: ['ERC721', 'ERC1155'],
  collections: [],
};

/**
 * Enhanced NFT search hook with user collection and public search
 * 
 * Features:
 * - Debounced search queries
 * - User NFT collection caching
 * - Public NFT search with pagination
 * - Multi-protocol support
 * - Smart result combination and filtering
 */
export function useEnhancedNFTSearch(
  searchQuery: string = '',
  filters: Partial<SearchFilters> = {},
  options: {
    enabled?: boolean;
    userCollectionOnly?: boolean;
  } = {}
): EnhancedSearchResult {
  const { address } = useAccount();
  const chainId = useChainId();
  const { enabled = true, userCollectionOnly = false } = options;
  
  // Merge with default filters
  const mergedFilters: SearchFilters = { ...defaultFilters, ...filters };
  
  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);
  
  // Get network for Alchemy
  const getAlchemyNetwork = (chainId: number): Network => {
    switch (chainId) {
      case 1: return Network.ETH_MAINNET;
      case 11155111: return Network.ETH_SEPOLIA;
      case 8453: return Network.BASE_MAINNET;
      case 84532: return Network.BASE_SEPOLIA;
      case 10: return Network.OPT_MAINNET;
      case 42161: return Network.ARB_MAINNET;
      default: return Network.ETH_MAINNET;
    }
  };

  // User's NFT collection query (cached for 5 minutes)
  const userNFTsQuery = useQuery({
    queryKey: ['userNFTs', address, chainId, mergedFilters.collections],
    queryFn: async () => {
      if (!address) return [];
      
      try {
        const apiKey = getAlchemyApiKey('mainnet');
        const network = getAlchemyNetwork(chainId);
        const provider = new AlchemyNFTProvider(apiKey, network);
        
        const contractAddresses = mergedFilters.collections.length > 0 
          ? mergedFilters.collections 
          : undefined;
          
        return await provider.getUserNFTs(address, contractAddresses);
      } catch (error) {
        console.error('Error fetching user NFTs:', error);
        return [];
      }
    },
    enabled: enabled && !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Public search query with infinite pagination
  const searchQuery_infinite = useInfiniteQuery({
    queryKey: ['nftSearch', debouncedQuery, mergedFilters, chainId],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { nfts: [], hasNextPage: false, totalResults: 0 };
      }
      
      try {
        const apiKey = getAlchemyApiKey('mainnet');
        const network = getAlchemyNetwork(chainId);
        const provider = new AlchemyNFTProvider(apiKey, network);
        
        // Use searchNFTs method from AlchemyProvider
        const results = await provider.searchNFTs(debouncedQuery);
        
        // Apply pagination
        const pageSize = 20;
        const startIndex = pageParam * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = results.slice(startIndex, endIndex);
        
        return {
          nfts: paginatedResults,
          hasNextPage: results.length > endIndex,
          totalResults: results.length,
        };
      } catch (error) {
        console.error('Error searching NFTs:', error);
        return { nfts: [], hasNextPage: false, totalResults: 0 };
      }
    },
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasNextPage ? pages.length : undefined,
    enabled: enabled && !userCollectionOnly && debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine and process results
  const combinedResults = useMemo((): EnhancedSearchResult => {
    const userNFTs = userNFTsQuery.data || [];
    const searchPages = searchQuery_infinite.data?.pages || [];
    const searchNFTs = searchPages.flatMap(page => page.nfts);
    const totalSearchResults = searchPages[0]?.totalResults || 0;

    // Filter user NFTs by search query if provided
    const filteredUserNFTs = debouncedQuery.length > 0 
      ? userNFTs.filter(nft => {
          const query = debouncedQuery.toLowerCase();
          return (
            nft.name?.toLowerCase().includes(query) ||
            nft.collection.name?.toLowerCase().includes(query) ||
            nft.contractAddress.toLowerCase().includes(query) ||
            nft.tokenId.includes(debouncedQuery) ||
            nft.traits?.some(trait => 
              trait.trait_type.toLowerCase().includes(query) ||
              String(trait.value).toLowerCase().includes(query)
            )
          );
        })
      : userNFTs;

    // Apply additional filters
    const applyFilters = (nfts: EnhancedNFT[]): EnhancedNFT[] => {
      return nfts.filter(nft => {
        // Token type filter
        if (!mergedFilters.tokenTypes.includes(nft.tokenType)) {
          return false;
        }

        // Verified filter
        if (mergedFilters.verified && !nft.collection.verified) {
          return false;
        }

        // Price range filter
        if (mergedFilters.priceRange && nft.collection.floorPrice) {
          const price = nft.collection.floorPrice.value;
          if (price < mergedFilters.priceRange.min || price > mergedFilters.priceRange.max) {
            return false;
          }
        }

        return true;
      });
    };

    const finalUserNFTs = applyFilters(filteredUserNFTs);
    const finalSearchNFTs = applyFilters(searchNFTs);

    // Create collections map
    const collectionsMap = new Map<string, NFTCollection>();
    
    [...finalUserNFTs, ...finalSearchNFTs].forEach(nft => {
      const key = nft.collection.address;
      if (!collectionsMap.has(key)) {
        collectionsMap.set(key, {
          address: nft.collection.address,
          name: nft.collection.name || 'Unknown Collection',
          verified: nft.collection.verified || false,
          nftCount: 0,
          floorPrice: nft.collection.floorPrice?.value,
        });
      }
      const collection = collectionsMap.get(key)!;
      collection.nftCount++;
    });

    return {
      userNFTs: finalUserNFTs,
      searchResults: finalSearchNFTs,
      collections: Array.from(collectionsMap.values()),
      totalResults: finalUserNFTs.length + totalSearchResults,
      isLoading: userNFTsQuery.isLoading || searchQuery_infinite.isLoading,
      error: userNFTsQuery.error || searchQuery_infinite.error,
      hasNextPage: searchQuery_infinite.hasNextPage,
      fetchNextPage: searchQuery_infinite.fetchNextPage,
      isFetchingNextPage: searchQuery_infinite.isFetchingNextPage,
    };
  }, [
    userNFTsQuery.data,
    userNFTsQuery.isLoading,
    userNFTsQuery.error,
    searchQuery_infinite.data,
    searchQuery_infinite.isLoading,
    searchQuery_infinite.error,
    searchQuery_infinite.hasNextPage,
    searchQuery_infinite.fetchNextPage,
    searchQuery_infinite.isFetchingNextPage,
    debouncedQuery,
    mergedFilters,
  ]);

  return combinedResults;
}

/**
 * Simplified hook for just user NFTs with search
 */
export function useUserNFTsWithSearch(
  searchQuery: string = '',
  contractAddresses: string[] = []
) {
  return useEnhancedNFTSearch(
    searchQuery,
    { collections: contractAddresses },
    { userCollectionOnly: true }
  );
}
