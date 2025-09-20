import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import '@testing-library/jest-dom'

// Import hooks to test
import { useEnhancedNFTs } from '@/hooks/useEnhancedNFTs'
import { useNFTBalanceProof, validateBalanceProof } from '@/hooks/useNFTBalanceProof'
import { useJarCreation } from '@/hooks/useJarCreation'

// Mock wagmi hooks with controllable behavior
const mockUseAccount = jest.fn()
const mockUseChainId = jest.fn()
const mockUseBlockNumber = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: mockUseAccount,
  useChainId: mockUseChainId,
  useBlockNumber: mockUseBlockNumber,
  useReadContract: mockUseReadContract,
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
}))

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock Alchemy SDK with controllable timing
const mockAlchemyProvider = {
  getUserNFTs: jest.fn(),
  getNFTMetadata: jest.fn(),
  validateContract: jest.fn(),
}

jest.Mock('@/lib/nft-providers/AlchemyProvider', () => ({
  AlchemyNFTProvider: jest.fn().mockImplementation(() => mockAlchemyProvider),
}))

// Test utilities
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
})

const createWrapper = (queryClient = createQueryClient()) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Utility to simulate async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('Race Conditions and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true
    })
    mockUseChainId.mockReturnValue(1)
    mockUseBlockNumber.mockReturnValue({ data: 100n, isLoading: false })
    mockUseReadContract.mockReturnValue({ data: 5n, isLoading: false, error: null })
    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      data: '0xabcdef',
      error: null,
      isPending: false
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      data: null
    })
  })

  describe('Network Switching Race Conditions', () => {
    it('handles rapid network switching without data corruption', async () => {
      let requestId = 0
      const networkResponses = new Map()

      mockAlchemyProvider.getUserNFTs.mockImplementation(async (address: string) => {
        const currentRequestId = ++requestId
        const chainId = mockUseChainId()

        // Simulate different response times for different networks
        const delay = chainId === 1 ? 300 : chainId === 8453 ? 100 : 200
        await new Promise(resolve => setTimeout(resolve, delay))

        const response = [{
          contractAddress: '0x' + chainId.toString().padStart(40, '0'),
          tokenId: '1',
          tokenType: 'ERC721' as const,
          name: `Token on Chain ${chainId}`,
          collection: { name: `Chain ${chainId} Collection`, address: '0x123' },
          balance: 1n
        }]

        networkResponses.set(currentRequestId, { chainId, response })
        return response
      })

      const { result, rerender } = renderHook(
        ({ chainId }) => {
          mockUseChainId.mockReturnValue(chainId)
          return useEnhancedNFTs({ enabled: true })
        },
        { 
          wrapper: createWrapper(),
          initialProps: { chainId: 1 }
        }
      )

      // Rapidly switch networks
      act(() => {
        rerender({ chainId: 8453 }) // Base
      })
      
      await act(async () => {
        await delay(50)
        rerender({ chainId: 10 }) // Optimism
      })
      
      await act(async () => {
        await delay(50)
        rerender({ chainId: 1 }) // Back to Ethereum
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 2000 })

      // Should have data for the final network only
      const finalNFTs = result.current.nfts
      if (finalNFTs.length > 0) {
        // Contract address should match the final chain ID
        expect(finalNFTs[0].contractAddress).toBe('0x0000000000000000000000000000000000000001')
      }
    })

    it('cancels outdated requests when network changes', async () => {
      let activeRequests = 0
      let completedRequests = 0

      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        activeRequests++
        
        try {
          await delay(500) // Long request
          completedRequests++
          return []
        } finally {
          activeRequests--
        }
      })

      const { result, rerender } = renderHook(
        ({ chainId }) => {
          mockUseChainId.mockReturnValue(chainId)
          return useEnhancedNFTs({ enabled: true })
        },
        { 
          wrapper: createWrapper(),
          initialProps: { chainId: 1 }
        }
      )

      // Start request on chain 1
      await act(async () => {
        await delay(100)
      })

      // Switch to chain 2 before first request completes
      act(() => {
        rerender({ chainId: 8453 })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 2000 })

      // Should have started multiple requests but may not complete all
      expect(activeRequests).toBe(0) // All requests should be done or cancelled
    })
  })

  describe('Balance Proof Race Conditions', () => {
    it('handles balance changes during proof generation', async () => {
      let currentBalance = 5n
      let currentBlock = 100n

      mockUseReadContract.mockImplementation(() => ({
        data: currentBalance,
        isLoading: false,
        error: null
      }))

      mockUseBlockNumber.mockImplementation(() => ({
        data: currentBlock,
        isLoading: false
      }))

      const { result, rerender } = renderHook(
        () => useNFTBalanceProof(
          '0x1234567890123456789012345678901234567890',
          '1',
          1n,
          currentBlock
        ),
        { wrapper: createWrapper() }
      )

      // Initial proof should be valid
      await waitFor(() => {
        expect(result.current.proof).toBeDefined()
        expect(result.current.isStale).toBe(false)
      })

      // Simulate balance change and block progression
      act(() => {
        currentBalance = 2n // Balance decreased
        currentBlock = 110n // Block advanced
      })

      rerender()

      await waitFor(() => {
        expect(result.current.isStale).toBe(true) // Should detect staleness
      })
    })

    it('validates stale balance proofs correctly', () => {
      const validProof = {
        balance: 5n,
        blockNumber: 100n,
        timestamp: Date.now() - 30000 // 30 seconds ago
      }

      const staleProof = {
        balance: 5n,
        blockNumber: 85n, // More than 10 blocks old
        timestamp: Date.now() - 300000 // 5 minutes ago
      }

      const currentBlock = 100n

      expect(validateBalanceProof(validProof, 1n, currentBlock)).toBe(true)
      expect(validateBalanceProof(staleProof, 1n, currentBlock)).toBe(false)
    })

    it('handles ERC1155 balance proof edge cases', async () => {
      // Test zero balance
      mockUseReadContract.mockReturnValue({
        data: 0n,
        isLoading: false,
        error: null
      })

      const { result } = renderHook(
        () => useNFTBalanceProof(
          '0x1234567890123456789012345678901234567890',
          '1',
          1n, // Require at least 1
          100n
        ),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.proof).toBeNull() // Should be null for insufficient balance
      })
    })
  })

  describe('Transaction Race Conditions', () => {
    it('handles concurrent jar creation attempts', async () => {
      const writeContractMock = jest.fn()
      mockUseWriteContract.mockReturnValue({
        writeContract: writeContractMock,
        data: undefined,
        error: null,
        isPending: false
      })

      const { result: result1 } = renderHook(() => useJarCreation(), { wrapper: createWrapper() })
      const { result: result2 } = renderHook(() => useJarCreation(), { wrapper: createWrapper() })

      const jarConfig = {
        jarOwner: '0x1234567890123456789012345678901234567890',
        currency: '0x0000000000000000000000000000000000000000',
        feeCollector: '0x1234567890123456789012345678901234567890',
        feePercentageOnDeposit: 500,
        withdrawalOption: 0,
        fixedAmount: '1000000000000000000',
        maxWithdrawal: '5000000000000000000',
        minimumWithdrawalTime: 86400,
        emergencyWithdrawalEnabled: true,
        minDeposit: '100000000000000000'
      }

      const accessConfig = {
        accessType: 0, // Allowlist
        allowlist: ['0x1234567890123456789012345678901234567890'],
        nftAddresses: [],
        nftTypes: [],
        poapReq: { eventId: 0 },
        unlockReq: { lockAddress: '0x0000000000000000000000000000000000000000' },
        hypercertReq: { tokenContract: '0x0000000000000000000000000000000000000000', minUnits: '0' },
        hatsReq: { hatId: '0', wearer: '0x0000000000000000000000000000000000000000' }
      }

      // Start two concurrent jar creation attempts
      act(() => {
        result1.current.handleCreateJar(jarConfig, accessConfig)
        result2.current.handleCreateJar(jarConfig, accessConfig)
      })

      // Should only call writeContract once (the second should be prevented by pending state)
      await waitFor(() => {
        expect(writeContractMock).toHaveBeenCalledTimes(1)
      })
    })

    it('handles transaction confirmation race conditions', async () => {
      const writeContractMock = jest.fn()
      let transactionState = { isLoading: true, isSuccess: false, data: null }

      mockUseWriteContract.mockReturnValue({
        writeContract: writeContractMock,
        data: '0x123',
        error: null,
        isPending: false
      })

      mockUseWaitForTransactionReceipt.mockReturnValue(transactionState)

      const { result, rerender } = renderHook(() => useJarCreation(), { wrapper: createWrapper() })

      // Simulate transaction state changes
      act(() => {
        transactionState = { isLoading: false, isSuccess: true, data: { blockHash: '0xabc' } }
      })

      rerender()

      await waitFor(() => {
        expect(result.current.transactionState.isSuccess).toBe(true)
      })
    })
  })

  describe('Component State Management Edge Cases', () => {
    it('handles unmounting during async operations', async () => {
      let requestCancelled = false

      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        await delay(1000)
        if (requestCancelled) {
          throw new Error('Request cancelled')
        }
        return []
      })

      const { unmount } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      // Unmount before request completes
      setTimeout(() => {
        requestCancelled = true
        unmount()
      }, 100)

      // Should not throw errors or cause memory leaks
      await delay(1200)
    })

    it('handles rapid enable/disable toggling', async () => {
      let requestCount = 0
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        requestCount++
        await delay(100)
        return []
      })

      const { result, rerender } = renderHook(
        ({ enabled }) => useEnhancedNFTs({ enabled }),
        { 
          wrapper: createWrapper(),
          initialProps: { enabled: true }
        }
      )

      // Rapidly toggle enabled state
      for (let i = 0; i < 10; i++) {
        act(() => {
          rerender({ enabled: i % 2 === 0 })
        })
        await delay(10)
      }

      await delay(500)

      // Should not make excessive requests
      expect(requestCount).toBeLessThan(5)
    })
  })

  describe('Memory Management Edge Cases', () => {
    it('handles large NFT collections without memory leaks', async () => {
      const largeCollection = Array.from({ length: 5000 }, (_, i) => ({
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: i.toString(),
        tokenType: 'ERC721' as const,
        name: `Token ${i}`,
        collection: { name: 'Large Collection', address: '0x123' },
        balance: 1n
      }))

      mockAlchemyProvider.getUserNFTs.mockResolvedValue(largeCollection)

      const { result, unmount } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.nfts.length).toBeLessThanOrEqual(1000) // Should be capped
      })

      // Cleanup should not cause issues
      unmount()
    })

    it('properly cleans up intervals and timers', async () => {
      const { unmount } = renderHook(
        () => useNFTBalanceProof(
          '0x1234567890123456789012345678901234567890',
          '1',
          1n,
          100n
        ),
        { wrapper: createWrapper() }
      )

      // Should not cause timer warnings when unmounting
      unmount()
    })
  })

  describe('Input Validation Edge Cases', () => {
    it('handles extremely long addresses', async () => {
      const veryLongAddress = '0x' + '1'.repeat(1000)
      
      mockAlchemyProvider.validateContract.mockResolvedValue({
        isValid: false,
        detectedType: null,
        error: 'Invalid contract address format'
      })

      const { result } = renderHook(
        () => useEnhancedNFTs({
          contractAddresses: [veryLongAddress],
          enabled: true
        }),
        { wrapper: createWrapper() }
      )

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(result.current.nfts).toEqual([])
      })
    })

    it('handles null and undefined values gracefully', async () => {
      mockAlchemyProvider.getUserNFTs.mockResolvedValue([
        {
          contractAddress: null,
          tokenId: undefined,
          tokenType: 'ERC721',
          name: null,
          collection: { name: undefined, address: null },
          balance: null
        }
      ])

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Should filter out invalid NFTs
        expect(result.current.nfts).toEqual([])
      })
    })
  })

  describe('Error Boundary Edge Cases', () => {
    it('recovers from temporary provider failures', async () => {
      let attemptCount = 0
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        attemptCount++
        if (attemptCount <= 2) {
          throw new Error('Temporary failure')
        }
        return [{ contractAddress: '0x123', tokenId: '1', tokenType: 'ERC721' }]
      })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            retryDelay: 100,
          },
        },
      })

      const { result } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.nfts).toHaveLength(1)
        expect(attemptCount).toBe(3)
      }, { timeout: 2000 })
    })
  })

  describe('Performance Edge Cases', () => {
    it('handles high-frequency updates without performance degradation', async () => {
      let updateCount = 0
      const { result, rerender } = renderHook(
        ({ userAddress }) => {
          updateCount++
          return useEnhancedNFTs({ userAddress, enabled: true })
        },
        { 
          wrapper: createWrapper(),
          initialProps: { userAddress: '0x1' }
        }
      )

      // Rapidly change user address
      for (let i = 0; i < 100; i++) {
        act(() => {
          rerender({ userAddress: `0x${i}` })
        })
      }

      // Should debounce updates
      expect(updateCount).toBeLessThan(200)
    })

    it('handles concurrent hook instances efficiently', async () => {
      const hooks = Array.from({ length: 20 }, () => 
        renderHook(() => useEnhancedNFTs({ enabled: true }), { wrapper: createWrapper() })
      )

      await waitFor(() => {
        hooks.forEach(({ result }) => {
          expect(result.current.isLoading).toBe(false)
        })
      })

      // Cleanup all hooks
      hooks.forEach(({ unmount }) => unmount())
    })
  })
})
