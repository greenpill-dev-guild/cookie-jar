import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { isAddress } from 'viem'

// Hypercerts SDK types (real implementation would import from @hypercerts-org/sdk)
interface HypercertClaim {
  contract: string
  tokenId: string
  claim: {
    claimId: string
    name?: string
    description?: string
    image?: string
    external_url?: string
    creator: string
    totalSupply: string
    metadata?: {
      work_scope?: string[]
      impact_scope?: string[]
      work_timeframe?: {
        from: number
        to: number
      }
      impact_timeframe?: {
        from: number
        to: number
      }
    }
  }
  balance: string
  percentage: string
}

interface UseHypercertsOptions {
  /** Specific hypercert contract and token ID to check */
  tokenContract?: string
  tokenId?: string
  /** Whether to fetch user's hypercerts automatically */
  fetchUserHypercerts?: boolean
  /** Whether to include metadata */
  withMetadata?: boolean
}

interface UseHypercertsResult {
  /** User's hypercert claims */
  userHypercerts: HypercertClaim[]
  /** Specific hypercert info (if contract/tokenId provided) */
  hypercertInfo: HypercertClaim | null
  /** User's balance of specific hypercert */
  userBalance: bigint
  /** Loading states */
  isLoading: boolean
  isLoadingHypercerts: boolean
  isLoadingBalance: boolean
  /** Error states */
  error: string | null
  hypercertsError: string | null
  balanceError: string | null
  /** Actions */
  searchHypercerts: (query: string) => Promise<HypercertClaim[]>
  validateHypercert: (contract: string, tokenId: string) => Promise<HypercertClaim | null>
  checkUserBalance: (contract: string, tokenId: string, minBalance: string) => boolean
  refetch: () => void
}

// ERC1155 ABI for balance checking
const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export function useHypercerts(options: UseHypercertsOptions = {}): UseHypercertsResult {
  const { address: userAddress } = useAccount()
  const [userHypercerts, setUserHypercerts] = useState<HypercertClaim[]>([])
  const [hypercertInfo, setHypercertInfo] = useState<HypercertClaim | null>(null)
  const [isLoadingHypercerts, setIsLoadingHypercerts] = useState(false)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [hypercertsError, setHypercertsError] = useState<string | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  const isLoading = isLoadingHypercerts || isLoadingBalance
  const error = hypercertsError || balanceError

  // Get user's balance for specific hypercert using on-chain call
  const { 
    data: userBalance,
    isLoading: isCheckingBalance,
    error: onChainBalanceError,
    refetch: refetchBalance
  } = useReadContract({
    address: options.tokenContract && isAddress(options.tokenContract) ? options.tokenContract as `0x${string}` : undefined,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args: userAddress && options.tokenId ? [userAddress, BigInt(options.tokenId)] : undefined,
    query: {
      enabled: !!(options.tokenContract && options.tokenId && userAddress)
    }
  })

  // Get total supply for the hypercert
  const { data: totalSupply } = useReadContract({
    address: options.tokenContract && isAddress(options.tokenContract) ? options.tokenContract as `0x${string}` : undefined,
    abi: ERC1155_ABI,
    functionName: 'totalSupply',
    args: options.tokenId ? [BigInt(options.tokenId)] : undefined,
    query: {
      enabled: !!(options.tokenContract && options.tokenId)
    }
  })

  // Get metadata URI
  const { data: tokenURI } = useReadContract({
    address: options.tokenContract && isAddress(options.tokenContract) ? options.tokenContract as `0x${string}` : undefined,
    abi: ERC1155_ABI,
    functionName: 'uri',
    args: options.tokenId ? [BigInt(options.tokenId)] : undefined,
    query: {
      enabled: !!(options.tokenContract && options.tokenId)
    }
  })

  // Fetch user's hypercerts
  const fetchUserHypercerts = async (address: string) => {
    setIsLoadingHypercerts(true)
    setHypercertsError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would use Hypercerts SDK:
      // import { HypercertsSDK } from '@hypercerts-org/sdk'
      // const sdk = new HypercertsSDK()
      // const hypercerts = await sdk.getUserHypercerts(address)
      
      // Mock data for demonstration
      const mockHypercerts: HypercertClaim[] = [
        {
          contract: '0x1234567890123456789012345678901234567890',
          tokenId: '1',
          claim: {
            claimId: '1',
            name: 'Ocean Cleanup Initiative',
            description: 'Removed 100kg of plastic from ocean',
            image: 'https://example.com/hypercert1.png',
            creator: address,
            totalSupply: '1000000',
            metadata: {
              work_scope: ['Ocean cleanup', 'Environmental restoration'],
              impact_scope: ['Environmental impact', 'Ocean health'],
              work_timeframe: { from: 1640995200, to: 1672531200 }, // 2022
              impact_timeframe: { from: 1640995200, to: 1735689600 } // 2022-2025
            }
          },
          balance: '250000',
          percentage: '25'
        },
        {
          contract: '0x1234567890123456789012345678901234567890',
          tokenId: '2',
          claim: {
            claimId: '2',
            name: 'Carbon Offset Project',
            description: 'Sequestered 50 tons of CO2 through reforestation',
            image: 'https://example.com/hypercert2.png',
            creator: address,
            totalSupply: '500000',
            metadata: {
              work_scope: ['Reforestation', 'Carbon sequestration'],
              impact_scope: ['Climate impact', 'Carbon reduction'],
              work_timeframe: { from: 1640995200, to: 1672531200 },
              impact_timeframe: { from: 1640995200, to: 2020281600 } // Long-term impact
            }
          },
          balance: '100000',
          percentage: '20'
        }
      ]

      setUserHypercerts(mockHypercerts)
    } catch (error) {
      console.error('Error fetching user hypercerts:', error)
      setHypercertsError('Failed to fetch your hypercert collection')
    } finally {
      setIsLoadingHypercerts(false)
    }
  }

  // Validate specific hypercert
  const validateHypercert = async (contract: string, tokenId: string): Promise<HypercertClaim | null> => {
    if (!isAddress(contract) || isNaN(Number(tokenId))) {
      throw new Error('Invalid contract address or token ID')
    }

    setIsLoadingBalance(true)
    setBalanceError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would fetch from Hypercerts API or on-chain
      
      const mockClaim: HypercertClaim = {
        contract,
        tokenId,
        claim: {
          claimId: tokenId,
          name: `Environmental Impact Certificate #${tokenId}`,
          description: 'Verified environmental impact contribution',
          image: 'https://example.com/hypercert.png',
          creator: '0x1234567890123456789012345678901234567890',
          totalSupply: totalSupply?.toString() || '1000000'
        },
        balance: userBalance?.toString() || '0',
        percentage: userBalance && totalSupply 
          ? ((Number(userBalance) / Number(totalSupply)) * 100).toFixed(2)
          : '0'
      }
      
      setHypercertInfo(mockClaim)
      return mockClaim
    } catch (error) {
      console.error('Error validating hypercert:', error)
      setBalanceError('Invalid hypercert or contract not found')
      setHypercertInfo(null)
      return null
    } finally {
      setIsLoadingBalance(false)
    }
  }

  // Search for hypercerts
  const searchHypercerts = async (query: string): Promise<HypercertClaim[]> => {
    try {
      // Note: This is a mock implementation
      // Real implementation would use Hypercerts SDK search
      
      const mockResults: HypercertClaim[] = [
        {
          contract: '0x1234567890123456789012345678901234567890',
          tokenId: '1',
          claim: {
            claimId: '1',
            name: `${query} Impact Certificate`,
            description: 'Verified impact contribution',
            creator: '0x1234567890123456789012345678901234567890',
            totalSupply: '1000000'
          },
          balance: '0',
          percentage: '0'
        }
      ]
      
      return mockResults
    } catch (error) {
      console.error('Error searching hypercerts:', error)
      return []
    }
  }

  // Check if user has sufficient balance
  const checkUserBalance = (contract: string, tokenId: string, minBalance: string): boolean => {
    if (!userBalance || !minBalance) return false
    return userBalance >= BigInt(minBalance)
  }

  // Refetch all data
  const refetch = () => {
    if (userAddress && options.fetchUserHypercerts) {
      fetchUserHypercerts(userAddress)
    }
    if (options.tokenContract && options.tokenId) {
      validateHypercert(options.tokenContract, options.tokenId)
    }
    refetchBalance()
  }

  // Auto-fetch user hypercerts when enabled
  useEffect(() => {
    if (userAddress && options.fetchUserHypercerts) {
      fetchUserHypercerts(userAddress)
    }
  }, [userAddress, options.fetchUserHypercerts])

  // Auto-validate specific hypercert when provided
  useEffect(() => {
    if (options.tokenContract && options.tokenId) {
      validateHypercert(options.tokenContract, options.tokenId)
    }
  }, [options.tokenContract, options.tokenId, userBalance, totalSupply])

  // Handle on-chain balance errors
  useEffect(() => {
    if (onChainBalanceError) {
      setBalanceError('Failed to check hypercert balance')
    }
  }, [onChainBalanceError])

  return {
    userHypercerts,
    hypercertInfo,
    userBalance: userBalance || BigInt(0),
    isLoading,
    isLoadingHypercerts,
    isLoadingBalance: isLoadingBalance || isCheckingBalance,
    error,
    hypercertsError,
    balanceError,
    searchHypercerts,
    validateHypercert,
    checkUserBalance,
    refetch
  }
}
