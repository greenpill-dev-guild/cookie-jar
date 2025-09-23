import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ImageIcon, 
  ExternalLink,
  Shield,
  Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/app/utils';
import type { EnhancedNFT } from '@/lib/nft/AlchemyProvider';

export interface SelectedNFT {
  contractAddress: string;
  tokenId: string;
  name?: string;
  image?: string;
  tokenType: "ERC721" | "ERC1155";
}

interface NFTGridProps {
  nfts: EnhancedNFT[];
  onSelect: (nft: SelectedNFT) => void;
  selectedNFT?: SelectedNFT;
  isLoading?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  isFetchingNextPage?: boolean;
  mobile?: boolean;
  className?: string;
  emptyMessage?: string;
}

// Animation variants for smooth transitions
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: { scale: 0.98 },
};

interface NFTCardProps {
  nft: EnhancedNFT;
  isSelected: boolean;
  onSelect: () => void;
  mobile?: boolean;
}

const NFTCard: React.FC<NFTCardProps> = ({ 
  nft, 
  isSelected, 
  onSelect, 
  mobile = false 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  const getRarityColor = (rarity?: number) => {
    if (!rarity) return "text-gray-500";
    if (rarity < 0.01) return "text-red-500"; // Legendary
    if (rarity < 0.05) return "text-purple-500"; // Epic
    if (rarity < 0.1) return "text-blue-500"; // Rare
    if (rarity < 0.25) return "text-green-500"; // Uncommon
    return "text-gray-500"; // Common
  };

  const convertToSelectedNFT = (): SelectedNFT => ({
    contractAddress: nft.contractAddress,
    tokenId: nft.tokenId,
    name: nft.name,
    image: nft.image,
    tokenType: nft.tokenType,
  });

  return (
    <TooltipProvider>
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        whileTap="tap"
        layout
      >
        <Card
          className={cn(
            "cursor-pointer transition-all duration-200 overflow-hidden",
            isSelected
              ? "ring-2 ring-[#ff5e14] bg-orange-50"
              : "hover:shadow-lg border-gray-200 hover:border-[#ff5e14]",
            mobile ? "h-48" : "h-64"
          )}
          onClick={() => onSelect()}
        >
          <CardContent className="p-0 h-full flex flex-col">
            {/* Image Section */}
            <div 
              className={cn(
                "relative rounded-t-lg overflow-hidden bg-gray-100",
                mobile ? "h-32" : "h-40"
              )}
            >
              {!imageError && nft.image && (
                <img
                  src={nft.image}
                  alt={nft.name || `Token #${nft.tokenId}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  loading="lazy"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}

              {/* Fallback for missing/broken images */}
              {(imageError || !nft.image) && (
                <div className="w-full h-full flex items-center justify-center text-[#8b7355]">
                  <div className="text-center">
                    <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                    <span className="text-xs">#{nft.tokenId}</span>
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {!imageLoaded && nft.image && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  className="absolute top-2 right-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  <CheckCircle2 className="h-5 w-5 text-[#ff5e14] bg-white rounded-full" />
                </motion.div>
              )}

              {/* Token type badge */}
              <div className="absolute bottom-2 left-2">
                <Badge
                  variant={nft.tokenType === "ERC721" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {nft.tokenType}
                </Badge>
              </div>

              {/* Balance badge for ERC1155 */}
              {nft.tokenType === "ERC1155" && nft.balance && nft.balance > 1n && (
                <div className="absolute bottom-2 right-2">
                  <Badge className="text-xs bg-black/70 text-white">
                    ×{nft.balance.toString()}
                  </Badge>
                </div>
              )}

              {/* Rarity indicator */}
              {nft.rarity && (
                <div className="absolute top-2 left-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getRarityColor(nft.rarity))}
                  >
                    {(nft.rarity * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}

              {/* Collection verification */}
              {nft.collection.verified && (
                <div className="absolute top-2 right-8">
                  <Shield className="h-4 w-4 text-green-500 bg-white/90 rounded-full p-0.5" />
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className={cn(
                      "font-medium text-[#3c2a14] truncate cursor-help",
                      mobile ? "text-sm" : "text-sm"
                    )}>
                      {nft.name || `Token #${nft.tokenId}`}
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{nft.name || `Token #${nft.tokenId}`}</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-[#8b7355] truncate cursor-help">
                      {nft.collection.name || "Unknown Collection"}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{nft.collection.name || "Unknown Collection"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Footer info */}
              <div className="mt-2 space-y-1">
                {/* Floor price */}
                {nft.collection.floorPrice && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8b7355]">Floor:</span>
                    <span className="font-medium">
                      {nft.collection.floorPrice.value} {nft.collection.floorPrice.currency}
                    </span>
                  </div>
                )}

                {/* Top traits (mobile: none, desktop: up to 2) */}
                {!mobile && nft.traits && nft.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {nft.traits.slice(0, 2).map((trait, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs px-1 py-0 truncate max-w-[80px]"
                        title={`${trait.trait_type}: ${trait.value}`}
                      >
                        {String(trait.value)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export function NFTGrid({
  nfts,
  onSelect,
  selectedNFT,
  isLoading = false,
  hasNextPage = false,
  onLoadMore,
  isFetchingNextPage = false,
  mobile = false,
  className,
  emptyMessage = "No NFTs found",
}: NFTGridProps) {
  const handleNFTSelect = useCallback((nft: EnhancedNFT) => {
    const selectedNFTData: SelectedNFT = {
      contractAddress: nft.contractAddress,
      tokenId: nft.tokenId,
      name: nft.name,
      image: nft.image,
      tokenType: nft.tokenType,
    };
    onSelect(selectedNFTData);
  }, [onSelect]);

  const isSelected = useCallback((nft: EnhancedNFT) => {
    return (
      selectedNFT?.contractAddress.toLowerCase() === nft.contractAddress.toLowerCase() &&
      selectedNFT?.tokenId === nft.tokenId
    );
  }, [selectedNFT]);

  // Loading state
  if (isLoading && nfts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff5e14] mx-auto" />
          <p className="text-[#8b7355]">Loading NFTs...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && nfts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-[#8b7355] mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-[#3c2a14] mb-2">
              {emptyMessage}
            </h3>
            <p className="text-sm text-[#8b7355]">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* NFT Grid */}
      <motion.div
        className={cn(
          "grid gap-4",
          mobile 
            ? "grid-cols-2" 
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        )}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {nfts.map((nft) => (
            <NFTCard
              key={`${nft.contractAddress}-${nft.tokenId}`}
              nft={nft}
              isSelected={isSelected(nft)}
              onSelect={() => handleNFTSelect(nft)}
              mobile={mobile}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Load More Button */}
      {hasNextPage && onLoadMore && (
        <div className="text-center pt-4">
          <Button
            onClick={onLoadMore}
            variant="outline"
            disabled={isFetchingNextPage}
            className="border-[#ff5e14] text-[#ff5e14] hover:bg-[#ff5e14] hover:text-white"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              "Load More NFTs"
            )}
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isFetchingNextPage && (
        <div className="text-center pt-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-[#8b7355]">Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}
