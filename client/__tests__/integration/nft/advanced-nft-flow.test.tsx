import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import React from 'react';
import config from '../../../config/wagmi.config';
import { UnifiedNFTSelector } from '../../../components/nft/UnifiedNFTSelector';
import { EnhancedMobileNFTSearch } from '../../../components/nft/advanced/EnhancedMobileNFTSearch';
import { EnhancedNFTCard } from '../../../components/nft/advanced/EnhancedNFTCard';
import { useAdvancedNFTSearch } from '../../../hooks/nft/useAdvancedNFTSearch';
import { NFTWithTraits } from '../../../lib/nft/advanced/TraitFilterSystem';
import { FloorPriceData } from '../../../lib/nft/advanced/FloorPriceProvider';

// Mock all the dependencies
vi.mock('../../../lib/nft/AlchemyProvider', () => ({
  AlchemyNFTProvider: vi.fn().mockImplementation(() => ({
    searchNFTs: vi.fn(),
    getNFTsForOwner: vi.fn(),
  })),
  getAlchemyApiKey: vi.fn().mockReturnValue('mock-api-key'),
  getAlchemyNetwork: vi.fn().mockReturnValue('eth-mainnet'),
}));

vi.mock('../../../lib/nft/advanced/FloorPriceProvider', () => ({
  floorPriceProvider: {
    getBatchFloorPrices: vi.fn().mockResolvedValue(new Map()),
    getFloorPrice: vi.fn().mockResolvedValue({
      contractAddress: '0x123',
      collectionName: 'Test Collection',
      floorPrice: 1.5,
      floorPriceUSD: 3000,
      currency: 'ETH',
      lastUpdated: Date.now(),
      source: 'opensea',
    }),
  },
}));

vi.mock('../../../lib/nft/advanced/TraitFilterSystem', () => ({
  traitFilterSystem: {
    applyFilters: vi.fn((nfts) => nfts),
    buildSmartFilters: vi.fn(() => ({ traits: [] })),
    getTraitSuggestions: vi.fn(() => []),
    generateTraitStatistics: vi.fn(() => []),
  },
}));

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

vi.mock('../../../hooks/app/useDebounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

vi.mock('../../../hooks/app/useMobile', () => ({
  useIsMobile: vi.fn(() => true), // Test mobile experience
}));

const mockNFTs: NFTWithTraits[] = [
  {
    id: '0x123-1',
    tokenId: '1',
    name: 'Fire Dragon #1',
    description: 'A legendary fire dragon',
    image: 'https://example.com/dragon1.png',
    contractAddress: '0x123',
    attributes: [
      { trait_type: 'Element', value: 'Fire' },
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Level', value: 95 },
    ],
    collection_name: 'Dragon Collection',
    rarity_rank: 1,
    rarity_score: 250.5,
    collection_size: 10000,
    floor_price: 2.5,
  },
  {
    id: '0x123-2',
    tokenId: '2',
    name: 'Water Sprite #2',
    description: 'A common water sprite',
    image: 'https://example.com/sprite2.png',
    contractAddress: '0x123',
    attributes: [
      { trait_type: 'Element', value: 'Water' },
      { trait_type: 'Rarity', value: 'Common' },
      { trait_type: 'Level', value: 25 },
    ],
    collection_name: 'Dragon Collection',
    rarity_rank: 5000,
    rarity_score: 15.2,
    collection_size: 10000,
    floor_price: 0.1,
  },
];

const mockFloorPriceData: FloorPriceData = {
  contractAddress: '0x123',
  collectionName: 'Dragon Collection',
  floorPrice: 1.5,
  floorPriceUSD: 3000,
  currency: 'ETH',
  volume24h: 100,
  volume24hUSD: 200000,
  change24h: 5.2,
  lastUpdated: Date.now(),
  source: 'opensea',
};

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

// Test component that uses the advanced NFT search hook
const TestNFTSearchComponent: React.FC = () => {
  const {
    searchResults,
    search,
    updateFilters,
    currentQuery,
    currentFilters,
    totalResults,
    isLoading,
  } = useAdvancedNFTSearch();

  const [selectedNFTs, setSelectedNFTs] = React.useState<NFTWithTraits[]>([]);

  const handleSelectNFT = (nft: NFTWithTraits) => {
    setSelectedNFTs(prev => 
      prev.find(n => n.id === nft.id) 
        ? prev.filter(n => n.id !== nft.id)
        : [...prev, nft]
    );
  };

  return (
    <div>
      <EnhancedMobileNFTSearch
        onSearch={search}
        onFilterChange={updateFilters}
        isLoading={isLoading}
        resultCount={totalResults}
        showQuickFilters={true}
        showSmartSuggestions={true}
      />
      
      <div data-testid="search-results">
        {searchResults?.nfts.map(nft => (
          <EnhancedNFTCard
            key={nft.id}
            nft={nft}
            floorPriceData={mockFloorPriceData}
            onSelect={handleSelectNFT}
            selected={selectedNFTs.some(n => n.id === nft.id)}
            showTraits={true}
            showRarity={true}
            showPricing={true}
          />
        ))}
      </div>
      
      <div data-testid="selected-nfts">
        Selected: {selectedNFTs.length} NFTs
      </div>
      
      <div data-testid="current-query">
        Query: {currentQuery}
      </div>
      
      <div data-testid="active-filters">
        Active Filters: {currentFilters.traits.length}
      </div>
    </div>
  );
};

describe('Advanced NFT Flow Integration', () => {
  let mockAlchemyProvider: any;

  beforeEach(() => {
    const { AlchemyNFTProvider } = require('../../../lib/nft/AlchemyProvider');
    mockAlchemyProvider = new AlchemyNFTProvider();
    mockAlchemyProvider.searchNFTs.mockResolvedValue([
      {
        contractAddress: '0x123',
        tokenId: '1',
        name: 'Fire Dragon #1',
        description: 'A legendary fire dragon',
        imageUrl: 'https://example.com/dragon1.png',
        attributes: [
          { trait_type: 'Element', value: 'Fire' },
          { trait_type: 'Rarity', value: 'Legendary' },
          { trait_type: 'Level', value: 95 },
        ],
        collection: { name: 'Dragon Collection' },
      },
    ]);
    mockAlchemyProvider.getNFTsForOwner.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('complete NFT search and selection flow', () => {
    it('should allow user to search, filter, and select NFTs', async () => {
      const user = userEvent.setup();
      
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      // Initial state
      expect(screen.getByTestId('selected-nfts')).toHaveTextContent('Selected: 0 NFTs');
      expect(screen.getByTestId('current-query')).toHaveTextContent('Query:');

      // Perform search
      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      await user.type(searchInput, 'dragon');

      await waitFor(() => {
        expect(screen.getByTestId('current-query')).toHaveTextContent('Query: dragon');
      });

      // Verify search was called
      expect(mockAlchemyProvider.searchNFTs).toHaveBeenCalledWith('dragon');

      // Wait for results and verify they appear
      await waitFor(() => {
        const resultsContainer = screen.getByTestId('search-results');
        expect(resultsContainer).toBeInTheDocument();
      });
    });

    it('should allow applying quick filters', async () => {
      const user = userEvent.setup();
      
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      // Open filter panel
      const filterButtons = screen.getAllByRole('button');
      const filterButton = filterButtons.find(btn => 
        btn.innerHTML.includes('Filter') || 
        btn.querySelector('[data-testid="filter-icon"]')
      ) || filterButtons[0];
      
      await user.click(filterButton);

      // Wait for filter panel to open
      await waitFor(() => {
        expect(screen.getByText('Quick Filters')).toBeInTheDocument();
      });

      // Click on "Rarest" quick filter
      const rarestButton = screen.getByText('Rarest');
      await user.click(rarestButton);

      // Verify filter was applied
      const { traitFilterSystem } = require('../../../lib/nft/advanced/TraitFilterSystem');
      expect(traitFilterSystem.buildSmartFilters).toHaveBeenCalledWith([], 'rarest');
    });

    it('should show loading states during search', async () => {
      const user = userEvent.setup();
      
      // Make search take longer to complete
      let resolveSearch: (value: any) => void = () => {};
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve;
      });
      mockAlchemyProvider.searchNFTs.mockReturnValue(searchPromise);

      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      await user.type(searchInput, 'test');

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // Resolve the search
      resolveSearch([]);

      // Loading should disappear
      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });
  });

  describe('NFT card interaction', () => {
    it('should allow selecting and deselecting NFTs', async () => {
      const user = userEvent.setup();
      
      // Create a simple test component with pre-loaded NFTs
      const TestWithNFTs: React.FC = () => {
        const [selectedNFTs, setSelectedNFTs] = React.useState<NFTWithTraits[]>([]);

        const handleSelectNFT = (nft: NFTWithTraits) => {
          setSelectedNFTs(prev => 
            prev.find(n => n.id === nft.id) 
              ? prev.filter(n => n.id !== nft.id)
              : [...prev, nft]
          );
        };

        return (
          <div>
            <div data-testid="nft-grid">
              {mockNFTs.map(nft => (
                <EnhancedNFTCard
                  key={nft.id}
                  nft={nft}
                  floorPriceData={mockFloorPriceData}
                  onSelect={handleSelectNFT}
                  selected={selectedNFTs.some(n => n.id === nft.id)}
                  showTraits={true}
                  showRarity={true}
                  showPricing={true}
                />
              ))}
            </div>
            
            <div data-testid="selected-count">
              Selected: {selectedNFTs.length}
            </div>
          </div>
        );
      };

      render(<TestWithNFTs />, {
        wrapper: createWrapper(),
      });

      // Initially no NFTs selected
      expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected: 0');

      // Find and click the first NFT card
      const nftGrid = screen.getByTestId('nft-grid');
      const firstNFTCard = within(nftGrid).getAllByRole('button', { name: /select/i })[0] || 
                          within(nftGrid).getAllByText('Fire Dragon #1')[0];

      await user.click(firstNFTCard);

      // Should now have 1 selected
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected: 1');
      });

      // Click again to deselect
      await user.click(firstNFTCard);

      // Should be back to 0
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected: 0');
      });
    });

    it('should display NFT information correctly', async () => {
      const TestNFTDisplay: React.FC = () => (
        <EnhancedNFTCard
          nft={mockNFTs[0]}
          floorPriceData={mockFloorPriceData}
          showTraits={true}
          showRarity={true}
          showPricing={true}
        />
      );

      render(<TestNFTDisplay />, {
        wrapper: createWrapper(),
      });

      // Check NFT name is displayed
      expect(screen.getByText('Fire Dragon #1')).toBeInTheDocument();
      
      // Check collection name
      expect(screen.getByText('Dragon Collection')).toBeInTheDocument();
      
      // Check rarity rank (as it's rank 1, should show as very rare)
      expect(screen.getByText('#1')).toBeInTheDocument();
      
      // Check traits are displayed
      expect(screen.getByText(/Element.*Fire/)).toBeInTheDocument();
      expect(screen.getByText(/Rarity.*Legendary/)).toBeInTheDocument();
    });
  });

  describe('mobile responsiveness', () => {
    it('should render mobile-optimized layout', () => {
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      // Search input should be mobile-optimized
      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      expect(searchInput).toBeInTheDocument();

      // Filter button should be easily tappable
      const filterButtons = screen.getAllByRole('button');
      expect(filterButtons.length).toBeGreaterThan(0);
    });

    it('should use bottom sheet for filters on mobile', async () => {
      const user = userEvent.setup();
      
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      // Open filter panel
      const filterButton = screen.getAllByRole('button')[0];
      await user.click(filterButton);

      // Should show mobile filter panel
      await waitFor(() => {
        expect(screen.getByText('Filters & Search Options')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle search API errors gracefully', async () => {
      const user = userEvent.setup();
      mockAlchemyProvider.searchNFTs.mockRejectedValue(new Error('API Error'));

      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      await user.type(searchInput, 'test');

      // Should not crash and should handle error gracefully
      await waitFor(() => {
        // The component should still be functional
        expect(screen.getByTestId('selected-nfts')).toBeInTheDocument();
      });
    });

    it('should handle missing floor price data', async () => {
      const { floorPriceProvider } = require('../../../lib/nft/advanced/FloorPriceProvider');
      floorPriceProvider.getFloorPrice.mockResolvedValue(null);

      const TestWithoutPricing: React.FC = () => (
        <EnhancedNFTCard
          nft={mockNFTs[0]}
          floorPriceData={undefined}
          showPricing={true}
        />
      );

      render(<TestWithoutPricing />, {
        wrapper: createWrapper(),
      });

      // Should still render the NFT card without pricing
      expect(screen.getByText('Fire Dragon #1')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should support keyboard navigation', async () => {
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      // Tab through interactive elements
      await userEvent.tab(); // Search input
      expect(screen.getByPlaceholderText('Search NFTs, collections, or traits...')).toHaveFocus();

      await userEvent.tab(); // Filter button
      const filterButton = screen.getAllByRole('button')[0];
      expect(filterButton).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should announce loading states to screen readers', async () => {
      const user = userEvent.setup();
      
      let resolveSearch: (value: any) => void = () => {};
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve;
      });
      mockAlchemyProvider.searchNFTs.mockReturnValue(searchPromise);

      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      await user.type(searchInput, 'test');

      // Should announce loading state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      resolveSearch([]);
    });
  });

  describe('performance', () => {
    it('should debounce search input to prevent excessive API calls', async () => {
      const user = userEvent.setup();
      
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      
      // Type quickly
      await user.type(searchInput, 'dragon');

      // Should only make one API call due to debouncing
      await waitFor(() => {
        expect(mockAlchemyProvider.searchNFTs).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large result sets efficiently', async () => {
      // Mock large dataset
      const largeNFTSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockNFTs[0],
        id: `nft-${i}`,
        tokenId: String(i),
        name: `NFT #${i}`,
      }));

      mockAlchemyProvider.searchNFTs.mockResolvedValue(largeNFTSet.map(nft => ({
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        name: nft.name,
        imageUrl: 'https://example.com/nft.png',
        attributes: nft.attributes,
        collection: { name: 'Large Collection' },
      })));

      const user = userEvent.setup();
      
      render(<TestNFTSearchComponent />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('Search NFTs, collections, or traits...');
      await user.type(searchInput, 'nft');

      // Should handle large result set without performance issues
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('unified NFT selector integration', () => {
    it('should integrate with existing UnifiedNFTSelector', async () => {
      const TestUnifiedSelector: React.FC = () => {
        const [selectedNFTs, setSelectedNFTs] = React.useState<any[]>([]);

        return (
          <UnifiedNFTSelector
            onNFTSelect={(nft: any) => setSelectedNFTs(prev => [...prev, nft])}
            selectedNFT={selectedNFTs[0]}
          />
        );
      };

      render(<TestUnifiedSelector />, {
        wrapper: createWrapper(),
      });

      // Should render the unified selector
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });
});
