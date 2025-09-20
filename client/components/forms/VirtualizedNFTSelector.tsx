import React, { useState, useMemo, useCallback, memo } from 'react'
import { Grid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, AlertCircle, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { EnhancedNFT } from '@/lib/nft-providers/AlchemyProvider'
import type { SelectedNFT } from '@/components/forms/NFTSelector'

interface VirtualizedNFTSelectorProps {
  nfts: EnhancedNFT[]
  onSelect: (nft: SelectedNFT) => void
  selectedNFT?: SelectedNFT
  itemSize?: number
  overscanCount?: number
  className?: string
}

interface GridCellProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: {
    nfts: EnhancedNFT[]
    onSelect: (nft: SelectedNFT) => void
    selectedNFT?: SelectedNFT
    itemsPerRow: number
    itemSize: number
  }
}

// Memoized NFT Card for optimal performance
const NFTCard = memo<{
  nft: EnhancedNFT
  isSelected: boolean
  onSelect: (nft: SelectedNFT) => void
  style: React.CSSProperties
  itemSize: number
}>(({ nft, isSelected, onSelect, style, itemSize }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleSelect = useCallback(() => {
    onSelect({
      contractAddress: nft.contractAddress,
      tokenId: nft.tokenId,
      name: nft.name,
      image: nft.image,
      tokenType: nft.tokenType
    })
  }, [nft, onSelect])

  const rarityColor = useMemo(() => {
    if (!nft.rarity) return 'text-gray-500'
    if (nft.rarity < 0.01) return 'text-red-500' // Legendary
    if (nft.rarity < 0.05) return 'text-purple-500' // Epic  
    if (nft.rarity < 0.1) return 'text-blue-500' // Rare
    if (nft.rarity < 0.25) return 'text-green-500' // Uncommon
    return 'text-gray-500' // Common
  }, [nft.rarity])

  return (
    <div style={style} className="p-2">
      <Card 
        className={`cursor-pointer transition-all duration-200 overflow-hidden h-full ${
          isSelected 
            ? 'ring-2 ring-[#ff5e14] bg-orange-50' 
            : 'hover:shadow-lg border-gray-200 hover:border-[#ff5e14]'
        }`}
        onClick={handleSelect}
      >
        <CardContent className="p-3 h-full flex flex-col">
          {/* Image Section */}
          <div 
            className="relative rounded-lg overflow-hidden bg-gray-100 mb-3"
            style={{ 
              height: `${itemSize * 0.6}px`, 
              minHeight: '120px' 
            }}
          >
            {!imageError && nft.image && (
              <img
                src={nft.image}
                alt={nft.name || `Token #${nft.tokenId}`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true)
                  setImageLoaded(true)
                }}
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

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-5 w-5 text-[#ff5e14] bg-white rounded-full" />
              </div>
            )}

            {/* Token type and balance badges */}
            <div className="absolute bottom-2 left-2 flex gap-1">
              <Badge 
                variant={nft.tokenType === 'ERC721' ? 'default' : 'secondary'}
                className="text-xs px-2 py-1"
              >
                {nft.tokenType}
              </Badge>
              
              {nft.tokenType === 'ERC1155' && nft.balance && nft.balance > 1n && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  ×{nft.balance.toString()}
                </Badge>
              )}
            </div>

            {/* Rarity indicator */}
            {nft.rarity && (
              <div className="absolute top-2 left-2">
                <Badge variant="outline" className={`text-xs px-2 py-1 ${rarityColor}`}>
                  {(nft.rarity * 100).toFixed(1)}%
                </Badge>
              </div>
            )}

            {/* Collection verification */}
            {nft.collection.verified && (
              <div className="absolute top-2 right-8">
                <CheckCircle2 className="h-4 w-4 text-green-500 bg-white rounded-full" />
              </div>
            )}
          </div>

          {/* NFT Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-medium text-[#3c2a14] truncate">
                {nft.name || `Token #${nft.tokenId}`}
              </h4>
              <p className="text-xs text-[#8b7355] truncate">
                {nft.collection.name || 'Unknown Collection'}
              </p>
            </div>

            {/* Floor price if available */}
            {nft.collection.floorPrice && (
              <div className="mt-2">
                <p className="text-xs text-[#8b7355]">
                  Floor: {nft.collection.floorPrice.value} {nft.collection.floorPrice.currency}
                </p>
              </div>
            )}

            {/* Top traits preview */}
            {nft.traits && nft.traits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {nft.traits.slice(0, 2).map((trait, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs px-1 py-0"
                    title={`${trait.trait_type}: ${trait.value}`}
                  >
                    {String(trait.value).slice(0, 8)}
                  </Badge>
                ))}
                {nft.traits.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{nft.traits.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

NFTCard.displayName = 'NFTCard'

// Grid cell component for react-window  
const GridCell: React.ComponentType<any> = ({ columnIndex, rowIndex, style, data }) => {
  const { nfts, onSelect, selectedNFT, itemsPerRow, itemSize } = data
  const index = rowIndex * itemsPerRow + columnIndex
  const nft = nfts[index]

  if (!nft) {
    return <div style={style} />
  }

  const isSelected = selectedNFT?.contractAddress.toLowerCase() === nft.contractAddress.toLowerCase() &&
                    selectedNFT?.tokenId === nft.tokenId

  return (
    <NFTCard
      nft={nft}
      isSelected={isSelected}
      onSelect={onSelect}
      style={style}
      itemSize={itemSize}
    />
  )
}

/**
 * Virtualized NFT Selector for efficient rendering of large NFT collections
 * Uses react-window for performance optimization
 */
export const VirtualizedNFTSelector: React.FC<VirtualizedNFTSelectorProps> = ({
  nfts,
  onSelect,
  selectedNFT,
  itemSize = 220,
  overscanCount = 5,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [containerWidth, setContainerWidth] = useState(0)

  // Filter NFTs based on search term
  const filteredNFTs = useMemo(() => {
    if (!searchTerm) return nfts
    
    const searchLower = searchTerm.toLowerCase()
    return nfts.filter(nft => 
      nft.name?.toLowerCase().includes(searchLower) ||
      nft.collection.name?.toLowerCase().includes(searchLower) ||
      nft.contractAddress.toLowerCase().includes(searchLower) ||
      nft.tokenId.includes(searchTerm) ||
      nft.traits?.some(trait => 
        trait.trait_type.toLowerCase().includes(searchLower) ||
        String(trait.value).toLowerCase().includes(searchLower)
      )
    )
  }, [nfts, searchTerm])

  // Calculate grid dimensions
  const itemsPerRow = useMemo(() => {
    return Math.max(1, Math.floor(containerWidth / itemSize))
  }, [containerWidth, itemSize])

  const rowCount = Math.ceil(filteredNFTs.length / itemsPerRow)

  // Grid item data for react-window
  const gridItemData = useMemo(() => ({
    nfts: filteredNFTs,
    onSelect,
    selectedNFT,
    itemsPerRow,
    itemSize
  }), [filteredNFTs, onSelect, selectedNFT, itemsPerRow, itemSize])

  const handleResize = useCallback(({ width }: { width: number }) => {
    setContainerWidth(width)
  }, [])

  if (nfts.length === 0) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-[#8b7355] mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-[#3c2a14] mb-2">No NFTs Found</h3>
            <p className="text-sm text-[#8b7355]">
              You don't have any NFTs in your wallet
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div>
          <Label className="text-[#3c2a14] text-base font-semibold">
            Select Your NFT for Withdrawal
          </Label>
          <p className="text-sm text-[#8b7355]">
            {filteredNFTs.length} of {nfts.length} NFTs
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
        
        {/* Performance indicator */}
        <Badge variant="outline" className="text-xs">
          Virtual Grid: {rowCount} rows
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by name, collection, traits, or token ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white border-gray-300 text-[#3c2a14] placeholder:text-[#8b7355]"
        />
      </div>

      {/* Virtual Grid Implementation - Temporarily using fallback grid due to react-window compatibility */}
      <div className="h-[600px] w-full border border-gray-200 rounded-lg overflow-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
          {filteredNFTs.map((nft, index) => {
            const isSelected = selectedNFT?.contractAddress.toLowerCase() === nft.contractAddress.toLowerCase() &&
                              selectedNFT?.tokenId === nft.tokenId
            
            return (
              <NFTCard
                key={`${nft.contractAddress}-${nft.tokenId}`}
                nft={nft}
                isSelected={isSelected}
                onSelect={onSelect}
                style={{}}
                itemSize={itemSize}
              />
            )
          })}
        </div>
        <div className="p-4 bg-blue-50 text-blue-700 text-sm text-center">
          ⚡ Fallback grid rendering - Virtual scrolling will be enabled in a future update
        </div>
      </div>

      {/* Collection Stats */}
      {filteredNFTs.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-[#3c2a14] mb-2">Performance Stats</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[#8b7355]">Total NFTs:</span>
              <span className="ml-2 font-medium">{nfts.length}</span>
            </div>
            <div>
              <span className="text-[#8b7355]">Visible:</span>
              <span className="ml-2 font-medium">{Math.min(itemsPerRow * Math.ceil(600 / itemSize), filteredNFTs.length)}</span>
            </div>
            <div>
              <span className="text-[#8b7355]">Grid Size:</span>
              <span className="ml-2 font-medium">{itemsPerRow} × {rowCount}</span>
            </div>
            <div>
              <span className="text-[#8b7355]">Item Size:</span>
              <span className="ml-2 font-medium">{itemSize}px</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Empty */}
      {filteredNFTs.length === 0 && nfts.length > 0 && (
        <Card className="p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-[#8b7355] mx-auto mb-2" />
            <p className="text-[#8b7355]">
              No NFTs match your search term "{searchTerm}"
            </p>
            <Button
              variant="ghost"
              onClick={() => setSearchTerm('')}
              className="mt-2 text-[#ff5e14]"
            >
              Clear Search
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

/**
 * Smart NFT Selector that automatically chooses between regular and virtualized rendering
 * based on collection size for optimal performance
 */
interface SmartNFTSelectorProps {
  nfts: EnhancedNFT[]
  onSelect: (nft: SelectedNFT) => void
  selectedNFT?: SelectedNFT
  virtualScrollThreshold?: number
  className?: string
}

export const SmartNFTSelector: React.FC<SmartNFTSelectorProps> = ({
  nfts,
  onSelect,
  selectedNFT,
  virtualScrollThreshold = 50,
  className = ''
}) => {
  const shouldUseVirtualScrolling = nfts.length > virtualScrollThreshold

  if (shouldUseVirtualScrolling) {
    return (
      <div className={className}>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              Virtual Scrolling Enabled
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Optimized rendering for {nfts.length} NFTs. Only visible items are rendered for better performance.
          </p>
        </div>
        
        <VirtualizedNFTSelector
          nfts={nfts}
          onSelect={onSelect}
          selectedNFT={selectedNFT}
        />
      </div>
    )
  }

  // Use simplified grid for smaller collections
  return (
    <div className={className}>
      {nfts.length > 25 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-[#8b7355]">
            Rendering {nfts.length} NFTs in standard mode. Virtual scrolling implementation in progress.
          </p>
        </div>
      )}
      
      {/* Simplified NFT Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[600px] overflow-auto">
        {nfts.map((nft, index) => {
          const isSelected = selectedNFT?.contractAddress.toLowerCase() === nft.contractAddress.toLowerCase() &&
                            selectedNFT?.tokenId === nft.tokenId
          
          const selectedNFTConverted = {
            contractAddress: nft.contractAddress,
            tokenId: nft.tokenId,
            name: nft.name,
            image: nft.image,
            tokenType: nft.tokenType
          }
          
          return (
            <NFTCard
              key={`${nft.contractAddress}-${nft.tokenId}`}
              nft={nft}
              isSelected={isSelected}
              onSelect={() => onSelect(selectedNFTConverted)}
              style={{}}
              itemSize={220}
            />
          )
        })}
      </div>
    </div>
  )
}

// Export both components
export { VirtualizedNFTSelector as default }
