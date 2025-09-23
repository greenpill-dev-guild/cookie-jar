"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { 
  Star, 
  TrendingUp, 
  Eye, 
  Heart, 
  ExternalLink, 
  Zap, 
  Crown, 
  Award,
  Info,
  DollarSign,
  Timer,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { NFTWithTraits } from "@/lib/nft/advanced/TraitFilterSystem";
import { FloorPriceData } from "@/lib/nft/advanced/FloorPriceProvider";

interface EnhancedNFTCardProps {
  nft: NFTWithTraits;
  floorPriceData?: FloorPriceData;
  onSelect?: (nft: NFTWithTraits) => void;
  onFavorite?: (nft: NFTWithTraits) => void;
  onViewDetails?: (nft: NFTWithTraits) => void;
  selected?: boolean;
  favorited?: boolean;
  showTraits?: boolean;
  showRarity?: boolean;
  showPricing?: boolean;
  compact?: boolean;
  className?: string;
}

export function EnhancedNFTCard({
  nft,
  floorPriceData,
  onSelect,
  onFavorite,
  onViewDetails,
  selected = false,
  favorited = false,
  showTraits = true,
  showRarity = true,
  showPricing = true,
  compact = false,
  className = "",
}: EnhancedNFTCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Calculate rarity tier
  const getRarityTier = (rank?: number, totalSupply?: number) => {
    if (!rank || !totalSupply) return null;
    
    const percentage = (rank / totalSupply) * 100;
    if (percentage <= 1) return { label: "Legendary", color: "bg-gradient-to-r from-yellow-400 to-orange-500", icon: <Crown className="h-3 w-3" /> };
    if (percentage <= 5) return { label: "Epic", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: <Award className="h-3 w-3" /> };
    if (percentage <= 15) return { label: "Rare", color: "bg-gradient-to-r from-blue-500 to-cyan-500", icon: <Star className="h-3 w-3" /> };
    if (percentage <= 40) return { label: "Uncommon", color: "bg-gradient-to-r from-green-500 to-emerald-500", icon: <Zap className="h-3 w-3" /> };
    return { label: "Common", color: "bg-gradient-to-r from-gray-400 to-gray-500", icon: <Eye className="h-3 w-3" /> };
  };

  const rarityTier = getRarityTier(nft.rarity_rank, nft.collection_size);

  // Format price display
  const formatPrice = (price: number, currency = "ETH") => {
    if (price < 0.001) return `<0.001 ${currency}`;
    if (price < 1) return `${price.toFixed(4)} ${currency}`;
    if (price < 100) return `${price.toFixed(2)} ${currency}`;
    return `${price.toFixed(0)} ${currency}`;
  };

  return (
    <TooltipProvider>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={className}
      >
        <Card 
          className={`overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selected ? 'ring-2 ring-primary shadow-lg' : ''
          } ${compact ? 'h-auto' : 'h-full'}`}
          onClick={() => onSelect?.(nft)}
        >
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {!imageError ? (
              <Image
                src={nft.image}
                alt={nft.name}
                fill
                className={`object-cover transition-all duration-300 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                sizes={compact ? "200px" : "300px"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors">
              <div className="absolute top-2 right-2 flex gap-1">
                {onFavorite && (
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="secondary"
                      size="icon"
                      className={`h-8 w-8 backdrop-blur-sm ${
                        favorited ? 'text-red-500 bg-red-50' : 'bg-white/80'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFavorite(nft);
                      }}
                    >
                      <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} />
                    </Button>
                  </motion.div>
                )}
                
                {onViewDetails && (
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 backdrop-blur-sm bg-white/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(nft);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Rarity Badge */}
              {showRarity && rarityTier && (
                <div className="absolute top-2 left-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className={`${rarityTier.color} text-white border-0 gap-1`}>
                        {rarityTier.icon}
                        {rarityTier.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="font-semibold">Rank #{nft.rarity_rank}</div>
                        <div className="text-xs text-muted-foreground">
                          Top {((nft.rarity_rank! / nft.collection_size!) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Price Badge */}
              {showPricing && floorPriceData && (
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-sm">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatPrice(floorPriceData.floorPrice)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-3">
            {/* NFT Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate" title={nft.name}>
                    {nft.name}
                  </h3>
                  {nft.collection_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {nft.collection_name}
                    </p>
                  )}
                </div>
                
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-muted-foreground">#{nft.tokenId}</div>
                  {showRarity && nft.rarity_rank && (
                    <div className="text-xs font-medium">#{nft.rarity_rank}</div>
                  )}
                </div>
              </div>

              {/* Pricing Information */}
              {showPricing && floorPriceData && !compact && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Floor Price</span>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(floorPriceData.floorPrice)}</div>
                      <div className="text-muted-foreground">
                        ${floorPriceData.floorPriceUSD?.toFixed(0)}
                      </div>
                    </div>
                  </div>
                  
                  {floorPriceData.change24h !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">24h Change</span>
                      <span className={`font-medium ${
                        floorPriceData.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {floorPriceData.change24h >= 0 ? '+' : ''}{floorPriceData.change24h?.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Traits */}
              {showTraits && nft.attributes && nft.attributes.length > 0 && !compact && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Traits ({nft.attributes.length})</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {nft.attributes.slice(0, compact ? 2 : 4).map((trait, index) => (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="text-xs px-2 py-0.5 h-auto cursor-help"
                            >
                              {trait.trait_type}: {String(trait.value).slice(0, 8)}
                              {String(trait.value).length > 8 && '...'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div>
                              <div className="font-semibold">{trait.trait_type}</div>
                              <div>{trait.value}</div>
                              {trait.trait_count && (
                                <div className="text-xs text-muted-foreground">
                                  {trait.trait_count} items have this trait
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      
                      {nft.attributes.length > (compact ? 2 : 4) && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
                          +{nft.attributes.length - (compact ? 2 : 4)} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Collection Stats (Compact View) */}
              {compact && (floorPriceData || nft.collection_size) && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  {floorPriceData && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{formatPrice(floorPriceData.floorPrice)}</span>
                    </div>
                  )}
                  
                  {nft.collection_size && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{nft.collection_size.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!compact && (onSelect || onViewDetails) && (
                <div className="flex gap-2 pt-2">
                  {onSelect && (
                    <Button
                      size="sm"
                      className="flex-1 h-8"
                      variant={selected ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(nft);
                      }}
                    >
                      {selected ? 'Selected' : 'Select'}
                    </Button>
                  )}
                  
                  {onViewDetails && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(nft);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
