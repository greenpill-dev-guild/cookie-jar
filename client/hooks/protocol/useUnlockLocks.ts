import { useState, useEffect, useMemo } from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { isAddress } from 'viem'
import { Web3Service } from '@unlock-protocol/unlock-js'

// Unlock Protocol types
export interface LockInfo {
  address: string
  name?: string
  symbol?: string
  keyPrice?: string
  maxNumberOfKeys?: number
  totalSupply?: number
  expirationDuration?: number // in seconds
  currencySymbol?: string
  publicLockVersion?: string
}

interface UserKey {
  lock: string
  tokenId: string
  keyId: string
  expiration: number // timestamp
  isValid: boolean
}

interface UseUnlockLocksOptions {
  /** Specific lock address to check */
  lockAddress?: string
  /** Whether to fetch user's keys automatically */
  fetchUserKeys?: boolean
  /** Whether to check key validity in real-time */
  checkValidity?: boolean
}

interface UseUnlockLocksResult {
  /** Lock information */
  lockInfo: LockInfo | null
  /** User's keys for this lock */
  userKeys: UserKey[]
  /** Whether user has valid key for the lock */
  hasValidKey: boolean
  /** Loading states */
  isLoading: boolean
  isLoadingLock: boolean
  isLoadingKeys: boolean
  isCheckingValidity: boolean
  /** Error states */
  error: string | null
  lockError: string | null
  keysError: string | null
  /** Actions */
  validateLockAddress: (address: string) => Promise<LockInfo | null>
  checkUserKeyValidity: (lockAddress: string) => Promise<boolean>
  refetch: () => void
}

// Minimal ABI for Unlock Protocol PublicLock contract
const PUBLIC_LOCK_ABI = [
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'getHasValidKey',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'keyPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'maxNumberOfKeys',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'expirationDuration',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// Unlock Protocol contract addresses per network
const UNLOCK_ADDRESSES: Record<number, string> = {
  1: '0x3d5409CcE1d45233dE1D4eBDEe74b8E004abDD44', // Ethereum Mainnet
  10: '0x99b1348a9129ac49c6de7F11245773dE2f51fB0c', // Optimism
  100: '0x14bb3586Ce2946E71B95Fe00Fc73dd30ed830863', // Gnosis Chain
  8453: '0xd0b14797b9D08493BD8D5DdB5d75A825f5c40C82', // Base
  42161: '0xeC83f7Ba8E6c55de8B8F704c63C7e6cEe8f61fca', // Arbitrum
  137: '0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f', // Polygon
  11155111: '0x627118a4fB747016911e5cDA82e2E77C531e8206', // Sepolia
}

// Get RPC URL for chain - simplified for now, would use from config in real app
const getRPCUrl = (chainId: number): string => {
  switch (chainId) {
    case 1: return process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.drpc.org'
    case 10: return process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://optimism.drpc.org'
    case 100: return process.env.NEXT_PUBLIC_GNOSIS_RPC_URL || 'https://gnosis.drpc.org'
    case 8453: return process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base.drpc.org'
    case 42161: return process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum.drpc.org'
    case 137: return process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.drpc.org'
    case 11155111: return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.drpc.org'
    default: return 'https://eth.drpc.org' // Fallback to Ethereum
  }
}

// Helper function to get network name
const getNetworkName = (chainId: number): string => {
  switch (chainId) {
    case 1: return 'mainnet'
    case 10: return 'optimism'
    case 100: return 'gnosis'
    case 8453: return 'base'
    case 42161: return 'arbitrum'
    case 137: return 'polygon'
    case 11155111: return 'sepolia'
    default: return 'mainnet'
  }
}

export function useUnlockLocks(options: UseUnlockLocksOptions = {}): UseUnlockLocksResult {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null)
  const [userKeys, setUserKeys] = useState<UserKey[]>([])
  const [isLoadingLock, setIsLoadingLock] = useState(false)
  const [isLoadingKeys, setIsLoadingKeys] = useState(false)
  const [isCheckingValidity, setIsCheckingValidity] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [keysError, setKeysError] = useState<string | null>(null)

  const isLoading = isLoadingLock || isLoadingKeys || isCheckingValidity
  const error = lockError || keysError

  // Initialize Web3Service with current network
  const web3Service = useMemo(() => {
    const networks = {
      [chainId]: {
        unlockAddress: UNLOCK_ADDRESSES[chainId] || UNLOCK_ADDRESSES[1],
        provider: getRPCUrl(chainId),
        name: getNetworkName(chainId),
      }
    }
    return new Web3Service(networks)
  }, [chainId])


  // Fetch user's keys for the lock using real Unlock SDK
  const fetchUserKeys = async (lockAddress: string, userAddress: string) => {
    setIsLoadingKeys(true)
    setKeysError(null)

    try {
      // Use real Unlock Protocol SDK to get user's key
      const key = await web3Service.getKeyByLockForOwner(lockAddress, userAddress)
      
      if (key && key.expiration > Date.now() / 1000) {
        const userKey: UserKey = {
          lock: lockAddress,
          tokenId: key.tokenId.toString(),
          keyId: key.tokenId.toString(),
          expiration: key.expiration,
          isValid: key.expiration > Date.now() / 1000
        }
        setUserKeys([userKey])
      } else {
        setUserKeys([])
      }
    } catch (error) {
      console.error('Error fetching user keys:', error)
      setKeysError('Failed to fetch your membership keys')
      setUserKeys([])
    } finally {
      setIsLoadingKeys(false)
    }
  }

  // Validate lock address using real Unlock SDK
  const validateLockAddress = async (address: string): Promise<LockInfo | null> => {
    if (!isAddress(address)) {
      throw new Error('Invalid contract address format')
    }

    setIsLoadingLock(true)
    setLockError(null)

    try {
      // Use real Unlock Protocol SDK to get lock information
      const lock = await web3Service.getLock(address, chainId)
      
      const lockInfo: LockInfo = {
        address: address,
        name: lock.name,
        symbol: lock.symbol || undefined,
        keyPrice: lock.keyPrice ? (Number(lock.keyPrice) / 1e18).toString() : undefined,
        maxNumberOfKeys: lock.maxNumberOfKeys === -1 ? undefined : lock.maxNumberOfKeys,
        totalSupply: lock.outstandingKeys,
        expirationDuration: lock.expirationDuration,
        currencySymbol: lock.currencyContractAddress === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TOKEN'
      }
      
      setLockInfo(lockInfo)
      setLockError(null)
      return lockInfo
    } catch (error) {
      console.error('Lock validation failed:', error)
      setLockError('Invalid Unlock Protocol lock contract')
      setLockInfo(null)
      return null
    } finally {
      setIsLoadingLock(false)
    }
  }

  // Check user key validity using real Unlock SDK
  const checkUserKeyValidity = async (lockAddress: string): Promise<boolean> => {
    if (!userAddress || !isAddress(lockAddress)) {
      return false
    }

    setIsCheckingValidity(true)
    
    try {
      // Use real Unlock Protocol SDK to check key validity
      const key = await web3Service.getKeyByLockForOwner(lockAddress, userAddress)
      const isValid = key && key.expiration > Date.now() / 1000
      return Boolean(isValid)
    } catch (error) {
      console.error('Error checking key validity:', error)
      return false
    } finally {
      setIsCheckingValidity(false)
    }
  }

  // Refetch all data
  const refetch = () => {
    if (options.lockAddress && userAddress && options.fetchUserKeys) {
      fetchUserKeys(options.lockAddress, userAddress)
    }
    if (options.lockAddress && isAddress(options.lockAddress)) {
      validateLockAddress(options.lockAddress)
    }
  }

  // Auto-fetch user keys when enabled
  useEffect(() => {
    if (options.lockAddress && userAddress && options.fetchUserKeys) {
      fetchUserKeys(options.lockAddress, userAddress)
    }
  }, [options.lockAddress, userAddress, options.fetchUserKeys, web3Service])

  // Auto-validate lock when provided
  useEffect(() => {
    if (options.lockAddress && isAddress(options.lockAddress)) {
      validateLockAddress(options.lockAddress)
    }
  }, [options.lockAddress, web3Service])

  return {
    lockInfo,
    userKeys,
    hasValidKey: userKeys.length > 0 && userKeys[0]?.isValid,
    isLoading,
    isLoadingLock,
    isLoadingKeys,
    isCheckingValidity,
    error,
    lockError,
    keysError,
    validateLockAddress,
    checkUserKeyValidity,
    refetch
  }
}
