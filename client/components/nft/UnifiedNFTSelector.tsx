import React, { useState, useMemo, useCallback } from 'react';
import { Search, Grid, List, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { NFTGrid, type SelectedNFT } from './NFTGrid';

// Re-export SelectedNFT for external use
export type { SelectedNFT };
import { NFTList } from './NFTList';
import { CompactProtocolSelector } from './CompactProtocolSelector';
import { useEnhancedNFTSearch, type SearchFilters } from '@/hooks/nft/useEnhancedNFTSearch';
import { useIsMobile } from '@/hooks/app/useMobile';
import { cn } from '@/lib/app/utils';

interface UnifiedNFTSelectorProps {
  /** Callback when an NFT is selected */
  onNFTSelect: (nft: SelectedNFT) => void;
  /** Currently selected NFT */
  selectedNFT?: SelectedNFT;
  /** Optional contract addresses to filter by */
  contractAddresses?: string[];
  /** Display mode - modal for overlays, inline for embedded */
  mode?: 'modal' | 'inline';
  /** Custom CSS classes */
  className?: string;
  /** Disable protocol selection (use only NFT) */
  protocolSelectionDisabled?: boolean;
  /** Initial search query */
  initialSearch?: string;
  /** Initial view mode */
  initialViewMode?: 'grid' | 'list';
  /** Maximum height for the selector */
  maxHeight?: string;
  /** Whether to show user collection first */
  prioritizeUserCollection?: boolean;
}

interface FiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  mobile?: boolean;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ 
  filters, 
  onFiltersChange, 
  mobile = false 
}) => {
  const handleProtocolToggle = (protocolId: string) => {
    const newProtocols = filters.protocols.includes(protocolId as any)
      ? filters.protocols.filter(p => p !== protocolId)
      : [...filters.protocols, protocolId as any];
    
    onFiltersChange({ ...filters, protocols: newProtocols });
  };

  const handleTokenTypeToggle = (tokenType: 'ERC721' | 'ERC1155') => {
    const newTokenTypes = filters.tokenTypes.includes(tokenType)
      ? filters.tokenTypes.filter(t => t !== tokenType)
      : [...filters.tokenTypes, tokenType];
    
    onFiltersChange({ ...filters, tokenTypes: newTokenTypes });
  };

  return (
    <div className="space-y-6">
      {/* Protocol Selection */}
      <div>
        <Label className="text-sm font-medium text-[#3c2a14] mb-3 block">
          Protocols
        </Label>
        <CompactProtocolSelector
          selectedProtocols={filters.protocols}
          onProtocolToggle={handleProtocolToggle}
          mobile={mobile}
        />
      </div>

      <Separator />

      {/* Token Types */}
      <div>
        <Label className="text-sm font-medium text-[#3c2a14] mb-3 block">
          Token Types
        </Label>
        <div className="flex gap-2">
          <Button
            variant={filters.tokenTypes.includes('ERC721') ? "default" : "outline"}
            size="sm"
            onClick={() => handleTokenTypeToggle('ERC721')}
            className={cn(
              filters.tokenTypes.includes('ERC721') && "bg-[#ff5e14] border-[#ff5e14] hover:bg-[#e5531b]"
            )}
          >
            ERC721
          </Button>
          <Button
            variant={filters.tokenTypes.includes('ERC1155') ? "default" : "outline"}
            size="sm"
            onClick={() => handleTokenTypeToggle('ERC1155')}
            className={cn(
              filters.tokenTypes.includes('ERC1155') && "bg-[#ff5e14] border-[#ff5e14] hover:bg-[#e5531b]"
            )}
          >
            ERC1155
          </Button>
        </div>
      </div>

      <Separator />

      {/* Additional Filters */}
      <div>
        <Label className="text-sm font-medium text-[#3c2a14] mb-3 block">
          Additional Filters
        </Label>
        <div className="space-y-2">
          <Button
            variant={filters.verified ? "default" : "outline"}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, verified: !filters.verified })}
            className={cn(
              "w-full justify-start",
              filters.verified && "bg-[#ff5e14] border-[#ff5e14] hover:bg-[#e5531b]"
            )}
          >
            ✓ Verified collections only
          </Button>
        </div>
      </div>
    </div>
  );
};

export function UnifiedNFTSelector({
  onNFTSelect,
  selectedNFT,
  contractAddresses,
  mode = 'inline',
  className,
  protocolSelectionDisabled = false,
  initialSearch = '',
  initialViewMode = 'grid',
  maxHeight = 'max-h-[600px]',
  prioritizeUserCollection = true,
}: UnifiedNFTSelectorProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    protocols: protocolSelectionDisabled ? ['NFT'] : ['NFT'],
    verified: false,
    tokenTypes: ['ERC721', 'ERC1155'],
    collections: contractAddresses || [],
  });

  // Enhanced NFT search
  const {
    userNFTs,
    searchResults,
    collections,
    totalResults,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useEnhancedNFTSearch(searchQuery, filters);

  // Combine results with user NFTs prioritized
  const allNFTs = useMemo(() => {
    if (prioritizeUserCollection) {
      // Remove duplicates while keeping user NFTs first
      const searchNFTsFiltered = searchResults.filter(searchNFT => 
        !userNFTs.some(userNFT => 
          userNFT.contractAddress === searchNFT.contractAddress && 
          userNFT.tokenId === searchNFT.tokenId
        )
      );
      return [...userNFTs, ...searchNFTsFiltered];
    }
    
    // Simple combination for non-prioritized view
    const combined = [...userNFTs, ...searchResults];
    return combined.filter((nft, index, self) => 
      index === self.findIndex(n => n.contractAddress === nft.contractAddress && n.tokenId === nft.tokenId)
    );
  }, [userNFTs, searchResults, prioritizeUserCollection]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      protocols: protocolSelectionDisabled ? ['NFT'] : ['NFT'],
      verified: false,
      tokenTypes: ['ERC721', 'ERC1155'],
      collections: contractAddresses || [],
    });
  }, [protocolSelectionDisabled, contractAddresses]);

  // Mobile modal layout
  if (isMobile && mode === 'modal') {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile Header */}
        <div className="sticky top-0 bg-white border-b p-4 space-y-3 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search NFTs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {!protocolSelectionDisabled && (
              <CompactProtocolSelector
                selectedProtocols={filters.protocols}
                onProtocolToggle={(id) => {
                  const newProtocols = filters.protocols.includes(id as any)
                    ? filters.protocols.filter(p => p !== id)
                    : [...filters.protocols, id as any];
                  setFilters({ ...filters, protocols: newProtocols });
                }}
                mobile
              />
            )}
            
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filter NFTs</SheetTitle>
                  <SheetDescription>
                    Customize your NFT search and display preferences
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <FiltersPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                    mobile
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          <NFTGrid
            nfts={allNFTs}
            onSelect={onNFTSelect}
            selectedNFT={selectedNFT}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
            mobile
          />
        </div>
      </div>
    );
  }

  // Desktop/inline layout
  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and View Controls */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search your collection or browse public NFTs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-[#ff5e14] hover:text-[#e5531b]"
                >
                  Clear all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
              />
            </CardContent>
          </Card>
        )}

        {!protocolSelectionDisabled && !showFilters && (
          <CompactProtocolSelector
            selectedProtocols={filters.protocols}
            onProtocolToggle={(id) => {
              const newProtocols = filters.protocols.includes(id as any)
                ? filters.protocols.filter(p => p !== id)
                : [...filters.protocols, id as any];
              setFilters({ ...filters, protocols: newProtocols });
            }}
          />
        )}
      </div>

      {/* Results Summary */}
      {(userNFTs.length > 0 || searchResults.length > 0) && (
        <div className="flex items-center justify-between text-sm text-[#8b7355]">
          <span>
            Found {totalResults} NFTs
            {collections.length > 0 && ` across ${collections.length} collections`}
          </span>
          <div className="flex items-center gap-2">
            {userNFTs.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {userNFTs.length} owned
              </Badge>
            )}
            {searchResults.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {searchResults.length} from search
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Results Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({allNFTs.length})
          </TabsTrigger>
          <TabsTrigger value="owned">
            Your Collection ({userNFTs.length})
          </TabsTrigger>
          <TabsTrigger value="search">
            Search Results ({searchResults.length})
          </TabsTrigger>
        </TabsList>

        <div className={cn("mt-6", maxHeight, "overflow-auto")}>
          <TabsContent value="all">
            {viewMode === 'grid' ? (
              <NFTGrid
                nfts={allNFTs}
                onSelect={onNFTSelect}
                selectedNFT={selectedNFT}
                isLoading={isLoading}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                emptyMessage="No NFTs found. Try adjusting your search or filters."
              />
            ) : (
              <NFTList
                nfts={allNFTs}
                onSelect={onNFTSelect}
                selectedNFT={selectedNFT}
              />
            )}
          </TabsContent>

          <TabsContent value="owned">
            {viewMode === 'grid' ? (
              <NFTGrid
                nfts={userNFTs}
                onSelect={onNFTSelect}
                selectedNFT={selectedNFT}
                isLoading={isLoading}
                emptyMessage="No NFTs in your collection. Connect your wallet to see your NFTs."
              />
            ) : (
              <NFTList
                nfts={userNFTs}
                onSelect={onNFTSelect}
                selectedNFT={selectedNFT}
              />
            )}
          </TabsContent>

          <TabsContent value="search">
            {viewMode === 'grid' ? (
              <NFTGrid
                nfts={searchResults}
                onSelect={onNFTSelect}
                selectedNFT={selectedNFT}
                isLoading={isLoading}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                emptyMessage="No search results found. Try different keywords."
              />
            ) : (
              <NFTList
                nfts={searchResults}
                onSelect={onNFTSelect}
                selectedNFT={selectedNFT}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">
              Error loading NFTs: {error.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
