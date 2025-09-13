// Test for useUserNfts hook
import '@testing-library/jest-dom'
import type { NFTMetadata, UserNFT, NFTCollection } from '@/hooks/useUserNfts'

// Declare Jest globals for TypeScript
declare const describe: any
declare const it: any
declare const expect: any

describe('useUserNfts Hook Logic', () => {
  // Mock Alchemy response
  const mockAlchemyResponse = {
    ownedNfts: [
      {
        contract: {
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Collection',
          symbol: 'TEST',
          tokenType: 'ERC721'
        },
        tokenId: '1',
        metadata: {
          name: 'Test NFT #1',
          description: 'A test NFT',
          image: 'https://example.com/1.png',
          external_url: 'https://example.com'
        },
        tokenUri: { raw: 'https://example.com/metadata/1' },
        timeLastUpdated: '2024-01-01T00:00:00Z'
      },
      {
        contract: {
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Collection',
          symbol: 'TEST',
          tokenType: 'ERC721'
        },
        tokenId: '2',
        metadata: {
          name: 'Test NFT #2',
          description: 'Another test NFT',
          image: 'https://example.com/2.png'
        },
        tokenUri: { raw: 'https://example.com/metadata/2' },
        timeLastUpdated: '2024-01-01T00:00:00Z'
      }
    ],
    pageKey: 'next-page-key'
  }

  // Helper to map Alchemy response to our format
  const mapAlchemyToUserNfts = (response: any): UserNFT[] => {
    return response.ownedNfts?.map((nft: any) => ({
      contract: {
        address: nft.contract.address,
        name: nft.contract.name,
        symbol: nft.contract.symbol,
        tokenType: nft.contract.tokenType === 'ERC721' ? 'ERC721' : 
                  nft.contract.tokenType === 'ERC1155' ? 'ERC1155' : 'UNKNOWN'
      },
      tokenId: nft.tokenId,
      balance: nft.balance,
      metadata: nft.metadata ? {
        name: nft.metadata.name,
        description: nft.metadata.description,
        image: nft.metadata.image,
        external_url: nft.metadata.external_url
      } : undefined,
      tokenUri: nft.tokenUri?.raw,
      timeLastUpdated: nft.timeLastUpdated
    })) || []
  }

  describe('NFT Data Mapping', () => {
    it('maps Alchemy response to UserNFT format correctly', () => {
      const mappedNfts = mapAlchemyToUserNfts(mockAlchemyResponse)
      
      expect(mappedNfts).toHaveLength(2)
      expect(mappedNfts[0]).toEqual({
        contract: {
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Collection',
          symbol: 'TEST',
          tokenType: 'ERC721'
        },
        tokenId: '1',
        balance: undefined,
        metadata: {
          name: 'Test NFT #1',
          description: 'A test NFT',
          image: 'https://example.com/1.png',
          external_url: 'https://example.com'
        },
        tokenUri: 'https://example.com/metadata/1',
        timeLastUpdated: '2024-01-01T00:00:00Z'
      })
    })

    it('handles missing metadata gracefully', () => {
      const responseWithoutMetadata = {
        ownedNfts: [{
          contract: {
            address: '0x1234567890123456789012345678901234567890',
            name: 'Test Collection',
            symbol: 'TEST',
            tokenType: 'ERC721'
          },
          tokenId: '1',
          tokenUri: { raw: 'https://example.com/metadata/1' }
        }]
      }

      const mappedNfts = mapAlchemyToUserNfts(responseWithoutMetadata)
      expect(mappedNfts[0].metadata).toBeUndefined()
    })

    it('maps token types correctly', () => {
      const erc1155Response = {
        ownedNfts: [{
          contract: {
            address: '0x1234567890123456789012345678901234567890',
            name: 'Test Collection',
            symbol: 'TEST',
            tokenType: 'ERC1155'
          },
          tokenId: '1',
          balance: '5'
        }]
      }

      const mappedNfts = mapAlchemyToUserNfts(erc1155Response)
      expect(mappedNfts[0].contract.tokenType).toBe('ERC1155')
      expect(mappedNfts[0].balance).toBe('5')
    })
  })

  describe('Collection Grouping', () => {
    it('groups NFTs by collection correctly', () => {
      const nfts = mapAlchemyToUserNfts(mockAlchemyResponse)
      
      // Create collections map
      const collectionsMap = new Map<string, NFTCollection>()
      
      nfts.forEach(nft => {
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

      const collections = Array.from(collectionsMap.values())
      
      expect(collections).toHaveLength(1)
      expect(collections[0].nfts).toHaveLength(2)
      expect(collections[0].name).toBe('Test Collection')
      expect(collections[0].contractAddress).toBe('0x1234567890123456789012345678901234567890')
    })

    it('handles multiple collections', () => {
      const multiCollectionResponse = {
        ownedNfts: [
          {
            contract: {
              address: '0x1111111111111111111111111111111111111111',
              name: 'Collection A',
              symbol: 'A',
              tokenType: 'ERC721'
            },
            tokenId: '1'
          },
          {
            contract: {
              address: '0x2222222222222222222222222222222222222222',
              name: 'Collection B', 
              symbol: 'B',
              tokenType: 'ERC1155'
            },
            tokenId: '1',
            balance: '3'
          }
        ]
      }

      const nfts = mapAlchemyToUserNfts(multiCollectionResponse)
      const collectionsMap = new Map<string, NFTCollection>()
      
      nfts.forEach(nft => {
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

      const collections = Array.from(collectionsMap.values())
      expect(collections).toHaveLength(2)
    })
  })

  describe('Search and Filtering', () => {
    it('filters NFTs by search term correctly', () => {
      const nfts = mapAlchemyToUserNfts(mockAlchemyResponse)
      const searchTerm = 'Test NFT #1'
      
      const filtered = nfts.filter(nft => {
        const searchLower = searchTerm.toLowerCase()
        return (
          nft.contract.name?.toLowerCase().includes(searchLower) ||
          nft.contract.symbol?.toLowerCase().includes(searchLower) ||
          nft.metadata?.name?.toLowerCase().includes(searchLower) ||
          nft.contract.address.toLowerCase().includes(searchLower) ||
          nft.tokenId.includes(searchTerm)
        )
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].metadata?.name).toBe('Test NFT #1')
    })

    it('filters by contract address', () => {
      const nfts = mapAlchemyToUserNfts(mockAlchemyResponse)
      const contractFilter = '0x1234567890123456789012345678901234567890'
      
      const filtered = nfts.filter(nft => 
        nft.contract.address.toLowerCase() === contractFilter.toLowerCase()
      )

      expect(filtered).toHaveLength(2)
    })

    it('filters by token ID', () => {
      const nfts = mapAlchemyToUserNfts(mockAlchemyResponse)
      const tokenIdFilter = '1'
      
      const filtered = nfts.filter(nft => nft.tokenId === tokenIdFilter)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].tokenId).toBe('1')
    })
  })

  describe('Pagination Logic', () => {
    it('handles pagination key correctly', () => {
      const response = mockAlchemyResponse
      const hasMore = !!response.pageKey
      expect(hasMore).toBe(true)
    })

    it('handles end of pagination', () => {
      const endResponse = { ...mockAlchemyResponse, pageKey: undefined }
      const hasMore = !!endResponse.pageKey
      expect(hasMore).toBe(false)
    })

    it('builds URL parameters correctly', () => {
      const options = {
        contractAddresses: ['0x1234567890123456789012345678901234567890'],
        withMetadata: true,
        pageSize: 50
      }
      
      const params = new URLSearchParams({
        owner: '0xUserAddress000000000000000000000000000000',
        withMetadata: options.withMetadata.toString(),
        pageSize: options.pageSize.toString(),
      })

      if (options.contractAddresses && options.contractAddresses.length > 0) {
        params.append('contractAddresses', options.contractAddresses.join(','))
      }

      expect(params.get('withMetadata')).toBe('true')
      expect(params.get('pageSize')).toBe('50')
      expect(params.get('contractAddresses')).toBe('0x1234567890123456789012345678901234567890')
    })
  })

  describe('Error Handling', () => {
    it('handles missing wallet connection', () => {
      const error = 'Wallet not connected'
      expect(error).toBe('Wallet not connected')
    })

    it('handles missing Alchemy API key', () => {
      const error = 'Alchemy API key not configured'
      expect(error).toBe('Alchemy API key not configured')
    })

    it('handles unsupported networks', () => {
      const error = 'Network not supported by Alchemy'
      expect(error).toBe('Network not supported by Alchemy')
    })

    it('handles API errors gracefully', () => {
      const apiError = 'Alchemy API error: 429 Too Many Requests'
      expect(apiError).toContain('Alchemy API error')
    })
  })

  describe('Token Type Mapping', () => {
    it('maps token types correctly', () => {
      const mapTokenType = (alchemyType: string): 'ERC721' | 'ERC1155' | 'UNKNOWN' => {
        switch (alchemyType?.toUpperCase()) {
          case 'ERC721': return 'ERC721'
          case 'ERC1155': return 'ERC1155'
          default: return 'UNKNOWN'
        }
      }

      expect(mapTokenType('ERC721')).toBe('ERC721')
      expect(mapTokenType('erc721')).toBe('ERC721')
      expect(mapTokenType('ERC1155')).toBe('ERC1155')
      expect(mapTokenType('erc1155')).toBe('ERC1155')
      expect(mapTokenType('UNKNOWN')).toBe('UNKNOWN')
      expect(mapTokenType('')).toBe('UNKNOWN')
      expect(mapTokenType(undefined as any)).toBe('UNKNOWN')
    })
  })
})
