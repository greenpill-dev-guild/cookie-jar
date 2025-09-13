import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { isAddress } from 'viem'

// Unlock Protocol types
interface LockInfo {
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

export function useUnlockLocks(options: UseUnlockLocksOptions = {}): UseUnlockLocksResult {
  const { address: userAddress } = useAccount()
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null)
  const [userKeys, setUserKeys] = useState<UserKey[]>([])
  const [isLoadingLock, setIsLoadingLock] = useState(false)
  const [isLoadingKeys, setIsLoadingKeys] = useState(false)
  const [isCheckingValidity, setIsCheckingValidity] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [keysError, setKeysError] = useState<string | null>(null)

  const isLoading = isLoadingLock || isLoadingKeys || isCheckingValidity
  const error = lockError || keysError

  // Check if user has valid key using on-chain contract call
  const { 
    data: hasValidKey,
    isLoading: isCheckingOnChain,
    error: validityError,
    refetch: refetchValidity
  } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'getHasValidKey',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!(options.lockAddress && userAddress && options.checkValidity)
    }
  })

  // Get lock basic info using on-chain calls
  const { data: lockName } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'name',
    query: { enabled: !!(options.lockAddress && isAddress(options.lockAddress)) }
  })

  const { data: lockSymbol } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'symbol',
    query: { enabled: !!(options.lockAddress && isAddress(options.lockAddress)) }
  })

  const { data: keyPrice } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'keyPrice',
    query: { enabled: !!(options.lockAddress && isAddress(options.lockAddress)) }
  })

  const { data: maxKeys } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'maxNumberOfKeys',
    query: { enabled: !!(options.lockAddress && isAddress(options.lockAddress)) }
  })

  const { data: totalSupply } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!(options.lockAddress && isAddress(options.lockAddress)) }
  })

  const { data: expirationDuration } = useReadContract({
    address: options.lockAddress && isAddress(options.lockAddress) ? options.lockAddress as `0x${string}` : undefined,
    abi: PUBLIC_LOCK_ABI,
    functionName: 'expirationDuration',
    query: { enabled: !!(options.lockAddress && isAddress(options.lockAddress)) }
  })

  // Update lock info when on-chain data changes
  useEffect(() => {
    if (options.lockAddress && lockName) {
      const info: LockInfo = {
        address: options.lockAddress,
        name: lockName,
        symbol: lockSymbol,
        keyPrice: keyPrice ? (Number(keyPrice) / 1e18).toString() : undefined,
        maxNumberOfKeys: maxKeys ? Number(maxKeys) : undefined,
        totalSupply: totalSupply ? Number(totalSupply) : undefined,
        expirationDuration: expirationDuration ? Number(expirationDuration) : undefined
      }
      setLockInfo(info)
      setLockError(null)
    }
  }, [options.lockAddress, lockName, lockSymbol, keyPrice, maxKeys, totalSupply, expirationDuration])

  // Fetch user's keys for the lock
  const fetchUserKeys = async (lockAddress: string, userAddress: string) => {
    setIsLoadingKeys(true)
    setKeysError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would use Unlock SDK or Graph Protocol:
      // const keys = await sdk.getUserKeys(userAddress, lockAddress)
      
      // For now, we'll rely on the on-chain hasValidKey check
      // and create a mock key if user has access
      const mockKeys: UserKey[] = hasValidKey ? [{
        lock: lockAddress,
        tokenId: '1',
        keyId: '1',
        expiration: Date.now() / 1000 + (365 * 24 * 60 * 60), // 1 year from now
        isValid: true
      }] : []

      setUserKeys(mockKeys)
    } catch (error) {
      console.error('Error fetching user keys:', error)
      setKeysError('Failed to fetch your membership keys')
    } finally {
      setIsLoadingKeys(false)
    }
  }

  // Validate lock address
  const validateLockAddress = async (address: string): Promise<LockInfo | null> => {
    if (!isAddress(address)) {
      throw new Error('Invalid contract address format')
    }

    setIsLoadingLock(true)
    setLockError(null)

    try {
      // The on-chain calls will handle validation
      // This function is mainly for manual validation
      return null // Will be set by useEffect when on-chain data loads
    } catch (error) {
      setLockError('Invalid Unlock Protocol lock contract')
      return null
    } finally {
      setIsLoadingLock(false)
    }
  }

  // Check user key validity
  const checkUserKeyValidity = async (lockAddress: string): Promise<boolean> => {
    if (!userAddress || !isAddress(lockAddress)) {
      return false
    }

    setIsCheckingValidity(true)
    
    try {
      // This will trigger the on-chain call via the useReadContract hook
      refetchValidity()
      return hasValidKey || false
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
    if (hasValidKey !== undefined) {
      refetchValidity()
    }
  }

  // Auto-fetch user keys when enabled
  useEffect(() => {
    if (options.lockAddress && userAddress && options.fetchUserKeys) {
      fetchUserKeys(options.lockAddress, userAddress)
    }
  }, [options.lockAddress, userAddress, options.fetchUserKeys, hasValidKey])

  // Handle validity check errors
  useEffect(() => {
    if (validityError) {
      setKeysError('Failed to check membership validity')
    }
  }, [validityError])

  return {
    lockInfo,
    userKeys,
    hasValidKey: hasValidKey || false,
    isLoading,
    isLoadingLock,
    isLoadingKeys,
    isCheckingValidity: isCheckingValidity || isCheckingOnChain,
    error,
    lockError,
    keysError,
    validateLockAddress,
    checkUserKeyValidity,
    refetch
  }
}
