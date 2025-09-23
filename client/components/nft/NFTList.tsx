import React, { useCallback } from 'react';
import { 
  CheckCircle2, 
  ImageIcon,
  Shield,
  ExternalLink 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/app/utils';
import type { EnhancedNFT } from '@/lib/nft/AlchemyProvider';
import type { SelectedNFT } from './NFTGrid';

interface NFTListProps {
  nfts: EnhancedNFT[];
  onSelect: (nft: SelectedNFT) => void;
  selectedNFT?: SelectedNFT;
  className?: string;
}

interface NFTListItemProps {
  nft: EnhancedNFT;
  isSelected: boolean;
  onSelect: () => void;
}

const NFTListItem: React.FC<NFTListItemProps> = ({ 
  nft, 
  isSelected, 
  onSelect 
}) => {
  const getRarityColor = (rarity?: number) => {
    if (!rarity) return "text-gray-500";
    if (rarity < 0.01) return "text-red-500"; // Legendary
    if (rarity < 0.05) return "text-purple-500"; // Epic
    if (rarity < 0.1) return "text-blue-500"; // Rare
    if (rarity < 0.25) return "text-green-500"; // Uncommon
    return "text-gray-500"; // Common
  };

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200",
          isSelected
            ? "ring-2 ring-[#ff5e14] bg-orange-50"
            : "hover:shadow-md border-gray-200 hover:border-[#ff5e14]"
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* NFT Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
              {nft.image ? (
                <img
                  src={nft.image}
                  alt={nft.name || `Token #${nft.tokenId}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide image on error and show fallback
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <CheckCircle2 className="h-4 w-4 text-[#ff5e14] bg-white rounded-full" />
                </div>
              )}
            </div>

            {/* NFT Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Name and Collection */}
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-[#3c2a14] truncate">
                      {nft.name || `Token #${nft.tokenId}`}
                    </h3>
                    {nft.collection.verified && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Shield className="h-3 w-3 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Verified Collection</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <p className="text-xs text-[#8b7355] truncate">
                      {nft.collection.name || "Unknown Collection"}
                    </p>
                    <Badge
                      variant={nft.tokenType === "ERC721" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {nft.tokenType}
                    </Badge>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center space-x-3 text-xs text-[#8b7355]">
                    <span>ID: {nft.tokenId}</span>
                    
                    {nft.tokenType === "ERC1155" && nft.balance && nft.balance > 1n && (
                      <span>Balance: {nft.balance.toString()}</span>
                    )}
                    
                    {nft.rarity && (
                      <span className={getRarityColor(nft.rarity)}>
                        Rarity: {(nft.rarity * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side info */}
                <div className="flex flex-col items-end space-y-1">
                  {/* Floor price */}
                  {nft.collection.floorPrice && (
                    <div className="text-right">
                      <p className="text-xs text-[#8b7355]">Floor Price</p>
                      <p className="text-sm font-medium text-[#3c2a14]">
                        {nft.collection.floorPrice.value} {nft.collection.floorPrice.currency}
                      </p>
                    </div>
                  )}

                  {/* Contract address link */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://etherscan.io/address/${nft.contractAddress}`,
                            '_blank'
                          );
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View on Etherscan</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Traits */}
              {nft.traits && nft.traits.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <div className="flex flex-wrap gap-1">
                    {nft.traits.slice(0, 4).map((trait, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger>
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 max-w-[120px] truncate"
                          >
                            {String(trait.value)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{trait.trait_type}: {String(trait.value)}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {nft.traits.length > 4 && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        +{nft.traits.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export function NFTList({
  nfts,
  onSelect,
  selectedNFT,
  className,
}: NFTListProps) {
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

  if (nfts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#8b7355]">No NFTs to display</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {nfts.map((nft) => (
        <NFTListItem
          key={`${nft.contractAddress}-${nft.tokenId}`}
          nft={nft}
          isSelected={isSelected(nft)}
          onSelect={() => handleNFTSelect(nft)}
        />
      ))}
    </div>
  );
}
