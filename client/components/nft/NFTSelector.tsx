import {
  AlertCircle,
  CheckCircle2,
  Grid,
  ImageIcon,
  List,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useResponsive } from '@/hooks/app/useResponsive';
import { useNFTSearch } from '@/hooks/nft/useNFTSearch';
import { cn } from '@/lib/app/utils';

// Unified NFT interface that handles all NFT types
export interface SelectedNFT {
  contractAddress: string;
  tokenId: string;
  name?: string;
  image?: string;
  tokenType: 'ERC721' | 'ERC1155';
  collection?: string;
  verified?: boolean;
  rarity?: number;
  traits?: Array<{ trait_type: string; value: string | number }>;
}

export interface NFTSelectorProps {
  /** Callback when an NFT is selected */
  onSelect: (nft: SelectedNFT) => void;
  /** Currently selected NFT */
  selectedNFT?: SelectedNFT | null;
  /** Initial search query */
  initialSearchQuery?: string;
  /** Whether to only show NFTs owned by the connected user */
  userCollectionOnly?: boolean;
  /** Specific contract addresses to filter by */
  contractAddresses?: string[];
  /** Max height for the scrollable area */
  maxHeight?: string;
  /** Size of the NFT cards */
  cardSize?: 'sm' | 'md' | 'lg';
  /** Custom CSS class */
  className?: string;
}

// Helper functions for different NFT data structures
const getContractAddress = (nft: any): string => {
  return nft.contract?.address || nft.contractAddress || '';
};

const getNFTName = (nft: any): string => {
  return nft.metadata?.name || nft.name || `Token #${nft.tokenId}`;
};

const getNFTImage = (nft: any): string | undefined => {
  return nft.metadata?.image || nft.image;
};

const getCollectionName = (nft: any): string | undefined => {
  if (nft.contract?.name) return nft.contract.name;
  if (typeof nft.collection === 'string') return nft.collection;
  if (nft.collection?.name) return nft.collection.name;
  return undefined;
};

const getTokenType = (nft: any): 'ERC721' | 'ERC1155' => {
  const tokenType = nft.contract?.tokenType || nft.tokenType;
  return tokenType === 'UNKNOWN'
    ? 'ERC721'
    : (tokenType as 'ERC721' | 'ERC1155');
};

const getVerifiedStatus = (nft: any): boolean | undefined => {
  if ('contract' in nft) {
    return (nft as any).verified;
  } else if (
    nft.collection &&
    typeof nft.collection === 'object' &&
    'verified' in nft.collection
  ) {
    return nft.collection.verified;
  } else {
    return nft.verified;
  }
};

// Performance-optimized NFT Card component
const NFTCard = memo<{
  nft: any;
  isSelected: boolean;
  onSelect: (nft: SelectedNFT) => void;
  viewMode: 'grid' | 'list';
  cardSize: 'sm' | 'md' | 'lg';
}>(({ nft, isSelected, onSelect, viewMode, cardSize }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSelect = useCallback(() => {
    const contractAddress = getContractAddress(nft);
    const tokenType = getTokenType(nft);
    const nftName = getNFTName(nft);
    const nftImage = getNFTImage(nft);
    const collectionName = getCollectionName(nft);

    // Get verified status
    const verified = getVerifiedStatus(nft);

    onSelect({
      contractAddress,
      tokenId: nft.tokenId,
      name: nftName,
      image: nftImage,
      tokenType,
      collection: collectionName,
      verified,
      rarity: nft.rarity,
      traits: nft.traits,
    });
  }, [nft, onSelect]);

  const cardSizes = {
    sm: { width: 120, height: 160 },
    md: { width: 160, height: 220 },
    lg: { width: 200, height: 280 },
  };

  const { width, height } = cardSizes[cardSize];

  if (viewMode === 'list') {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md',
          isSelected
            ? 'ring-2 ring-[#ff5e14] bg-orange-50'
            : 'hover:border-[#ff5e14]'
        )}
        onClick={handleSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {getNFTImage(nft) && !imageError ? (
                <Image
                  src={getNFTImage(nft) || ''}
                  alt={getNFTName(nft)}
                  fill
                  sizes="64px"
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-200',
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{getNFTName(nft)}</h3>
              {getCollectionName(nft) && (
                <p className="text-sm text-gray-500 truncate">
                  {getCollectionName(nft)}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {getTokenType(nft)}
                </Badge>
                {getVerifiedStatus(nft) && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-700"
                  >
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            {isSelected && (
              <CheckCircle2 className="w-6 h-6 text-[#ff5e14] flex-shrink-0" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-200 hover:shadow-md group',
        isSelected
          ? 'ring-2 ring-[#ff5e14] bg-orange-50'
          : 'hover:border-[#ff5e14]'
      )}
      style={{ width, height }}
      onClick={handleSelect}
    >
      <CardContent className="relative p-0 w-full h-full flex flex-col">
        {!imageLoaded && !imageError && <Skeleton className="w-full h-full" />}

        {getNFTImage(nft) && !imageError ? (
          <Image
            src={getNFTImage(nft) || ''}
            alt={getNFTName(nft)}
            fill
            sizes="100vw"
            className={cn(
              'w-full h-full object-cover rounded transition-opacity duration-200',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded bg-gray-100">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-[#ff5e14] rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Hover Details */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b">
          <h3 className="font-medium text-sm truncate">{getNFTName(nft)}</h3>

          {getCollectionName(nft) && (
            <p className="text-xs text-gray-300 truncate">
              {getCollectionName(nft)}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-1">
            <Badge
              variant="outline"
              className="text-xs bg-white/20 text-white border-white/30"
            >
              {getTokenType(nft)}
            </Badge>
            {getVerifiedStatus(nft) && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-100/20 text-blue-200 border-blue-300/30"
              >
                Verified
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

NFTCard.displayName = 'NFTCard';

export const NFTSelector: React.FC<NFTSelectorProps> = ({
  onSelect,
  selectedNFT,
  initialSearchQuery = '',
  userCollectionOnly = false,
  contractAddresses,
  maxHeight = '400px',
  cardSize = 'md',
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { isMobile } = useResponsive();

  const {
    nfts,
    collections: _collections,
    totalResults,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNFTSearch(searchQuery, {
    userCollectionOnly,
    contractAddresses,
  });

  const filteredNfts = useMemo(() => {
    if (!contractAddresses || contractAddresses.length === 0) {
      return nfts;
    }

    return nfts.filter((nft) =>
      contractAddresses.includes(getContractAddress(nft))
    );
  }, [nfts, contractAddresses]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && fetchNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-switch to list view on mobile
  const activeViewMode = isMobile ? 'list' : viewMode;

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Error loading NFTs</p>
            <p className="text-sm text-gray-600">
              {typeof error === 'string'
                ? error
                : error.message || 'Unknown error occurred'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search NFTs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isMobile && (
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
          </div>
        )}
      </div>

      {/* Results Count */}
      {totalResults > 0 && (
        <div className="text-sm text-gray-600">
          Found {totalResults} NFTs
          {userCollectionOnly && ' in your collection'}
        </div>
      )}

      {/* NFT Grid/List */}
      <ScrollArea style={{ maxHeight }} className="rounded-md border">
        {isLoading && filteredNfts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : filteredNfts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600 mb-2">
              No NFTs found
            </p>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {searchQuery
                ? `No NFTs match "${searchQuery}". Try adjusting your search terms.`
                : userCollectionOnly
                  ? "You don't have any NFTs in your collection yet."
                  : 'No NFTs available to display.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
                className="mt-4"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div
              className={cn(
                activeViewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                  : 'space-y-3'
              )}
            >
              {filteredNfts.map((nft) => {
                const nftContractAddress = getContractAddress(nft);
                const isSelected = selectedNFT
                  ? selectedNFT.contractAddress === nftContractAddress &&
                    selectedNFT.tokenId === nft.tokenId
                  : false;

                return (
                  <NFTCard
                    key={`${nftContractAddress}-${nft.tokenId}`}
                    nft={nft}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    viewMode={activeViewMode}
                    cardSize={cardSize}
                  />
                );
              })}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default NFTSelector;
