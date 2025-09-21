import { Alchemy, Network, GetNftsForOwnerOptions, NftFilters, NftOrdering, OwnedNft, Nft } from "alchemy-sdk"

// Type guards and validation utilities
const isValidTokenType = (type: any): type is 'ERC721' | 'ERC1155' => {
  return type === 'ERC721' || type === 'ERC1155'
}

const sanitizeString = (value: any, maxLength: number = 200, fallback: string = ''): string => {
  if (typeof value !== 'string') return fallback
  return value.slice(0, maxLength).trim()
}

const sanitizeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value)
  return isNaN(num) ? fallback : Math.max(0, num)
}

const sanitizeAttributes = (attributes: any): Array<{trait_type: string, value: any}> => {
  if (!Array.isArray(attributes)) return []
  
  return attributes
    .filter(attr => attr && typeof attr === 'object')
    .map(attr => ({
      trait_type: sanitizeString(attr.trait_type, 50, 'Unknown'),
      value: attr.value ?? 'N/A'
    }))
    .slice(0, 20) // Limit attributes to prevent bloat
}

// Alchemy SDK response type interfaces (based on actual SDK types)
interface AlchemyNFTResponse {
  contract: {
    address: string
    name?: string
    isSpam?: boolean
  }
  tokenId: string
  tokenType?: string
  title?: string
  description?: string
  image?: {
    originalUrl?: string
    thumbnailUrl?: string
  }
  rawMetadata?: {
    attributes?: any[]
  }
  balance?: string
  timeLastUpdated?: string
}

interface AlchemyMetadataResponse {
  title?: string
  description?: string
  image?: {
    originalUrl?: string
    thumbnailUrl?: string
  }
  rawMetadata?: {
    attributes?: any[]
  }
  contract?: {
    name?: string
  }
  tokenType?: string
}

// Enhanced NFT interfaces
export interface EnhancedNFT {
  contractAddress: string
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  description?: string
  image?: string
  traits?: Array<{
    trait_type: string
    value: any
    rarity?: number
  }>
  collection: {
    name?: string
    address: string
    verified?: boolean
    floorPrice?: {
      value: number
      currency: string
    }
  }
  balance: bigint
  lastTransferTime?: string
  rarity?: number
  marketData?: {
    floorPrice?: bigint
    lastSalePrice?: bigint
    volume24h?: bigint
  }
}

export interface EnhancedNFTMetadata {
  name?: string
  description?: string
  image?: string
  traits?: Array<{
    trait_type: string
    value: any
    rarity?: number
  }>
  collection?: string
  tokenType: 'ERC721' | 'ERC1155'
  externalUrl?: string
  animationUrl?: string
}

export interface NFTProvider {
  getUserNFTs(ownerAddress: string, contractAddresses?: string[]): Promise<EnhancedNFT[]>
  getNFTMetadata(contractAddress: string, tokenId: string): Promise<EnhancedNFTMetadata>
  validateContract(contractAddress: string): Promise<{
    isValid: boolean
    detectedType: 'ERC721' | 'ERC1155' | null
    error?: string
  }>
}

/**
 * Alchemy SDK provider for enhanced NFT data
 * Provides rich metadata, ownership validation, and collection information
 */
export class AlchemyNFTProvider implements NFTProvider {
  private alchemy: Alchemy
  private networkConfig: {
    network: Network
    name: string
  }

  constructor(apiKey: string, network: Network = Network.ETH_MAINNET) {
    this.alchemy = new Alchemy({
      apiKey,
      network,
      maxRetries: 3,
    })
    
    this.networkConfig = {
      network,
      name: this.getNetworkName(network)
    }
  }

  private getNetworkName(network: Network): string {
    switch (network) {
      case Network.ETH_MAINNET: return 'Ethereum'
      case Network.ETH_SEPOLIA: return 'Sepolia'
      case Network.BASE_MAINNET: return 'Base'
      case Network.BASE_SEPOLIA: return 'Base Sepolia'
      case Network.OPT_MAINNET: return 'Optimism'
      case Network.OPT_SEPOLIA: return 'Optimism Sepolia'
      case Network.MATIC_MAINNET: return 'Polygon'
      case Network.ARB_MAINNET: return 'Arbitrum'
      default: return 'Unknown'
    }
  }

  async getUserNFTs(
    ownerAddress: string,
    contractAddresses?: string[]
  ): Promise<EnhancedNFT[]> {
    try {
      // Input validation
      if (!ownerAddress || typeof ownerAddress !== 'string') {
        throw new Error('Invalid owner address provided')
      }

      const options: GetNftsForOwnerOptions = {
        contractAddresses,
        excludeFilters: [NftFilters.SPAM],
        orderBy: NftOrdering.TRANSFERTIME,
        omitMetadata: false,
        pageSize: 100
      }

      const response = await this.alchemy.nft.getNftsForOwner(ownerAddress, options)
      
      if (!response?.ownedNfts || !Array.isArray(response.ownedNfts)) {
        return []
      }

      // Safe mapping with proper type checking
      const enhancedNFTs: EnhancedNFT[] = response.ownedNfts
        .filter((nft): nft is OwnedNft => Boolean(nft && nft.contract?.address && nft.tokenId))
        .map((nft) => {
          // Safe type conversion with fallbacks
          const tokenType = isValidTokenType(nft.tokenType) ? nft.tokenType : 'ERC721'
          const contractAddress = sanitizeString(nft.contract.address, 42, '')
          const tokenId = sanitizeString(nft.tokenId, 78, '0') // Max uint256 length
          
          if (!contractAddress) {
            throw new Error(`Invalid contract address for NFT: ${nft.tokenId}`)
          }

          const enhanced: EnhancedNFT = {
            contractAddress,
            tokenId,
            tokenType,
            name: sanitizeString((nft as any).title || nft.contract.name, 100, `Token #${tokenId}`),
            description: sanitizeString((nft as any).description, 500),
            image: sanitizeString(nft.image?.originalUrl || nft.image?.thumbnailUrl, 500),
            traits: sanitizeAttributes((nft as any).rawMetadata?.attributes),
            collection: {
              name: sanitizeString(nft.contract.name, 100),
              address: contractAddress,
              verified: !Boolean(nft.contract.isSpam)
            },
            balance: this.safeParseBigInt(nft.balance, '1'),
            lastTransferTime: sanitizeString(nft.timeLastUpdated, 50)
          }

          return enhanced
        })
        .slice(0, 1000) // Prevent excessive results

      return enhancedNFTs
    } catch (error) {
      console.error('AlchemyNFTProvider: Failed to fetch user NFTs:', error)
      throw new Error(`Failed to fetch NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private safeParseBigInt(value: any, fallback: string = '0'): bigint {
    try {
      if (typeof value === 'string' || typeof value === 'number') {
        return BigInt(value)
      }
      return BigInt(fallback)
    } catch {
      return BigInt(fallback)
    }
  }

  async getNFTMetadata(
    contractAddress: string,
    tokenId: string
  ): Promise<EnhancedNFTMetadata> {
    try {
      // Input validation
      if (!contractAddress || !tokenId) {
        throw new Error('Contract address and token ID are required')
      }

      const metadata = await this.alchemy.nft.getNftMetadata(contractAddress, tokenId)
      
      if (!metadata) {
        throw new Error('No metadata returned from Alchemy')
      }

      // Safe metadata extraction with type checking
      const safeMetadata = metadata as Nft
      
      return {
        name: sanitizeString((safeMetadata as any).title, 100),
        description: sanitizeString((safeMetadata as any).description, 1000),
        image: sanitizeString(
          safeMetadata.image?.originalUrl || safeMetadata.image?.thumbnailUrl,
          500
        ),
        traits: sanitizeAttributes((safeMetadata as any).rawMetadata?.attributes),
        collection: sanitizeString(safeMetadata.contract?.name, 100),
        tokenType: isValidTokenType(safeMetadata.tokenType) ? safeMetadata.tokenType : 'ERC721',
        externalUrl: sanitizeString((safeMetadata as any).rawMetadata?.external_url, 500),
        animationUrl: sanitizeString((safeMetadata as any).rawMetadata?.animation_url, 500)
      }
    } catch (error) {
      console.error('AlchemyNFTProvider: Failed to fetch NFT metadata:', error)
      throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateContract(contractAddress: string): Promise<{
    isValid: boolean
    detectedType: 'ERC721' | 'ERC1155' | null
    error?: string
    isMalicious?: boolean
    warnings?: string[]
  }> {
    try {
      // Input validation
      if (!contractAddress || typeof contractAddress !== 'string') {
        return {
          isValid: false,
          detectedType: null,
          error: 'Invalid contract address provided'
        }
      }

      // Basic format validation
      const addressRegex = /^0x[a-fA-F0-9]{40}$/
      if (!addressRegex.test(contractAddress)) {
        return {
          isValid: false,
          detectedType: null,
          error: 'Invalid contract address format'
        }
      }

      // Try to get contract metadata to validate it's an NFT contract
      const metadata = await this.alchemy.nft.getNftMetadata(contractAddress, "1")
      
      if (!metadata) {
        return {
          isValid: false,
          detectedType: null,
          error: 'Unable to fetch contract metadata - contract may not exist or is not an NFT contract'
        }
      }

      const safeMetadata = metadata as Nft
      const tokenType = safeMetadata.tokenType
      const warnings: string[] = []
      
      // Check for suspicious indicators
      let isMalicious = false
      if (safeMetadata.contract?.isSpam) {
        warnings.push('Contract is marked as spam by Alchemy')
        isMalicious = true
      }

      // Additional validation checks
      if (!safeMetadata.contract?.name || safeMetadata.contract.name.length < 2) {
        warnings.push('Contract has no name or very short name')
      }

      if (isValidTokenType(tokenType)) {
        return {
          isValid: true,
          detectedType: tokenType,
          isMalicious,
          warnings: warnings.length > 0 ? warnings : undefined
        }
      } else {
        return {
          isValid: false,
          detectedType: null,
          error: 'Contract is not a valid ERC721 or ERC1155 NFT contract',
          isMalicious
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Contract validation failed'
      
      // Check for specific error patterns that might indicate malicious contracts
      const suspiciousPatterns = [
        'execution reverted',
        'out of gas',
        'invalid opcode',
        'revert',
        'timeout'
      ]
      
      const isMalicious = suspiciousPatterns.some(pattern => 
        errorMessage.toLowerCase().includes(pattern)
      )

      return {
        isValid: false,
        detectedType: null,
        error: errorMessage,
        isMalicious
      }
    }
  }

  private async getFloorPrice(contractAddress: string): Promise<number> {
    try {
      if (!contractAddress) return 0
      
      const floorPrice = await this.alchemy.nft.getFloorPrice(contractAddress)
      
      // Safely extract floor price with type checking
      if (floorPrice && typeof floorPrice === 'object') {
        const floorData = floorPrice as { openSea?: { floorPrice?: number } }
        return sanitizeNumber(floorData.openSea?.floorPrice, 0)
      }
      
      return 0
    } catch (error) {
      console.warn('Failed to fetch floor price:', error instanceof Error ? error.message : 'Unknown error')
      return 0
    }
  }

  private async getTraitRarity(
    contractAddress: string, 
    traits: any[]
  ): Promise<Record<string, number>> {
    // Simplified rarity calculation - in production you'd use proper rarity APIs
    const rarityMap: Record<string, number> = {}
    
    try {
      // For now, assign random rarity scores
      // In production, you'd call proper rarity APIs like trait_sniper or rarity.tools
      for (const trait of traits) {
        if (trait.trait_type) {
          // Simulate rarity calculation (0.0 to 1.0, where lower is rarer)
          rarityMap[trait.trait_type] = Math.random() * 0.5 + 0.1 // 0.1 to 0.6
        }
      }
    } catch (error) {
      console.warn('Failed to calculate trait rarity:', error)
    }
    
    return rarityMap
  }

  // Additional utility methods
  async getCollectionInfo(contractAddress: string) {
    try {
      const metadata = await this.alchemy.nft.getContractMetadata(contractAddress)
      const floorPrice = await this.getFloorPrice(contractAddress)
      
      return {
        name: metadata.name,
        symbol: metadata.symbol,
        totalSupply: metadata.totalSupply,
        tokenType: metadata.tokenType,
        verified: true, // Default to verified; spam detection would need additional API calls
        floorPrice
      }
    } catch (error) {
      console.error('Failed to fetch collection info:', error)
      return null
    }
  }

  async searchNFTs(query: string, ownerAddress?: string): Promise<EnhancedNFT[]> {
    try {
      // This would use Alchemy's search capabilities
      // For now, we'll implement a basic search by getting all NFTs and filtering
      if (ownerAddress) {
        const allNFTs = await this.getUserNFTs(ownerAddress)
        return allNFTs.filter(nft => 
          nft.name?.toLowerCase().includes(query.toLowerCase()) ||
          nft.collection.name?.toLowerCase().includes(query.toLowerCase()) ||
          nft.contractAddress.toLowerCase().includes(query.toLowerCase())
        )
      }
      
      return []
    } catch (error) {
      console.error('NFT search failed:', error)
      return []
    }
  }
}
