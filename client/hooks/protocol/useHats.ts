import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { isAddress } from 'viem'

// Hats Protocol types (real implementation would import from @hatsprotocol/sdk-v1-subgraph)
interface HatInfo {
  id: string
  name?: string
  description?: string
  imageUri?: string
  isActive?: boolean
  wearerCount?: number
  maxSupply?: number
  tree?: {
    id: string
    name?: string
  }
  admin?: string
  eligibility?: string
  toggle?: string
}

interface UserHat {
  hatId: string
  hat: HatInfo
  isWearing: boolean
  isEligible: boolean
  isInGoodStanding: boolean
}

interface UseHatsOptions {
  /** Specific hat ID to check */
  hatId?: string
  /** Hats contract address (network specific) */
  hatsContract?: string
  /** Whether to fetch user's hats automatically */
  fetchUserHats?: boolean
  /** Whether to check eligibility in real-time */
  checkEligibility?: boolean
}

interface UseHatsResult {
  /** User's hats */
  userHats: UserHat[]
  /** Specific hat info (if hatId provided) */
  hatInfo: HatInfo | null
  /** Whether user is wearing specific hat */
  isWearingHat: boolean
  /** Whether user is eligible for hat */
  isEligible: boolean
  /** Loading states */
  isLoading: boolean
  isLoadingHats: boolean
  isCheckingEligibility: boolean
  /** Error states */
  error: string | null
  hatsError: string | null
  eligibilityError: string | null
  /** Actions */
  searchHats: (query: string) => Promise<HatInfo[]>
  validateHatId: (hatId: string) => Promise<HatInfo | null>
  refetch: () => void
}

// Hats Protocol contract addresses per network
const HATS_CONTRACTS: Record<number, string> = {
  1: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Ethereum Mainnet
  10: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Optimism
  100: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Gnosis Chain
  8453: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Base
  42161: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Arbitrum
  11155111: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Sepolia
  84532: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Base Sepolia
}

// Minimal ABI for Hats Protocol contract
const HATS_ABI = [
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'hatId', type: 'uint256' }
    ],
    name: 'isWearerOfHat',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'hatId', type: 'uint256' }
    ],
    name: 'isEligible',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'hatId', type: 'uint256' }
    ],
    name: 'isInGoodStanding',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'hatId', type: 'uint256' }],
    name: 'hatSupply',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export function useHats(options: UseHatsOptions = {}): UseHatsResult {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const [userHats, setUserHats] = useState<UserHat[]>([])
  const [hatInfo, setHatInfo] = useState<HatInfo | null>(null)
  const [isLoadingHats, setIsLoadingHats] = useState(false)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [hatsError, setHatsError] = useState<string | null>(null)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  const isLoading = isLoadingHats || isCheckingEligibility
  const error = hatsError || eligibilityError

  // Get Hats contract address for current network
  const hatsContractAddress = options.hatsContract || HATS_CONTRACTS[chainId] || HATS_CONTRACTS[1]

  // Check if user is wearing specific hat using on-chain call
  const { 
    data: isWearingHat,
    isLoading: isCheckingWearer,
    error: wearerError,
    refetch: refetchWearer
  } = useReadContract({
    address: hatsContractAddress && isAddress(hatsContractAddress) ? hatsContractAddress as `0x${string}` : undefined,
    abi: HATS_ABI,
    functionName: 'isWearerOfHat',
    args: userAddress && options.hatId ? [userAddress, BigInt(options.hatId)] : undefined,
    query: {
      enabled: !!(hatsContractAddress && userAddress && options.hatId)
    }
  })

  // Check if user is eligible for hat
  const { 
    data: isEligible,
    isLoading: isCheckingEligible,
    error: eligibleError
  } = useReadContract({
    address: hatsContractAddress && isAddress(hatsContractAddress) ? hatsContractAddress as `0x${string}` : undefined,
    abi: HATS_ABI,
    functionName: 'isEligible',
    args: userAddress && options.hatId ? [userAddress, BigInt(options.hatId)] : undefined,
    query: {
      enabled: !!(hatsContractAddress && userAddress && options.hatId && options.checkEligibility)
    }
  })

  // Check if user is in good standing
  const { 
    data: isInGoodStanding
  } = useReadContract({
    address: hatsContractAddress && isAddress(hatsContractAddress) ? hatsContractAddress as `0x${string}` : undefined,
    abi: HATS_ABI,
    functionName: 'isInGoodStanding',
    args: userAddress && options.hatId ? [userAddress, BigInt(options.hatId)] : undefined,
    query: {
      enabled: !!(hatsContractAddress && userAddress && options.hatId && options.checkEligibility)
    }
  })

  // Get hat supply
  const { data: hatSupply } = useReadContract({
    address: hatsContractAddress && isAddress(hatsContractAddress) ? hatsContractAddress as `0x${string}` : undefined,
    abi: HATS_ABI,
    functionName: 'hatSupply',
    args: options.hatId ? [BigInt(options.hatId)] : undefined,
    query: {
      enabled: !!(hatsContractAddress && options.hatId)
    }
  })

  // Fetch user's hats
  const fetchUserHats = async (address: string) => {
    setIsLoadingHats(true)
    setHatsError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would use Hats SDK:
      // import { HatsSubgraphClient } from '@hatsprotocol/sdk-v1-subgraph'
      // const client = new HatsSubgraphClient()
      // const userHats = await client.getWearerHats({ wearerAddress: address })
      
      // Mock data for demonstration
      const mockUserHats: UserHat[] = [
        {
          hatId: '12345',
          hat: {
            id: '12345',
            name: 'DAO Member',
            description: 'General member of the DAO',
            imageUri: 'https://example.com/hat1.png',
            isActive: true,
            wearerCount: 150,
            maxSupply: 200,
            tree: { id: '1', name: 'Main DAO' }
          },
          isWearing: true,
          isEligible: true,
          isInGoodStanding: true
        },
        {
          hatId: '12346',
          hat: {
            id: '12346',
            name: 'Project Lead',
            description: 'Lead developer for special projects',
            imageUri: 'https://example.com/hat2.png',
            isActive: true,
            wearerCount: 5,
            maxSupply: 10,
            tree: { id: '1', name: 'Main DAO' }
          },
          isWearing: isWearingHat || false,
          isEligible: isEligible || false,
          isInGoodStanding: isInGoodStanding || false
        }
      ]

      setUserHats(mockUserHats)
    } catch (error) {
      console.error('Error fetching user hats:', error)
      setHatsError('Failed to fetch your organizational roles')
    } finally {
      setIsLoadingHats(false)
    }
  }

  // Search for hats
  const searchHats = async (query: string): Promise<HatInfo[]> => {
    try {
      // Note: This is a mock implementation
      // Real implementation would use Hats SDK search
      
      const mockResults: HatInfo[] = [
        {
          id: '12345',
          name: `${query} Admin`,
          description: 'Administrative role',
          isActive: true,
          wearerCount: 3,
          maxSupply: 5,
          tree: { id: '1', name: 'Main Tree' }
        },
        {
          id: '12346',
          name: `${query} Member`,
          description: 'General member role',
          isActive: true,
          wearerCount: 15,
          maxSupply: 50,
          tree: { id: '1', name: 'Main Tree' }
        }
      ]
      
      return mockResults
    } catch (error) {
      console.error('Error searching hats:', error)
      return []
    }
  }

  // Validate specific hat ID
  const validateHatId = async (hatId: string): Promise<HatInfo | null> => {
    if (!hatId || isNaN(Number(hatId))) {
      throw new Error('Hat ID must be a valid number')
    }

    setIsCheckingEligibility(true)
    setEligibilityError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would fetch from Hats subgraph or on-chain
      
      const mockHat: HatInfo = {
        id: hatId,
        name: `Hat #${hatId}`,
        description: 'Organizational role',
        isActive: true,
        wearerCount: hatSupply ? Number(hatSupply) : 5,
        maxSupply: 10,
        tree: { id: '1', name: 'Organization Tree' }
      }
      
      setHatInfo(mockHat)
      return mockHat
    } catch (error) {
      console.error('Error validating hat ID:', error)
      setEligibilityError('Hat ID not found or invalid')
      setHatInfo(null)
      return null
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  // Refetch all data
  const refetch = () => {
    if (userAddress && options.fetchUserHats) {
      fetchUserHats(userAddress)
    }
    if (options.hatId) {
      validateHatId(options.hatId)
    }
    refetchWearer()
  }

  // Auto-fetch user hats when enabled
  useEffect(() => {
    if (userAddress && options.fetchUserHats) {
      fetchUserHats(userAddress)
    }
  }, [userAddress, options.fetchUserHats])

  // Auto-validate specific hat when provided
  useEffect(() => {
    if (options.hatId) {
      validateHatId(options.hatId)
    }
  }, [options.hatId, hatSupply])

  // Handle on-chain errors
  useEffect(() => {
    if (wearerError || eligibleError) {
      setEligibilityError('Failed to check hat eligibility')
    }
  }, [wearerError, eligibleError])

  return {
    userHats,
    hatInfo,
    isWearingHat: isWearingHat || false,
    isEligible: isEligible || false,
    isLoading,
    isLoadingHats,
    isCheckingEligibility: isCheckingEligibility || isCheckingWearer || isCheckingEligible,
    error,
    hatsError,
    eligibilityError,
    searchHats,
    validateHatId,
    refetch
  }
}
