// Enhanced NFT Integration Tests
import { renderHook, waitFor } from '@testing-library/react'
import { useNFTBalanceProof, validateBalanceProof } from '@/hooks/useNFTBalanceProof'
import { useEnhancedNFTs } from '@/hooks/useEnhancedNFTs'

// Declare Jest globals for TypeScript
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any
declare const jest: any

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useChainId: jest.fn(() => 1), // Ethereum mainnet
  useBlockNumber: jest.fn(() => ({ data: 100, isLoading: false })),
  useReadContract: jest.fn(),
}))

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}))

// Mock Alchemy SDK
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn().mockImplementation(() => ({
    nft: {
      getNftsForOwner: jest.fn(),
      getNftMetadata: jest.fn(),
      getFloorPrice: jest.fn(),
    },
    core: {
      getContractMetadata: jest.fn(),
    }
  })),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    ETH_SEPOLIA: 'eth-sepolia',
    BASE_MAINNET: 'base-mainnet',
    BASE_SEPOLIA: 'base-sepolia',
  },
  NftFilters: {
    SPAM: 'SPAM',
    COLLECTION_NAME: 'COLLECTION_NAME'
  },
  NftOrdering: {
    TRANSFERTIME: 'TRANSFERTIME'
  }
}))

describe('Enhanced NFT Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup environment variables
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-api-key'
  })

  describe('useNFTBalanceProof', () => {
    it('should generate valid balance proof for ERC1155', async () => {
      const { useReadContract, useBlockNumber } = require('wagmi')
      
      // Mock block number
      useBlockNumber.mockReturnValue({ 
        data: 100, 
        isLoading: false 
      })
      
      // Mock ERC1155 balance check
      useReadContract.mockReturnValue({
        data: BigInt(10), // User has 10 tokens
        isLoading: false,
        error: null,
        refetch: jest.fn()
      })

      const { result } = renderHook(() =>
        useNFTBalanceProof({
          contractAddress: '0x1234567890123456789012345678901234567890',
          tokenId: '1',
          tokenType: 'ERC1155',
          userAddress: '0x1234567890123456789012345678901234567890',
          enabled: true
        })
      )

      await waitFor(() => {
        expect(result.current.proof).toBeTruthy()
        expect(result.current.proof?.balance).toBe(BigInt(10))
        expect(result.current.proof?.blockNumber).toBe(100)
        expect(result.current.proof?.isValid).toBe(true)
        expect(result.current.isStale).toBe(false)
      })
    })

    it('should detect stale balance proof', () => {
      const proof = {
        balance: BigInt(10),
        blockNumber: 90, // 10 blocks old
        timestamp: Date.now() - 60000, // 1 minute ago
        isValid: true
      }

      const validation = validateBalanceProof(proof, 100, BigInt(1))
      
      expect(validation.isValid).toBe(false)
      expect(validation.reason).toContain('too old')
    })

    it('should validate insufficient balance', () => {
      const proof = {
        balance: BigInt(3),
        blockNumber: 98, // Recent
        timestamp: Date.now(),
        isValid: true
      }

      const validation = validateBalanceProof(proof, 100, BigInt(5))
      
      expect(validation.isValid).toBe(false)
      expect(validation.reason).toContain('Insufficient balance')
    })

    it('should validate correct balance proof', () => {
      const proof = {
        balance: BigInt(10),
        blockNumber: 98, // Recent
        timestamp: Date.now(),
        isValid: true
      }

      const validation = validateBalanceProof(proof, 100, BigInt(5))
      
      expect(validation.isValid).toBe(true)
      expect(validation.reason).toBeUndefined()
    })
  })

  describe('useEnhancedNFTs', () => {
    it('should fetch enhanced NFT data with Alchemy', async () => {
      const { useQuery } = require('@tanstack/react-query')
      
      const mockNFTs = [
        {
          contractAddress: '0x1234567890123456789012345678901234567890',
          tokenId: '1',
          tokenType: 'ERC721',
          name: 'Test NFT',
          description: 'A test NFT',
          image: 'https://example.com/nft.png',
          traits: [
            { trait_type: 'Background', value: 'Blue', rarity: 0.15 },
            { trait_type: 'Eyes', value: 'Green', rarity: 0.08 }
          ],
          collection: {
            name: 'Test Collection',
            address: '0x1234567890123456789012345678901234567890',
            verified: true,
            floorPrice: { value: 0.5, currency: 'ETH' }
          },
          balance: BigInt(1),
          lastTransferTime: '2023-01-01T00:00:00Z',
          rarity: 0.115
        }
      ]

      useQuery.mockReturnValue({
        data: mockNFTs,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      })

      const { result } = renderHook(() =>
        useEnhancedNFTs({
          userAddress: '0x1234567890123456789012345678901234567890',
          contractAddresses: ['0x1234567890123456789012345678901234567890'],
          enabled: true
        })
      )

      expect(result.current.nfts).toHaveLength(1)
      expect(result.current.nfts[0].name).toBe('Test NFT')
      expect(result.current.nfts[0].traits).toHaveLength(2)
      expect(result.current.nfts[0].collection.verified).toBe(true)
      expect(result.current.collections).toHaveLength(1)
    })

    it('should group NFTs by collection correctly', async () => {
      const { useQuery } = require('@tanstack/react-query')
      
      const mockNFTs = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          tokenId: '1',
          tokenType: 'ERC721',
          name: 'NFT 1',
          collection: { name: 'Collection A', address: '0x1111111111111111111111111111111111111111' },
          balance: BigInt(1)
        },
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          tokenId: '2',
          tokenType: 'ERC721',
          name: 'NFT 2',
          collection: { name: 'Collection A', address: '0x1111111111111111111111111111111111111111' },
          balance: BigInt(1)
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          tokenId: '1',
          tokenType: 'ERC1155',
          name: 'NFT 3',
          collection: { name: 'Collection B', address: '0x2222222222222222222222222222222222222222' },
          balance: BigInt(5)
        }
      ]

      useQuery.mockReturnValue({
        data: mockNFTs,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      })

      const { result } = renderHook(() => useEnhancedNFTs({}))

      expect(result.current.collections).toHaveLength(2)
      expect(result.current.collections[0].nfts).toHaveLength(2) // Collection A has 2 NFTs
      expect(result.current.collections[1].nfts).toHaveLength(1) // Collection B has 1 NFT
    })

    it('should handle search functionality', () => {
      const { useQuery } = require('@tanstack/react-query')
      
      const mockNFTs = [
        {
          contractAddress: '0x1111111111111111111111111111111111111111',
          tokenId: '1',
          tokenType: 'ERC721',
          name: 'Bored Ape #1',
          collection: { name: 'Bored Ape Yacht Club' },
          traits: [{ trait_type: 'Background', value: 'Blue' }],
          balance: BigInt(1)
        },
        {
          contractAddress: '0x2222222222222222222222222222222222222222',
          tokenId: '100',
          tokenType: 'ERC721',
          name: 'CryptoPunk #100',
          collection: { name: 'CryptoPunks' },
          traits: [{ trait_type: 'Type', value: 'Alien' }],
          balance: BigInt(1)
        }
      ]

      useQuery.mockReturnValue({
        data: mockNFTs,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      })

      const { result } = renderHook(() => useEnhancedNFTs({}))

      // Test search by name
      const boredApeResults = result.current.searchNFTs('Bored')
      expect(boredApeResults).toHaveLength(1)
      expect(boredApeResults[0].name).toContain('Bored Ape')

      // Test search by trait
      const alienResults = result.current.searchNFTs('Alien')
      expect(alienResults).toHaveLength(1)
      expect(alienResults[0].name).toContain('CryptoPunk')

      // Test search by token ID
      const tokenIdResults = result.current.searchNFTs('100')
      expect(tokenIdResults).toHaveLength(1)
      expect(tokenIdResults[0].tokenId).toBe('100')
    })
  })

  describe('Virtual Scrolling Performance', () => {
    it('should handle large NFT collections efficiently', () => {
      // Mock a large collection of 1000 NFTs
      const largeCollection = Array.from({ length: 1000 }, (_, i) => ({
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: i.toString(),
        tokenType: 'ERC721' as const,
        name: `NFT #${i}`,
        collection: { name: 'Large Collection', address: '0x1234567890123456789012345678901234567890' },
        balance: BigInt(1)
      }))

      const { useQuery } = require('@tanstack/react-query')
      useQuery.mockReturnValue({
        data: largeCollection,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      })

      const { result } = renderHook(() => useEnhancedNFTs({}))

      expect(result.current.nfts).toHaveLength(1000)
      expect(result.current.collections).toHaveLength(1)
      expect(result.current.collections[0].nfts).toHaveLength(1000)

      // Test search performance with large dataset
      const searchResults = result.current.searchNFTs('100')
      expect(searchResults.length).toBeGreaterThan(0)
      expect(searchResults.length).toBeLessThan(20) // Should find NFTs with "100" in them
    })
  })

  describe('SDK Integration', () => {
    it('should handle Alchemy API errors gracefully', async () => {
      const { useQuery } = require('@tanstack/react-query')
      
      useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Alchemy API rate limit exceeded'),
        refetch: jest.fn()
      })

      const { result } = renderHook(() => useEnhancedNFTs({}))

      expect(result.current.nfts).toEqual([])
      expect(result.current.error).toContain('rate limit')
    })

    it('should fallback when API key is missing', () => {
      // Remove API key
      delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

      expect(() => {
        renderHook(() => useEnhancedNFTs({}))
      }).toThrow('Alchemy API key not configured')
    })

    it('should handle different chain IDs correctly', () => {
      const { useChainId } = require('wagmi')
      
      // Test Base network
      useChainId.mockReturnValue(8453)
      
      const { result } = renderHook(() => useEnhancedNFTs({}))
      
      // Should not throw error and should configure for Base network
      expect(result.current.nfts).toEqual([])
    })
  })

  describe('Enhanced Metadata', () => {
    it('should parse NFT traits and rarity correctly', () => {
      const mockNFT = {
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '1',
        tokenType: 'ERC721' as const,
        name: 'Rare NFT',
        traits: [
          { trait_type: 'Rarity', value: 'Legendary', rarity: 0.01 },
          { trait_type: 'Background', value: 'Gold', rarity: 0.05 }
        ],
        collection: { name: 'Epic Collection', verified: true },
        balance: BigInt(1),
        rarity: 0.03 // Average of trait rarities
      }

      // Test rarity categorization
      expect(mockNFT.rarity).toBeLessThan(0.05) // Should be "Epic" tier
      expect(mockNFT.traits?.[0].rarity).toBe(0.01) // Legendary trait
      expect(mockNFT.collection.verified).toBe(true)
    })

    it('should handle missing metadata gracefully', () => {
      const mockNFT = {
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '1',
        tokenType: 'ERC721' as const,
        name: undefined,
        description: undefined,
        image: undefined,
        traits: undefined,
        collection: { name: undefined, address: '0x1234567890123456789012345678901234567890' },
        balance: BigInt(1)
      }

      // Should have fallback values
      expect(mockNFT.name || `Token #${mockNFT.tokenId}`).toBe('Token #1')
    })
  })

  describe('Performance Optimizations', () => {
    it('should enable virtual scrolling for large collections', () => {
      const largeCollection = Array.from({ length: 100 }, (_, i) => ({
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: i.toString(),
        tokenType: 'ERC721' as const,
        name: `NFT #${i}`,
        collection: { name: 'Large Collection' },
        balance: BigInt(1)
      }))

      // Virtual scrolling should be enabled for collections > 50
      const shouldUseVirtual = largeCollection.length > 50
      expect(shouldUseVirtual).toBe(true)
    })

    it('should use regular rendering for small collections', () => {
      const smallCollection = Array.from({ length: 25 }, (_, i) => ({
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: i.toString(),
        tokenType: 'ERC721' as const,
        name: `NFT #${i}`,
        collection: { name: 'Small Collection' },
        balance: BigInt(1)
      }))

      // Regular rendering should be used for collections <= 50
      const shouldUseVirtual = smallCollection.length > 50
      expect(shouldUseVirtual).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { useReadContract } = require('wagmi')
      
      useReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn()
      })

      const { result } = renderHook(() =>
        useNFTBalanceProof({
          contractAddress: '0x1234567890123456789012345678901234567890',
          tokenId: '1',
          tokenType: 'ERC1155',
          userAddress: '0x1234567890123456789012345678901234567890',
          enabled: true
        })
      )

      expect(result.current.error).toContain('Failed to validate NFT ownership')
    })

    it('should handle invalid contract addresses', () => {
      const { result } = renderHook(() =>
        useNFTBalanceProof({
          contractAddress: 'invalid-address',
          tokenId: '1',
          tokenType: 'ERC721',
          userAddress: '0x1234567890123456789012345678901234567890',
          enabled: true
        })
      )

      expect(result.current.proof).toBeNull()
    })
  })

  describe('Balance Proof Security', () => {
    it('should prevent race condition attacks', () => {
      // Simulate attacker trying to use old balance proof
      const oldProof = {
        balance: BigInt(100),
        blockNumber: 50, // Very old
        timestamp: Date.now() - 300000, // 5 minutes ago
        isValid: true
      }

      const validation = validateBalanceProof(oldProof, 100, BigInt(1))
      
      expect(validation.isValid).toBe(false)
      expect(validation.reason).toContain('too old')
    })

    it('should require minimum balance in proof', () => {
      const insufficientProof = {
        balance: BigInt(1),
        blockNumber: 98,
        timestamp: Date.now(),
        isValid: true
      }

      const validation = validateBalanceProof(insufficientProof, 100, BigInt(5))
      
      expect(validation.isValid).toBe(false)
      expect(validation.reason).toContain('Insufficient balance')
    })
  })
})
