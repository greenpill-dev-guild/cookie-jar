import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/app/useDebounce';
import { 
  AdvancedNFTFilters, 
  NFTWithTraits, 
  TraitStatistics,
  traitFilterSystem 
} from '@/lib/nft/advanced/TraitFilterSystem';
import { 
  FloorPriceData, 
  CollectionStats,
  floorPriceProvider 
} from '@/lib/nft/advanced/FloorPriceProvider';
import { AlchemyNFTProvider, EnhancedNFT } from '@/lib/nft/AlchemyProvider';

export interface AdvancedSearchResult {
  nfts: NFTWithTraits[];
  totalResults: number;
  hasNextPage: boolean;
  nextPageParam?: string;
  isFiltered: boolean;
  appliedFilters: AdvancedNFTFilters;
  suggestions?: Array<{
    trait_type: string;
    suggested_values: Array<{
      value: string | number;
      count: number;
      would_filter_to: number;
    }>;
  }>;
}

export interface CollectionInsights {
  traitStatistics: TraitStatistics[];
  rarityDistribution: {
    legendary: number;
    epic: number;
    rare: number;
    uncommon: number;
    common: number;
  };
  priceAnalysis: {
    floor: number;
    average: number;
    volume24h: number;
    change24h: number;
  };
  recommendations: {
    bestValue: NFTWithTraits[];
    trending: NFTWithTraits[];
    undervalued: NFTWithTraits[];
  };
}

export interface UseAdvancedNFTSearchOptions {
  enabled?: boolean;
  pageSize?: number;
  enablePriceData?: boolean;
  enableInsights?: boolean;
  cacheTime?: number;
  staleTime?: number;
}

export interface UseAdvancedNFTSearchResult {
  // Search Results
  searchResults: AdvancedSearchResult | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  isFetching: boolean;
  error: string | null;

  // User's NFTs
  userNFTs: NFTWithTraits[];
  isLoadingUserNFTs: boolean;
  userNFTsError: string | null;

  // Floor Price Data
  floorPrices: Map<string, FloorPriceData>;
  isLoadingPrices: boolean;

  // Collection Insights
  insights: CollectionInsights | null;
  isLoadingInsights: boolean;

  // Search Functions
  search: (query: string, filters?: AdvancedNFTFilters) => void;
  updateFilters: (filters: AdvancedNFTFilters) => void;
  clearSearch: () => void;
  loadMore: () => void;
  refetch: () => void;

  // Filter Helpers
  applySmartFilter: (intent: 'rarest' | 'cheapest' | 'balanced' | 'trending') => void;
  getSuggestions: () => Array<{
    trait_type: string;
    suggested_values: Array<{
      value: string | number;
      count: number;
      would_filter_to: number;
    }>;
  }>;
  
  // Current State
  currentQuery: string;
  currentFilters: AdvancedNFTFilters;
  totalResults: number;
  hasMore: boolean;
}

export function useAdvancedNFTSearch(
  options: UseAdvancedNFTSearchOptions = {}
): UseAdvancedNFTSearchResult {
  const {
    enabled = true,
    pageSize = 20,
    enablePriceData = true,
    enableInsights = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 2 * 60 * 1000, // 2 minutes
  } = options;

  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // State
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<AdvancedNFTFilters>({ traits: [] });
  const [floorPrices, setFloorPrices] = useState<Map<string, FloorPriceData>>(new Map());

  const debouncedQuery = useDebounce(query, 300);

  // Get Alchemy provider
  const alchemyProvider = useMemo(() => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!apiKey) {
        console.warn('Alchemy API key not found');
        return null;
      }
      return new AlchemyNFTProvider(apiKey);
    } catch (error) {
      console.error('Failed to initialize Alchemy provider:', error);
      return null;
    }
  }, []);

  // Search NFTs with infinite scroll
  const searchQuery = useInfiniteQuery({
    queryKey: ['advanced-nft-search', debouncedQuery, filters, chainId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!alchemyProvider || (!debouncedQuery && filters.traits.length === 0)) {
        return { 
          nfts: [], 
          totalResults: 0, 
          hasNextPage: false,
          nextPageParam: undefined,
          isFiltered: false,
          appliedFilters: filters,
        };
      }

      try {
        // Get base NFT data
        let nfts: NFTWithTraits[] = [];
        let hasNextPage = false;
        let totalResults = 0;

        if (debouncedQuery) {
          // Search by query
          const searchResults = await alchemyProvider.searchNFTs(debouncedQuery);
          nfts = searchResults.map((nft: EnhancedNFT): NFTWithTraits => ({
            id: `${nft.contractAddress}-${nft.tokenId}`,
            tokenId: nft.tokenId,
            name: nft.name || `#${nft.tokenId}`,
            description: nft.description,
            image: nft.image || '',
            contractAddress: nft.contractAddress,
            attributes: nft.traits?.map((attr: any) => ({
              trait_type: attr.trait_type || 'Unknown',
              value: attr.value || 'Unknown',
              display_type: undefined,
            })) || [],
            collection_name: nft.collection?.name,
          }));
          totalResults = nfts.length;
        } else {
          // Get trending/popular NFTs as base
          // This would typically come from a curated list or trending API
          nfts = [];
          totalResults = 0;
        }

        // Apply advanced filters
        let filteredNFTs = nfts;
        const isFiltered = Boolean(
          filters.traits.length > 0 || 
          filters.rarity_rank || 
          filters.price_range ||
          filters.has_traits?.length ||
          filters.exclude_traits?.length
        );

        if (isFiltered) {
          filteredNFTs = traitFilterSystem.applyFilters(nfts, filters);
        }

        // Apply pagination
        const startIndex = pageParam * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedNFTs = filteredNFTs.slice(startIndex, endIndex);
        
        return {
          nfts: paginatedNFTs,
          totalResults: filteredNFTs.length,
          hasNextPage: endIndex < filteredNFTs.length,
          nextPageParam: endIndex < filteredNFTs.length ? pageParam + 1 : undefined,
          isFiltered,
          appliedFilters: filters,
          suggestions: isFiltered ? traitFilterSystem.getTraitSuggestions(nfts, filters) : undefined,
        };
      } catch (error) {
        console.error('Search error:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    enabled: enabled && !!alchemyProvider,
    gcTime: cacheTime,
    staleTime,
    initialPageParam: 0,
  });

  // Get user's NFTs
  const userNFTsQuery = useQuery({
    queryKey: ['user-nfts-advanced', userAddress, chainId],
    queryFn: async () => {
      if (!alchemyProvider || !userAddress) return [];

      try {
        const userNFTs = await alchemyProvider.getUserNFTs(userAddress);
        return userNFTs.map((nft: EnhancedNFT): NFTWithTraits => ({
          id: `${nft.contractAddress}-${nft.tokenId}`,
          tokenId: nft.tokenId,
          name: nft.name || `#${nft.tokenId}`,
          description: nft.description,
          image: nft.image || '',
          contractAddress: nft.contractAddress,
          attributes: nft.traits?.map((attr: any) => ({
            trait_type: attr.trait_type || 'Unknown',
            value: attr.value || 'Unknown',
            display_type: undefined,
          })) || [],
          collection_name: nft.collection?.name,
        }));
      } catch (error) {
        console.error('Error fetching user NFTs:', error);
        throw error;
      }
    },
    enabled: enabled && !!alchemyProvider && !!userAddress,
    gcTime: cacheTime,
    staleTime,
  });

  // Get floor prices for collections
  const collectionsWithNFTs = useMemo(() => {
    const collections = new Set<string>();
    
    // Add collections from search results
    searchQuery.data?.pages.forEach(page => {
      page.nfts.forEach(nft => {
        if (nft.contractAddress) {
          collections.add(nft.contractAddress);
        }
      });
    });

    // Add collections from user NFTs
    userNFTsQuery.data?.forEach((nft: NFTWithTraits) => {
      if (nft.contractAddress) {
        collections.add(nft.contractAddress);
      }
    });

    return Array.from(collections);
  }, [searchQuery.data, userNFTsQuery.data]);

  // Fetch floor prices
  useEffect(() => {
    if (!enablePriceData || collectionsWithNFTs.length === 0) return;

    const fetchFloorPrices = async () => {
      try {
        const prices = await floorPriceProvider.getBatchFloorPrices(collectionsWithNFTs, chainId);
        setFloorPrices(prices);
      } catch (error) {
        console.error('Error fetching floor prices:', error);
      }
    };

    fetchFloorPrices();
  }, [collectionsWithNFTs, chainId, enablePriceData]);

  // Generate insights
  const insightsQuery = useQuery({
    queryKey: ['nft-insights', searchQuery.data?.pages, filters],
    queryFn: async () => {
      const allNFTs = searchQuery.data?.pages.flatMap(page => page.nfts) || [];
      if (allNFTs.length === 0) return null;

      // Generate trait statistics
      const traitStatistics = traitFilterSystem.generateTraitStatistics(allNFTs);

      // Calculate rarity distribution
      const rarityDistribution = {
        legendary: allNFTs.filter(nft => nft.rarity_rank && nft.collection_size && (nft.rarity_rank / nft.collection_size) <= 0.01).length,
        epic: allNFTs.filter(nft => nft.rarity_rank && nft.collection_size && (nft.rarity_rank / nft.collection_size) <= 0.05).length,
        rare: allNFTs.filter(nft => nft.rarity_rank && nft.collection_size && (nft.rarity_rank / nft.collection_size) <= 0.15).length,
        uncommon: allNFTs.filter(nft => nft.rarity_rank && nft.collection_size && (nft.rarity_rank / nft.collection_size) <= 0.40).length,
        common: allNFTs.filter(nft => !nft.rarity_rank || !nft.collection_size || (nft.rarity_rank / nft.collection_size) > 0.40).length,
      };

      // Calculate price analysis
      const prices = allNFTs.map(nft => nft.floor_price || 0).filter(p => p > 0);
      const priceAnalysis = {
        floor: Math.min(...prices) || 0,
        average: prices.reduce((sum, price) => sum + price, 0) / prices.length || 0,
        volume24h: 0, // Would come from aggregated data
        change24h: 0, // Would come from aggregated data
      };

      // Generate recommendations
      const bestValue = allNFTs
        .filter(nft => nft.floor_price && nft.rarity_rank)
        .sort((a, b) => (a.floor_price! / (a.rarity_rank! || 1)) - (b.floor_price! / (b.rarity_rank! || 1)))
        .slice(0, 5);

      const trending = allNFTs
        .filter(nft => nft.last_sale_price)
        .sort((a, b) => (b.last_sale_price || 0) - (a.last_sale_price || 0))
        .slice(0, 5);

      const undervalued = allNFTs
        .filter(nft => nft.floor_price && nft.rarity_score)
        .sort((a, b) => (b.rarity_score! / (a.floor_price! || 1)) - (a.rarity_score! / (b.floor_price! || 1)))
        .slice(0, 5);

      const insights: CollectionInsights = {
        traitStatistics,
        rarityDistribution,
        priceAnalysis,
        recommendations: {
          bestValue,
          trending,
          undervalued,
        },
      };

      return insights;
    },
    enabled: enableInsights && !!searchQuery.data?.pages.length,
    gcTime: cacheTime * 2, // Cache insights longer
    staleTime: staleTime * 2,
  });

  // Search function
  const search = useCallback((newQuery: string, newFilters?: AdvancedNFTFilters) => {
    setQuery(newQuery);
    if (newFilters) {
      setFilters(newFilters);
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: AdvancedNFTFilters) => {
    setFilters(newFilters);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({ traits: [] });
  }, []);

  // Load more results
  const loadMore = useCallback(() => {
    if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
      searchQuery.fetchNextPage();
    }
  }, [searchQuery]);

  // Apply smart filter
  const applySmartFilter = useCallback((intent: 'rarest' | 'cheapest' | 'balanced' | 'trending') => {
    const allNFTs = searchQuery.data?.pages.flatMap(page => page.nfts) || [];
    const smartFilters = traitFilterSystem.buildSmartFilters(allNFTs, intent);
    setFilters(smartFilters);
  }, [searchQuery.data]);

  // Get suggestions
  const getSuggestions = useCallback(() => {
    const allNFTs = searchQuery.data?.pages.flatMap(page => page.nfts) || [];
    return traitFilterSystem.getTraitSuggestions(allNFTs, filters);
  }, [searchQuery.data, filters]);

  // Aggregate results
  const searchResults = useMemo(() => {
    if (!searchQuery.data?.pages.length) return null;

    const allNFTs = searchQuery.data.pages.flatMap(page => page.nfts);
    const firstPage = searchQuery.data.pages[0];

    return {
      nfts: allNFTs,
      totalResults: firstPage.totalResults,
      hasNextPage: !!searchQuery.hasNextPage,
      nextPageParam: searchQuery.hasNextPage ? 'next' : undefined,
      isFiltered: firstPage.isFiltered,
      appliedFilters: firstPage.appliedFilters,
      suggestions: firstPage.suggestions,
    };
  }, [searchQuery.data, searchQuery.hasNextPage]);

  return {
    // Search Results
    searchResults,
    isLoading: searchQuery.isLoading,
    isLoadingMore: searchQuery.isFetchingNextPage,
    isFetching: searchQuery.isFetching,
    error: searchQuery.error?.message || null,

    // User's NFTs
    userNFTs: userNFTsQuery.data || [],
    isLoadingUserNFTs: userNFTsQuery.isLoading,
    userNFTsError: userNFTsQuery.error?.message || null,

    // Floor Price Data
    floorPrices,
    isLoadingPrices: false, // Floor prices load in background

    // Collection Insights
    insights: insightsQuery.data || null,
    isLoadingInsights: insightsQuery.isLoading,

    // Search Functions
    search,
    updateFilters,
    clearSearch,
    loadMore,
    refetch: () => {
      searchQuery.refetch();
      userNFTsQuery.refetch();
      insightsQuery.refetch();
    },

    // Filter Helpers
    applySmartFilter,
    getSuggestions,

    // Current State
    currentQuery: query,
    currentFilters: filters,
    totalResults: searchResults?.totalResults || 0,
    hasMore: searchResults?.hasNextPage || false,
  };
}
