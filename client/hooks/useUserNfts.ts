import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'

// Alchemy network mapping
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: 'eth-mainnet',       // Ethereum Mainnet
  11155111: 'eth-sepolia', // Sepolia Testnet
  8453: 'base-mainnet',    // Base
  84532: 'base-sepolia',   // Base Sepolia
  10: 'opt-mainnet',       // Optimism
  11155420: 'opt-sepolia', // Optimism Sepolia
  42161: 'arb-mainnet',    // Arbitrum One
}

export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  external_url?: string
}

export interface UserNFT {
  contract: {
    address: string
    name?: string
    symbol?: string
    tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN'
  }
  tokenId: string
  balance?: string // For ERC1155
  metadata?: NFTMetadata
  tokenUri?: string
  timeLastUpdated?: string
}

export interface NFTCollection {
  contractAddress: string
  name?: string
  symbol?: string
  tokenType: 'ERC721' | 'ERC1155' | 'UNKNOWN'
  nfts: UserNFT[]
}

export interface UseUserNftsResult {
  nfts: UserNFT[]
  collections: NFTCollection[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  hasMore: boolean
  loadMore: () => void
}

export interface UseUserNftsOptions {
  /**
   * Specific contract addresses to filter by
   */
  contractAddresses?: string[]
  /**
   * Whether to include metadata (can be slow for large collections)
   */
  withMetadata?: boolean
  /**
   * Maximum number of NFTs to fetch per page
   */
  pageSize?: number
  /**
   * Whether to automatically fetch on mount
   */
  enabled?: boolean
}

export function useUserNfts(options: UseUserNftsOptions = {}): UseUserNftsResult {
  const {
    contractAddresses,
    withMetadata = true,
    pageSize = 100,
    enabled = true
  } = options

  const { address } = useAccount()
  const chainId = useChainId()

  const [nfts, setNfts] = useState<UserNFT[]>([])
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageKey, setPageKey] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)

  const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID
  const alchemyNetwork = ALCHEMY_NETWORKS[chainId]

  const fetchNFTs = useCallback(async (isLoadMore = false) => {
    if (!address || !alchemyId || !alchemyNetwork) {
      setError(!address ? 'Wallet not connected' : 
               !alchemyId ? 'Alchemy API key not configured' :
               'Network not supported by Alchemy')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = `https://${alchemyNetwork}.g.alchemy.com/nft/v3/${alchemyId}`
      
      // Build query parameters
      const params = new URLSearchParams({
        owner: address,
        withMetadata: withMetadata.toString(),
        pageSize: pageSize.toString(),
      })

      // Add contract addresses filter if specified
      if (contractAddresses && contractAddresses.length > 0) {
        params.append('contractAddresses', contractAddresses.join(','))
      }

      // Add pagination if loading more
      if (isLoadMore && pageKey) {
        params.append('pageKey', pageKey)
      }

      const url = `${baseUrl}/getNFTsForOwner?${params.toString()}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Map Alchemy response to our NFT format
      const fetchedNFTs: UserNFT[] = data.ownedNfts?.map((nft: any) => ({
        contract: {
          address: nft.contract.address,
          name: nft.contract.name,
          symbol: nft.contract.symbol,
          tokenType: mapTokenType(nft.contract.tokenType)
        },
        tokenId: nft.tokenId,
        balance: nft.balance, // For ERC1155
        metadata: nft.metadata ? {
          name: nft.metadata.name,
          description: nft.metadata.description,
          image: nft.metadata.image,
          external_url: nft.metadata.external_url
        } : undefined,
        tokenUri: nft.tokenUri?.raw,
        timeLastUpdated: nft.timeLastUpdated
      })) || []

      if (isLoadMore) {
        setNfts(prev => [...prev, ...fetchedNFTs])
      } else {
        setNfts(fetchedNFTs)
      }

      // Update pagination
      setPageKey(data.pageKey)
      setHasMore(!!data.pageKey)

      // Group NFTs by collection
      const collectionsMap = new Map<string, NFTCollection>()
      
      const allNFTs = isLoadMore ? [...nfts, ...fetchedNFTs] : fetchedNFTs
      
      allNFTs.forEach(nft => {
        const key = nft.contract.address.toLowerCase()
        if (!collectionsMap.has(key)) {
          collectionsMap.set(key, {
            contractAddress: nft.contract.address,
            name: nft.contract.name,
            symbol: nft.contract.symbol,
            tokenType: nft.contract.tokenType,
            nfts: []
          })
        }
        collectionsMap.get(key)!.nfts.push(nft)
      })

      setCollections(Array.from(collectionsMap.values()))

    } catch (err) {
      console.error('Error fetching NFTs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs')
    } finally {
      setIsLoading(false)
    }
  }, [address, alchemyId, alchemyNetwork, contractAddresses, withMetadata, pageSize, pageKey])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchNFTs(true)
    }
  }, [hasMore, isLoading, fetchNFTs])

  const refetch = useCallback(() => {
    setPageKey(undefined)
    setHasMore(true)
    fetchNFTs(false)
  }, [fetchNFTs])

  // Fetch NFTs on mount or when dependencies change
  useEffect(() => {
    if (enabled && address) {
      refetch()
    }
  }, [enabled, address, chainId, contractAddresses, refetch])

  return {
    nfts,
    collections,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore
  }
}

// Helper function to map Alchemy token types to our format
function mapTokenType(alchemyType: string): 'ERC721' | 'ERC1155' | 'UNKNOWN' {
  switch (alchemyType?.toUpperCase()) {
    case 'ERC721':
      return 'ERC721'
    case 'ERC1155':
      return 'ERC1155'
    default:
      return 'UNKNOWN'
  }
}
