import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, Grid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserNfts } from '@/hooks/useUserNfts'
import type { UserNFT } from '@/hooks/useUserNfts'
import { VirtualGrid, VirtualGridLoadingPlaceholder, VirtualGridEmptyState } from '@/components/design/virtual-grid'
import { useCachedAsyncData } from '@/hooks/useCache'

export interface SelectedNFT {
  contractAddress: string
  tokenId: string
  name?: string
  image?: string
  tokenType: 'ERC721' | 'ERC1155'
}

interface NFTSelectorProps {
  /** Specific contract addresses to filter by (for NFT-gated jars) */
  contractAddresses?: string[]
  /** Callback when an NFT is selected */
  onSelect: (nft: SelectedNFT) => void
  /** Currently selected NFT */
  selectedNFT?: SelectedNFT
  /** Custom CSS class */
  className?: string
  /** Use virtual scrolling for large collections (default: auto-detect) */
  useVirtualScrolling?: boolean
  /** Threshold for enabling virtual scrolling (default: 50 items) */
  virtualScrollThreshold?: number
}

export const NFTSelector: React.FC<NFTSelectorProps> = ({
  contractAddresses,
  onSelect,
  selectedNFT,
  className = '',
  useVirtualScrolling,
  virtualScrollThreshold = 50
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  
  const { 
    nfts, 
    collections, 
    isLoading, 
    error, 
    refetch,
    hasMore,
    loadMore 
  } = useUserNfts({
    contractAddresses,
    withMetadata: true,
    pageSize: 50,
    enabled: true
  })

  // Filter NFTs based on search term
  const filteredNFTs = nfts.filter(nft => {
    const searchLower = searchTerm.toLowerCase()
    return (
      nft.contract.name?.toLowerCase().includes(searchLower) ||
      nft.contract.symbol?.toLowerCase().includes(searchLower) ||
      nft.metadata?.name?.toLowerCase().includes(searchLower) ||
      nft.contract.address.toLowerCase().includes(searchLower) ||
      nft.tokenId.includes(searchTerm)
    )
  })

  const handleNFTSelect = (nft: UserNFT) => {
    // Only select NFTs with known token types
    if (nft.contract.tokenType !== 'ERC721' && nft.contract.tokenType !== 'ERC1155') {
      return
    }
    
    const selected: SelectedNFT = {
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      name: nft.metadata?.name || `${nft.contract.name || 'Unknown'} #${nft.tokenId}`,
      image: nft.metadata?.image,
      tokenType: nft.contract.tokenType as 'ERC721' | 'ERC1155'
    }
    onSelect(selected)
  }

  const isSelected = (nft: UserNFT) => {
    return selectedNFT?.contractAddress.toLowerCase() === nft.contract.address.toLowerCase() &&
           selectedNFT?.tokenId === nft.tokenId
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: { scale: 0.98 }
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-[#3c2a14] mb-2">Error Loading NFTs</h3>
            <p className="text-sm text-[#8b7355] mb-4">{error}</p>
            <Button 
              onClick={refetch}
              variant="outline"
              className="border-[#ff5e14] text-[#ff5e14]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <Label className="text-[#3c2a14] text-base font-semibold">
          Select Your NFT for Withdrawal
        </Label>
        <p className="text-sm text-[#8b7355]">
          {contractAddresses && contractAddresses.length > 0
            ? 'Choose from your eligible NFTs for this jar'
            : 'Choose any NFT from your collection'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by name, collection, or token ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white border-gray-300 text-[#3c2a14] placeholder:text-[#8b7355]"
        />
      </div>

      {/* Loading State */}
      {isLoading && nfts.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff5e14] mx-auto" />
            <p className="text-[#8b7355]">Loading your NFTs...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredNFTs.length === 0 && nfts.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-[#8b7355] mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-[#3c2a14] mb-2">No NFTs Found</h3>
              <p className="text-sm text-[#8b7355]">
                {contractAddresses && contractAddresses.length > 0
                  ? "You don't have any NFTs from the required collections"
                  : "You don't have any NFTs in your wallet"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search Results Empty */}
      {!isLoading && filteredNFTs.length === 0 && nfts.length > 0 && (
        <Card className="p-6">
          <div className="text-center">
            <p className="text-[#8b7355]">No NFTs match your search term</p>
          </div>
        </Card>
      )}

      {/* NFT Grid */}
      {filteredNFTs.length > 0 && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {filteredNFTs.map((nft, index) => (
              <motion.div
                key={`${nft.contract.address}-${nft.tokenId}`}
                variants={cardVariants}
                whileHover="hover"
                whileTap="tap"
                layout
              >
                <Card 
                  className={`cursor-pointer transition-all duration-200 overflow-hidden ${
                    isSelected(nft) 
                      ? 'ring-2 ring-[#ff5e14] bg-orange-50' 
                      : 'hover:shadow-lg border-gray-200'
                  }`}
                  onClick={() => handleNFTSelect(nft)}
                >
                  <CardContent className="p-3">
                    {/* NFT Image */}
                    <div className="aspect-square mb-3 relative rounded-lg overflow-hidden bg-gray-100">
                      {nft.metadata?.image ? (
                        <img
                          src={nft.metadata.image}
                          alt={nft.metadata.name || `Token #${nft.tokenId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to placeholder on image error
                            (e.target as HTMLImageElement).src = '/placeholder.svg'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8b7355]">
                          <span className="text-sm">#{nft.tokenId}</span>
                        </div>
                      )}
                      
                      {/* Selection indicator */}
                      {isSelected(nft) && (
                        <motion.div
                          className="absolute top-2 right-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-[#ff5e14] bg-white rounded-full" />
                        </motion.div>
                      )}

                      {/* Token type badge */}
                      <div className="absolute bottom-2 left-2">
                        <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${
                          nft.contract.tokenType === 'ERC721' 
                            ? 'bg-blue-500' 
                            : nft.contract.tokenType === 'ERC1155'
                            ? 'bg-purple-500'
                            : 'bg-gray-500'
                        }`}>
                          {nft.contract.tokenType}
                        </span>
                      </div>

                      {/* ERC1155 Balance */}
                      {nft.contract.tokenType === 'ERC1155' && nft.balance && (
                        <div className="absolute bottom-2 right-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-black/70 text-white font-medium">
                            {nft.balance}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* NFT Info */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-[#3c2a14] truncate">
                        {nft.metadata?.name || `Token #${nft.tokenId}`}
                      </h4>
                      <p className="text-xs text-[#8b7355] truncate">
                        {nft.contract.name || 'Unknown Collection'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="text-center pt-4">
          <Button
            onClick={loadMore}
            variant="outline"
            className="border-[#ff5e14] text-[#ff5e14]"
          >
            Load More NFTs
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoading && nfts.length > 0 && (
        <div className="text-center pt-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-[#8b7355]">Loading more...</span>
          </div>
        </div>
      )}

      {/* Collection Summary */}
      {collections.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-[#3c2a14] mb-2">Collections Found</h4>
          <div className="flex flex-wrap gap-2">
            {collections.map((collection) => (
              <span
                key={collection.contractAddress}
                className="text-xs px-2 py-1 bg-white rounded-full text-[#8b7355] border"
              >
                {collection.name || 'Unknown'} ({collection.nfts.length})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
