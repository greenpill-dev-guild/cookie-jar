import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import React from 'react';
import config from '../../../config/wagmi.config';
import { useAdvancedNFTSearch } from '../../../hooks/nft/useAdvancedNFTSearch';
import { AdvancedNFTFilters, NFTWithTraits } from '../../../lib/nft/advanced/TraitFilterSystem';

// Mock the Alchemy provider
vi.mock('../../../lib/nft/AlchemyProvider', () => ({
  AlchemyNFTProvider: vi.fn().mockImplementation(() => ({
    searchNFTs: vi.fn(),
    getNFTsForOwner: vi.fn(),
  })),
  getAlchemyApiKey: vi.fn().mockReturnValue('mock-api-key'),
  getAlchemyNetwork: vi.fn().mockReturnValue('eth-mainnet'),
}));

// Mock floor price provider
vi.mock('../../../lib/nft/advanced/FloorPriceProvider', () => ({
  floorPriceProvider: {
    getBatchFloorPrices: vi.fn().mockResolvedValue(new Map()),
  },
}));

// Mock trait filter system
vi.mock('../../../lib/nft/advanced/TraitFilterSystem', () => ({
  traitFilterSystem: {
    applyFilters: vi.fn((nfts) => nfts),
    buildSmartFilters: vi.fn(() => ({ traits: [] })),
    getTraitSuggestions: vi.fn(() => []),
    generateTraitStatistics: vi.fn(() => []),
  },
}));

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: vi.fn(() => ({ 
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true 
    })),
    useChainId: vi.fn(() => 1),
  };
});

// Mock useDebounce
vi.mock('../../../hooks/app/useDebounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

const mockNFTs: NFTWithTraits[] = [
  {
    id: '0x123-1',
    tokenId: '1',
    name: 'Test NFT 1',
    description: 'A test NFT',
    image: 'https://example.com/nft1.png',
    contractAddress: '0x123',
    attributes: [
      { trait_type: 'Color', value: 'Blue' },
      { trait_type: 'Rarity', value: 'Common' },
    ],
    collection_name: 'Test Collection',
    rarity_rank: 100,
    rarity_score: 5.5,
    collection_size: 1000,
    floor_price: 0.5,
  },
  {
    id: '0x123-2',
    tokenId: '2',
    name: 'Test NFT 2',
    description: 'Another test NFT',
    image: 'https://example.com/nft2.png',
    contractAddress: '0x123',
    attributes: [
      { trait_type: 'Color', value: 'Red' },
      { trait_type: 'Rarity', value: 'Rare' },
    ],
    collection_name: 'Test Collection',
    rarity_rank: 10,
    rarity_score: 25.0,
    collection_size: 1000,
    floor_price: 2.5,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      WagmiProvider,
      { config: config as any },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };
};

describe('useAdvancedNFTSearch', () => {
  let mockAlchemyProvider: any;

  beforeEach(() => {
    const { AlchemyNFTProvider } = require('../../../lib/nft/AlchemyProvider');
    mockAlchemyProvider = new AlchemyNFTProvider();
    mockAlchemyProvider.searchNFTs.mockResolvedValue([
      {
        contractAddress: '0x123',
        tokenId: '1',
        name: 'Test NFT 1',
        description: 'A test NFT',
        imageUrl: 'https://example.com/nft1.png',
        attributes: [
          { trait_type: 'Color', value: 'Blue' },
          { trait_type: 'Rarity', value: 'Common' },
        ],
        collection: { name: 'Test Collection' },
        media: [{ gateway: 'https://example.com/nft1.png' }],
      },
    ]);
    mockAlchemyProvider.getNFTsForOwner.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.searchResults).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentQuery).toBe('');
      expect(result.current.currentFilters).toEqual({ traits: [] });
      expect(result.current.totalResults).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    it('should accept custom options', () => {
      const { result } = renderHook(
        () => useAdvancedNFTSearch({
          enabled: false,
          pageSize: 10,
          enablePriceData: false,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.searchResults).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('search functionality', () => {
    it('should perform search with query', async () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test nft');

      await waitFor(() => {
        expect(result.current.currentQuery).toBe('test nft');
      });

      // Verify that search was called
      expect(mockAlchemyProvider.searchNFTs).toHaveBeenCalledWith('test nft');
    });

    it('should handle search with filters', async () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      const filters: AdvancedNFTFilters = {
        traits: [{ trait_type: 'Color', values: ['Blue'], operator: 'in' }],
        price_range: { min: 0.1, max: 1.0 },
      };

      result.current.search('test', filters);

      await waitFor(() => {
        expect(result.current.currentQuery).toBe('test');
        expect(result.current.currentFilters).toEqual(filters);
      });
    });

    it('should update filters independently', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      const newFilters: AdvancedNFTFilters = {
        traits: [{ trait_type: 'Rarity', values: ['Rare'], operator: 'in' }],
      };

      result.current.updateFilters(newFilters);

      expect(result.current.currentFilters).toEqual(newFilters);
    });

    it('should clear search and filters', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      // Set some initial state
      result.current.search('test query', { traits: [{ trait_type: 'Color', values: ['Blue'], operator: 'in' }] });
      
      // Clear search
      result.current.clearSearch();

      expect(result.current.currentQuery).toBe('');
      expect(result.current.currentFilters).toEqual({ traits: [] });
    });
  });

  describe('smart filters', () => {
    it('should apply smart filter for rarest NFTs', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.applySmartFilter('rarest');

      const { traitFilterSystem } = require('../../../lib/nft/advanced/TraitFilterSystem');
      expect(traitFilterSystem.buildSmartFilters).toHaveBeenCalledWith([], 'rarest');
    });

    it('should apply smart filter for cheapest NFTs', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.applySmartFilter('cheapest');

      const { traitFilterSystem } = require('../../../lib/nft/advanced/TraitFilterSystem');
      expect(traitFilterSystem.buildSmartFilters).toHaveBeenCalledWith([], 'cheapest');
    });

    it('should get suggestions based on current results', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      const suggestions = result.current.getSuggestions();

      const { traitFilterSystem } = require('../../../lib/nft/advanced/TraitFilterSystem');
      expect(traitFilterSystem.getTraitSuggestions).toHaveBeenCalled();
    });
  });

  describe('user NFTs', () => {
    it('should fetch user NFTs when address is available', async () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userNFTs).toEqual([]);
        expect(result.current.isLoadingUserNFTs).toBe(false);
      });

      expect(mockAlchemyProvider.getNFTsForOwner).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890'
      );
    });

    it('should handle user NFTs fetch error', async () => {
      mockAlchemyProvider.getNFTsForOwner.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userNFTsError).toContain('API Error');
      });
    });
  });

  describe('insights generation', () => {
    it('should generate insights when results are available', async () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test');

      await waitFor(() => {
        expect(result.current.insights).toBeDefined();
      });
    });

    it('should handle insights generation error', async () => {
      const { traitFilterSystem } = require('../../../lib/nft/advanced/TraitFilterSystem');
      traitFilterSystem.generateTraitStatistics.mockImplementation(() => {
        throw new Error('Insights error');
      });

      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test');

      // Should not crash and should handle error gracefully
      await waitFor(() => {
        expect(result.current.isLoadingInsights).toBe(false);
      });
    });
  });

  describe('pagination and infinite scroll', () => {
    it('should support loading more results', async () => {
      mockAlchemyProvider.searchNFTs.mockResolvedValue(Array(25).fill(null).map((_, i) => ({
        contractAddress: '0x123',
        tokenId: String(i + 1),
        name: `Test NFT ${i + 1}`,
        imageUrl: `https://example.com/nft${i + 1}.png`,
        attributes: [],
        collection: { name: 'Test Collection' },
      })));

      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test');

      await waitFor(() => {
        expect(result.current.searchResults?.nfts.length).toBe(20); // First page
        expect(result.current.hasMore).toBe(true);
      });

      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.searchResults?.nfts.length).toBe(25); // All results
        expect(result.current.hasMore).toBe(false);
      });
    });

    it('should handle pagination with filters', async () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test', {
        traits: [{ trait_type: 'Color', values: ['Blue'], operator: 'in' }],
      });

      await waitFor(() => {
        expect(result.current.searchResults).toBeDefined();
      });

      const { traitFilterSystem } = require('../../../lib/nft/advanced/TraitFilterSystem');
      expect(traitFilterSystem.applyFilters).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle search API errors', async () => {
      mockAlchemyProvider.searchNFTs.mockRejectedValue(new Error('Search API Error'));

      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test');

      await waitFor(() => {
        expect(result.current.error).toContain('Search API Error');
      });
    });

    it('should handle missing Alchemy provider', () => {
      const { getAlchemyApiKey } = require('../../../lib/nft/AlchemyProvider');
      getAlchemyApiKey.mockImplementation(() => {
        throw new Error('No API key');
      });

      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.searchResults).toBeNull();
      expect(result.current.error).toBeNull(); // Should fail gracefully
    });
  });

  describe('refetch functionality', () => {
    it('should refetch all data when requested', async () => {
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test');

      await waitFor(() => {
        expect(result.current.searchResults).toBeDefined();
      });

      // Clear mocks and refetch
      vi.clearAllMocks();
      result.current.refetch();

      await waitFor(() => {
        expect(mockAlchemyProvider.searchNFTs).toHaveBeenCalled();
        expect(mockAlchemyProvider.getNFTsForOwner).toHaveBeenCalled();
      });
    });
  });

  describe('performance considerations', () => {
    it('should debounce search queries', async () => {
      const { useDebounce } = require('../../../hooks/app/useDebounce');
      
      const { result } = renderHook(() => useAdvancedNFTSearch(), {
        wrapper: createWrapper(),
      });

      result.current.search('test query');

      expect(useDebounce).toHaveBeenCalledWith('test query', 300);
    });

    it('should cache results appropriately', () => {
      const { result } = renderHook(() => useAdvancedNFTSearch({
        cacheTime: 10000,
        staleTime: 5000,
      }), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      // Cache configuration is tested through React Query behavior
    });
  });
});
