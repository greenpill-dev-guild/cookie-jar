import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import '@testing-library/jest-dom'

// Import hooks to test
import { useEnhancedNFTs, useNFTMetadata, useEnhancedNFTValidation } from '@/hooks/useEnhancedNFTs'
import { useNFTBalanceProof } from '@/hooks/useNFTBalanceProof'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useChainId: jest.fn(() => 1), // Ethereum mainnet
  useBlockNumber: jest.fn(() => ({ data: 100, isLoading: false })),
  useReadContract: jest.fn(),
}))

// Mock Alchemy SDK with controllable failures
const mockAlchemyProvider = {
  getUserNFTs: jest.fn(),
  getNFTMetadata: jest.fn(),
  validateContract: jest.fn(),
}

jest.mock('@/lib/nft-providers/AlchemyProvider', () => ({
  AlchemyNFTProvider: jest.fn().mockImplementation(() => mockAlchemyProvider),
}))

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_ALCHEMY_API_KEY: 'test-api-key'
  }
})

afterEach(() => {
  process.env = originalEnv
})

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Enhanced Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useEnhancedNFTs Error Scenarios', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network request failed')
      mockAlchemyProvider.getUserNFTs.mockRejectedValue(networkError)

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Network request failed')
        expect(result.current.nfts).toEqual([])
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles API rate limit errors', async () => {
      const rateLimitError = new Error('API rate limit exceeded. Please wait and try again.')
      mockAlchemyProvider.getUserNFTs.mockRejectedValue(rateLimitError)

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('rate limit')
        expect(result.current.rateLimitStatus.canMakeRequest).toBe(false)
      })
    })

    it('handles timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      mockAlchemyProvider.getUserNFTs.mockRejectedValue(timeoutError)

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('timeout')
      })
    })

    it('handles invalid API response format', async () => {
      mockAlchemyProvider.getUserNFTs.mockResolvedValue('invalid response')

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('Invalid response format')
      })
    })

    it('handles missing API key gracefully', async () => {
      delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      expect(result.current.nfts).toEqual([])
      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('handles race conditions during network switching', async () => {
      let requestCount = 0
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        const currentRequest = ++requestCount
        
        // Simulate different response times
        await new Promise(resolve => setTimeout(resolve, currentRequest * 100))
        
        if (currentRequest === 1) {
          throw new Error('Request outdated, ignoring result')
        }
        
        return [{ contractAddress: '0x123', tokenId: '1', tokenType: 'ERC721' }]
      })

      const { result, rerender } = renderHook(
        ({ chainId }) => useEnhancedNFTs({ enabled: true }),
        { 
          wrapper: createWrapper(),
          initialProps: { chainId: 1 }
        }
      )

      // Simulate rapid network switching
      rerender({ chainId: 8453 })
      rerender({ chainId: 10 })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        // Should only have results from the last request
        expect(result.current.nfts.length).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('useNFTMetadata Error Scenarios', () => {
    it('handles malformed metadata gracefully', async () => {
      mockAlchemyProvider.getNFTMetadata.mockResolvedValue({
        // Missing required fields
        description: 'Test description',
        // Invalid image URL
        image: 'javascript:alert("xss")',
        // Malformed attributes
        attributes: 'not an array'
      })

      const { result } = renderHook(
        () => useNFTMetadata('0x1234567890123456789012345678901234567890', '1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
        // Should sanitize the malicious URL
        expect(result.current.data?.image).toBe('')
        // Should handle malformed attributes
        expect(result.current.data?.traits).toEqual([])
      })
    })

    it('handles missing contract metadata', async () => {
      mockAlchemyProvider.getNFTMetadata.mockResolvedValue(null)

      const { result } = renderHook(
        () => useNFTMetadata('0x1234567890123456789012345678901234567890', '1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('No metadata returned')
      })
    })

    it('handles excessive metadata size', async () => {
      const largeMetadata = {
        name: 'A'.repeat(10000), // Very long name
        description: 'B'.repeat(50000), // Very long description
        traits: Array.from({ length: 1000 }, (_, i) => ({ // Many traits
          trait_type: `trait_${i}`,
          value: `value_${i}`
        }))
      }

      mockAlchemyProvider.getNFTMetadata.mockResolvedValue(largeMetadata)

      const { result } = renderHook(
        () => useNFTMetadata('0x1234567890123456789012345678901234567890', '1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const metadata = result.current.data
        expect(metadata?.name?.length).toBeLessThanOrEqual(100)
        expect(metadata?.description?.length).toBeLessThanOrEqual(1000)
        expect(metadata?.traits?.length).toBeLessThanOrEqual(20)
      })
    })
  })

  describe('useEnhancedNFTValidation Error Scenarios', () => {
    it('handles malicious contract detection', async () => {
      mockAlchemyProvider.validateContract.mockResolvedValue({
        isValid: false,
        detectedType: null,
        isMalicious: true,
        warnings: ['Contract is marked as spam', 'Suspicious activity detected'],
        error: 'execution reverted'
      })

      const { result } = renderHook(
        () => useEnhancedNFTValidation('0xbadcontract123456789012345678901234567890'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const validation = result.current.data
        expect(validation?.isMalicious).toBe(true)
        expect(validation?.warnings).toHaveLength(2)
      })
    })

    it('handles contract validation timeout', async () => {
      const timeoutError = new Error('Validation request timeout')
      mockAlchemyProvider.validateContract.mockRejectedValue(timeoutError)

      const { result } = renderHook(
        () => useEnhancedNFTValidation('0x1234567890123456789012345678901234567890'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('timeout')
      })
    })

    it('handles non-existent contracts', async () => {
      mockAlchemyProvider.validateContract.mockResolvedValue({
        isValid: false,
        detectedType: null,
        error: 'Unable to fetch contract metadata - contract may not exist'
      })

      const { result } = renderHook(
        () => useEnhancedNFTValidation('0xnonexistent123456789012345678901234567890'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const validation = result.current.data
        expect(validation?.isValid).toBe(false)
        expect(validation?.error).toContain('may not exist')
      })
    })
  })

  describe('useNFTBalanceProof Error Scenarios', () => {
    it('handles stale balance proofs', async () => {
      const mockUseReadContract = require('wagmi').useReadContract as jest.Mock
      mockUseReadContract.mockReturnValue({
        data: 5n, // User has 5 tokens
        isLoading: false,
        error: null
      })

      const mockUseBlockNumber = require('wagmi').useBlockNumber as jest.Mock
      mockUseBlockNumber.mockReturnValue({
        data: 200n, // Current block is much higher
        isLoading: false
      })

      const { result } = renderHook(
        () => useNFTBalanceProof(
          '0x1234567890123456789012345678901234567890',
          '1',
          1n, // Required minimum balance
          150n // Old block number
        ),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isStale).toBe(true)
        expect(result.current.proof).toBeNull()
      })
    })

    it('handles contract read errors', async () => {
      const mockUseReadContract = require('wagmi').useReadContract as jest.Mock
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Contract call failed')
      })

      const { result } = renderHook(
        () => useNFTBalanceProof(
          '0x1234567890123456789012345678901234567890',
          '1',
          1n,
          100n
        ),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.proof).toBeNull()
        expect(result.current.error).toContain('Contract call failed')
      })
    })
  })

  describe('Error Recovery and Retry Logic', () => {
    it('retries failed requests with exponential backoff', async () => {
      let attemptCount = 0
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary network error')
        }
        return [{ contractAddress: '0x123', tokenId: '1', tokenType: 'ERC721' }]
      })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
          },
        },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.nfts).toHaveLength(1)
        expect(attemptCount).toBe(3) // Should have retried twice
      }, { timeout: 10000 })
    })

    it('does not retry rate limit errors', async () => {
      let attemptCount = 0
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        attemptCount++
        throw new Error('API rate limit exceeded. Please wait and try again.')
      })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message.includes('rate limit')) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('rate limit')
        expect(attemptCount).toBe(1) // Should not retry rate limit errors
      })
    })
  })

  describe('Concurrent Request Handling', () => {
    it('handles maximum concurrent request limits', async () => {
      let activeRequests = 0
      let maxConcurrent = 0

      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        activeRequests++
        maxConcurrent = Math.max(maxConcurrent, activeRequests)
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
        activeRequests--
        return []
      })

      // Start multiple requests simultaneously
      const hooks = Array.from({ length: 10 }, () => 
        renderHook(() => useEnhancedNFTs({ enabled: true }), { wrapper: createWrapper() })
      )

      await waitFor(() => {
        hooks.forEach(({ result }) => {
          expect(result.current.isLoading).toBe(false)
        })
      })

      // Should respect concurrent request limits (max 3 per rate limit config)
      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })
  })

  describe('Memory and Performance Error Scenarios', () => {
    it('handles excessive NFT collection sizes', async () => {
      const largeCollection = Array.from({ length: 10000 }, (_, i) => ({
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: i.toString(),
        tokenType: 'ERC721' as const,
        name: `Token ${i}`,
        collection: { name: 'Large Collection', address: '0x123' },
        balance: 1n
      }))

      mockAlchemyProvider.getUserNFTs.mockResolvedValue(largeCollection)

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Should limit results to prevent memory issues
        expect(result.current.nfts.length).toBeLessThanOrEqual(1000)
      })
    })
  })
})

// Utility functions for testing error scenarios
export const createErrorScenarios = () => {
  return {
    networkError: () => new Error('Network request failed'),
    rateLimitError: () => new Error('API rate limit exceeded. Please wait and try again.'),
    timeoutError: () => new Error('Request timeout'),
    maliciousContractError: () => new Error('execution reverted'),
    invalidFormatError: () => new Error('Invalid response format from NFT provider'),
    contractNotFoundError: () => new Error('Unable to fetch contract metadata - contract may not exist'),
  }
}

// Mock data generators for testing
export const createMockNFTData = () => {
  return {
    validNFT: {
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '1',
      tokenType: 'ERC721' as const,
      name: 'Test NFT',
      collection: { name: 'Test Collection', address: '0x123' },
      balance: 1n
    },
    maliciousNFT: {
      contractAddress: '0xbadcontract123456789012345678901234567890',
      tokenId: '1',
      tokenType: 'ERC721' as const,
      name: '<script>alert("xss")</script>',
      description: 'javascript:alert("malicious")',
      image: 'data:text/html,<script>alert("xss")</script>',
      collection: { name: 'Malicious Collection', address: '0xbad' },
      balance: 1n
    }
  }
}
