"use client"

import { useCallback, useEffect, useState } from 'react'
import { useChainId, usePublicClient, useWatchContractEvent } from 'wagmi'
import type { Address } from 'viem'
import { 
  cookieJarAbi,
  cookieJarFactoryAbi
} from '../generated'
import { cookieJarFactoryV1Abi } from '@/lib/abis/cookie-jar-v1-abi'
import { useContractAddresses } from './use-contract-addresses'
import { isV2Chain } from '@/config/supported-networks'
import { useToast } from './design/use-toast'

// Simple metadata type for backwards compatibility
export type ParsedMetadata = {
  title: string
  description?: string
  isV2: boolean
}

// Error categorization for better UX
export type JarFetchError = {
  jarAddress: Address
  errorType: 'NETWORK_ERROR' | 'CONTRACT_NOT_FOUND' | 'ABI_MISMATCH' | 'INVALID_DATA' | 'TIMEOUT' | 'UNKNOWN'
  errorMessage: string
  canRetry: boolean
  retryCount?: number
}

// Factory fetch progress tracking
export type FetchProgress = {
  total: number
  completed: number
  successful: number
  failed: number
}

// Define a type that includes important jar information
export type CookieJarInfo = {
  jarAddress: Address
  currency: Address
  jarCreator?: Address
  metadata?: string
  parsedMetadata?: ParsedMetadata
  accessType: number
  withdrawalOption: number
  fixedAmount: bigint
  maxWithdrawal: bigint
  withdrawalInterval: bigint
  strictPurpose: boolean
  emergencyWithdrawalEnabled: boolean
  oneTimeWithdrawal: boolean
  currencyHeldByJar?: bigint
  supportsProtocols: boolean
}

// Simple metadata parser
function parseJarMetadata(rawMetadata: string): ParsedMetadata {
  if (!rawMetadata || rawMetadata.trim() === '') {
    return { title: 'Untitled Jar', isV2: false }
  }

  // Try parsing as JSON (v2)
  try {
    const parsed = JSON.parse(rawMetadata)
    if (parsed.version === "2.0" || parsed.title) {
      return {
        title: parsed.title || 'Untitled Jar',
        description: parsed.description,
        isV2: true
      }
    }
  } catch {
    // Not JSON, treat as v1 string title
  }

  // v1: Simple string title
  return {
    title: rawMetadata.trim(),
    isV2: false
  }
}

// Enhanced error categorization
function categorizeError(error: any, jarAddress: Address): JarFetchError {
  const errorMessage = error?.message || String(error)
  
  if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
    return {
      jarAddress,
      errorType: 'NETWORK_ERROR',
      errorMessage: 'Network timeout or connectivity issue',
      canRetry: true
    }
  }
  
  if (errorMessage.includes('contract function') || errorMessage.includes('does not exist')) {
    return {
      jarAddress,
      errorType: 'CONTRACT_NOT_FOUND',
      errorMessage: 'Contract not found at this address',
      canRetry: false
    }
  }
  
  if (errorMessage.includes('ABI') || errorMessage.includes('function signature')) {
    return {
      jarAddress,
      errorType: 'ABI_MISMATCH',
      errorMessage: 'Contract ABI mismatch (possibly old/new contract version)',
      canRetry: false
    }
  }
  
  if (errorMessage.includes('invalid') || errorMessage.includes('decode')) {
    return {
      jarAddress,
      errorType: 'INVALID_DATA',
      errorMessage: 'Invalid data returned from contract',
      canRetry: true
    }
  }
  
  return {
    jarAddress,
    errorType: 'UNKNOWN',
    errorMessage: errorMessage.slice(0, 100) + (errorMessage.length > 100 ? '...' : ''),
    canRetry: true
  }
}

/**
 * Hook to get all jar information directly from the factory and jar contracts
 * @returns Array of jars with their details
 */
export function useCookieJarFactory() {
  const [jars, setJars] = useState<CookieJarInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null)
  const [failedJars, setFailedJars] = useState<JarFetchError[]>([])
  
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { cookieJarFactory: factoryAddress, isLoading: addressLoading } = useContractAddresses()
  const { toast } = useToast()
  
  // 🐛 DEBUG: Log initial hook state
  console.log('🏁 useCookieJarFactory: Hook initialized with:', {
    chainId,
    factoryAddress,
    addressLoading,
    publicClientExists: !!publicClient,
    timestamp: new Date().toISOString()
  })

  // State for jar data - using direct calls instead of multicall
  const [jarAddresses, setJarAddresses] = useState<Address[] | undefined>()
  const [jarMetadatas, setJarMetadatas] = useState<string[] | undefined>()
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [dataError, setDataError] = useState<Error | null>(null)

  // Fetch factory data with version-aware metadata handling
  const fetchFactoryData = useCallback(async () => {
    if (!publicClient || addressLoading) return
    
    const currentChainId = chainId
    const isV2Contract = isV2Chain(currentChainId)
    
    // Handle missing factory address
    if (!factoryAddress) {
      console.warn(`⚠️ No factory address found for chain ${currentChainId}`)
      setJars([])
      setIsLoading(false)
      setDataError(new Error(`Cookie Jar Factory not deployed on this network (Chain ID: ${currentChainId})`))
      return
    }
    
    setIsLoadingData(true)
    setDataError(null)
    
    try {
      console.log(`📞 Fetching factory data for ${isV2Contract ? 'v2' : 'v1'} contract at ${factoryAddress}`)
      
      // Select correct ABI based on contract version
      const factoryAbi = isV2Contract ? cookieJarFactoryAbi : cookieJarFactoryV1Abi
      
      // Get jar addresses (same for both versions)
      const addresses = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'getCookieJars'
      }) as Address[]
      
      // Get metadata differently based on version
      let metadatas: string[]
      if (isV2Contract) {
        // V2: Use bulk getMetadatas function
        metadatas = await publicClient.readContract({
          address: factoryAddress,
          abi: factoryAbi,
          functionName: 'getMetadatas'
        }) as string[]
      } else {
        // V1: Get metadata by index for each jar
        metadatas = await Promise.all(
          addresses.map(async (_, index) => {
            try {
              return await publicClient.readContract({
                address: factoryAddress,
                abi: factoryAbi,
                functionName: 'metadatas',
                args: [BigInt(index)]
              }) as string
            } catch (error) {
              console.warn(`Failed to fetch metadata for index ${index}:`, error)
              return 'Jar Info' // Fallback
            }
          })
        )
      }
      
      setJarAddresses(addresses)
      setJarMetadatas(metadatas)
      
      console.log('✅ Factory data fetched:', {
        addressCount: addresses.length,
        metadataCount: metadatas.length
      })
    } catch (error) {
      console.error('❌ Error fetching factory data:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes('returned no data')) {
        setDataError(new Error(`Contract not deployed or incorrect address on this network (Chain ID: ${currentChainId})`))
      } else {
        setDataError(error as Error)
      }
    } finally {
      setIsLoadingData(false)
    }
  }, [publicClient, factoryAddress, addressLoading])

  // Fetch data when dependencies change (chainId handled by reset effect)
  useEffect(() => {
    if (!publicClient || addressLoading) return
    fetchFactoryData()
  }, [publicClient, factoryAddress, addressLoading])

  // Removed development polling that was causing repeated loading

  // 🐛 DEBUG: Log jar data state
  useEffect(() => {
    console.log('📍 useCookieJarFactory: Data state changed:', {
      jarAddresses: jarAddresses || 'undefined',
      jarAddressesLength: jarAddresses?.length || 0,
      jarMetadatasLength: jarMetadatas?.length || 0,
      isLoadingData,
      dataError: dataError || 'none',
      factoryAddress,
      timestamp: new Date().toISOString()
    })
  }, [jarAddresses, jarMetadatas, isLoadingData, dataError, factoryAddress])
  
  // Listen for new jar creation events to trigger immediate updates
  useWatchContractEvent({
    address: factoryAddress,
    abi: cookieJarFactoryAbi,
    eventName: 'CookieJarCreated',
    onLogs: (logs) => {
      console.log('🎉 New jar created, triggering refresh:', logs)
      toast({
        title: "🎉 New jar detected",
        description: "Refreshing jar list...",
        variant: "default"
      })
      fetchFactoryData()
    },
    enabled: !!factoryAddress,
  })
  
  // Function to fetch all details for a single jar
  const fetchJarDetails = useCallback(async (jarAddress: Address): Promise<CookieJarInfo | null> => {
    console.log(`🔍 fetchJarDetails: Starting fetch for jar ${jarAddress}`)
    
    try {
      // Use multicall to fetch multiple values in a single request
      if (!publicClient) {
        console.error(`❌ fetchJarDetails: No public client available for ${jarAddress}`)
        throw new Error('Public client not available')
      }
      
      console.log(`📞 fetchJarDetails: Making multicall for jar ${jarAddress}`)
      const [currency, accessType, withdrawalOption, fixedAmount, maxWithdrawal, withdrawalInterval, 
             strictPurpose, emergencyWithdrawalEnabled, oneTimeWithdrawal, currencyHeldByJar] = 
        await publicClient.multicall({
          contracts: [
            { address: jarAddress, abi: cookieJarAbi, functionName: 'currency' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'accessType' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'withdrawalOption' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'fixedAmount' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'maxWithdrawal' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'withdrawalInterval' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'strictPurpose' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'emergencyWithdrawalEnabled' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'oneTimeWithdrawal' },
            { address: jarAddress, abi: cookieJarAbi, functionName: 'currencyHeldByJar' }
          ]
        })

      console.log(`✅ fetchJarDetails: Multicall successful for ${jarAddress}:`, {
        currency: currency.result,
        accessType: accessType.result,
        withdrawalOption: withdrawalOption.result,
        fixedAmount: fixedAmount.result?.toString(),
        maxWithdrawal: maxWithdrawal.result?.toString(),
        withdrawalInterval: withdrawalInterval.result?.toString(),
        strictPurpose: strictPurpose.result,
        emergencyWithdrawalEnabled: emergencyWithdrawalEnabled.result,
        oneTimeWithdrawal: oneTimeWithdrawal.result,
        currencyHeldByJar: currencyHeldByJar.result?.toString()
      })
      
      const accessTypeNum = accessType.result as number
      const supportsProtocols = accessTypeNum >= 2  // All contracts are v2 now
      
      return {
        jarAddress,
        currency: currency.result as Address,
        accessType: accessTypeNum,
        withdrawalOption: withdrawalOption.result as number,
        fixedAmount: fixedAmount.result as bigint,
        maxWithdrawal: maxWithdrawal.result as bigint,
        withdrawalInterval: withdrawalInterval.result as bigint,
        strictPurpose: strictPurpose.result as boolean,
        emergencyWithdrawalEnabled: emergencyWithdrawalEnabled.result as boolean,
        oneTimeWithdrawal: oneTimeWithdrawal.result as boolean,
        currencyHeldByJar: currencyHeldByJar.result as bigint,
        supportsProtocols
      }
    } catch (err) {
      console.error(`❌ fetchJarDetails: Error fetching details for jar ${jarAddress}:`, err)
      throw err // Re-throw for better error categorization
    }
  }, [publicClient])

  // Fetch all jars when addresses are available
  useEffect(() => {
    console.log('🔄 useCookieJarFactory: Effect triggered with:', {
      jarAddresses: jarAddresses?.length || 0,
      jarMetadatas: jarMetadatas?.length || 0,
      isLoadingData,
      fetchJarDetailsExists: !!fetchJarDetails,
      timestamp: new Date().toISOString()
    })

    const fetchAllJars = async () => {
      if (!jarAddresses || jarAddresses.length === 0) {
        console.log('📭 fetchAllJars: No jar addresses available')
        setJars([])
        setFetchProgress(null)
        setFailedJars([])
        setIsLoading(false)
        return
      }
      
      console.log(`🔍 fetchAllJars: Starting enhanced fetch for ${jarAddresses.length} jars`)
      setIsLoading(true)
      setFetchProgress({ total: jarAddresses.length, completed: 0, successful: 0, failed: 0 })
      
      try {
        // Create promises with progress tracking
        const jarDetailsPromises = jarAddresses.map(async (address, index) => {
          try {
            const result = await fetchJarDetails(address as Address)
            // Update progress on success
            setFetchProgress(prev => prev ? {
              ...prev,
              completed: prev.completed + 1,
              successful: prev.successful + (result ? 1 : 0)
            } : null)
            return { result, index, address }
          } catch (err) {
            // Update progress on failure
            setFetchProgress(prev => prev ? {
              ...prev,
              completed: prev.completed + 1,
              failed: prev.failed + 1
            } : null)
            throw { error: err, index, address }
          }
        })
        
        console.log(`⏳ fetchAllJars: Waiting for ${jarDetailsPromises.length} promises with progress tracking`)
        
        // Enhanced Promise.allSettled with detailed error categorization
        const jarDetailsResults = await Promise.allSettled(jarDetailsPromises)
        
        console.log(`📊 fetchAllJars: Promise.allSettled completed with ${jarDetailsResults.length} results`)
        
        // Extract successful results and categorize failures
        const validJarDetails: CookieJarInfo[] = []
        const categorizedFailures: JarFetchError[] = []
        
        jarDetailsResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { result: jarData, address } = result.value
            if (jarData) {
              validJarDetails.push(jarData)
              console.log(`✅ fetchAllJars: Successfully processed jar ${address}`)
            } else {
              const error = categorizeError(new Error('Null result'), address)
              categorizedFailures.push(error)
              console.warn(`⚠️ fetchAllJars: Jar ${address} returned null`)
            }
          } else {
            const errorData = result.reason
            const address = errorData?.address || jarAddresses[index]
            const categorizedError = categorizeError(errorData?.error || result.reason, address)
            categorizedFailures.push(categorizedError)
            console.warn(`⚠️ fetchAllJars: Failed to fetch jar ${address}:`, categorizedError)
          }
        })
        
        // Show user-friendly notifications for failures
        if (categorizedFailures.length > 0) {
          const retryableFailures = categorizedFailures.filter(f => f.canRetry).length
          const permanentFailures = categorizedFailures.filter(f => !f.canRetry).length
          
          if (retryableFailures > 0) {
            toast({
              title: `⚠️ ${retryableFailures} jar(s) failed to load`,
              description: `Network issues detected. These jars can be retried.`,
              variant: "default"
            })
          }
          
          if (permanentFailures > 0) {
            toast({
              title: `❌ ${permanentFailures} jar(s) have permanent issues`,
              description: `These may be old contracts or corrupted data.`,
              variant: "destructive"
            })
          }
        }
        
        console.log(`✅ fetchAllJars: Successfully processed ${validJarDetails.length} jars (${categorizedFailures.length} failed)`)
        
        // Map metadata to jars
        const updatedJars = validJarDetails.map((jar) => {
          const originalIndex = jarAddresses.findIndex(addr => 
            addr.toLowerCase() === jar.jarAddress.toLowerCase()
          )
          
          const metadata = jarMetadatas && originalIndex >= 0 && originalIndex < jarMetadatas.length 
            ? jarMetadatas[originalIndex] 
            : 'Jar Info'
            
          return {
            ...jar,
            metadata,
            parsedMetadata: parseJarMetadata(metadata)
          }
        })
        
        setJars(updatedJars)
        setFailedJars(categorizedFailures)
        setError(null)
        
      } catch (err) {
        console.error('❌ fetchAllJars: Unexpected error:', err)
        setError(err instanceof Error ? err : new Error(String(err)))
        toast({
          title: "❌ Failed to load jars",
          description: "An unexpected error occurred while loading jars.",
          variant: "destructive"
        })
      } finally {
        console.log('🏁 fetchAllJars: Setting isLoading to false')
        setIsLoading(false)
        setFetchProgress(null)
      }
    }

    // Determine if we should fetch jars
    const shouldFetch = jarAddresses && jarAddresses.length > 0
    console.log('🤔 fetchAllJars: Should fetch jars?', {
      shouldFetch,
      jarAddressesExists: !!jarAddresses,
      jarAddressesLength: jarAddresses?.length || 0,
      isLoadingData
    })

    if (shouldFetch) {
      console.log('🚀 fetchAllJars: Starting jar fetch process')
      fetchAllJars()
    } else if (jarAddresses && jarAddresses.length === 0) {
      // Empty array means no jars exist yet
      console.log('📭 fetchAllJars: Empty jar addresses array - no jars exist')
      setJars([])
      setIsLoading(false)
    } else {
      console.log('⏳ fetchAllJars: Waiting for jar addresses...', { 
        jarAddresses: jarAddresses?.length || 0, 
        isLoadingData,
        factoryAddress 
      })
    }
  }, [jarAddresses, jarMetadatas, publicClient])

  // Retry failed jars function
  const retryFailedJars = useCallback(async () => {
    const retryableJars = failedJars.filter(f => f.canRetry)
    if (retryableJars.length === 0) return

    console.log(`🔄 Retrying ${retryableJars.length} failed jars`)
    
    for (const failedJar of retryableJars) {
      try {
        const jarData = await fetchJarDetails(failedJar.jarAddress)
        if (jarData) {
          // Add to successful jars
          setJars(prev => [...prev, {
            ...jarData,
            metadata: 'Jar Info',
            parsedMetadata: parseJarMetadata('Jar Info')
          }])
          
          // Remove from failed jars
          setFailedJars(prev => prev.filter(f => f.jarAddress !== failedJar.jarAddress))
          
          toast({
            title: "✅ Jar recovered",
            description: `Successfully loaded jar ${failedJar.jarAddress.slice(0, 8)}...`,
            variant: "default"
          })
        }
      } catch (error) {
        console.warn(`Retry failed for ${failedJar.jarAddress}:`, error)
        // Update retry count
        setFailedJars(prev => prev.map(f => 
          f.jarAddress === failedJar.jarAddress 
            ? { ...f, retryCount: (f.retryCount || 0) + 1 }
            : f
        ))
      }
    }
  }, [failedJars, fetchJarDetails, toast])

  // Reset state when chain changes to prevent errors
  useEffect(() => {
    console.log('🔄 Chain changed, resetting factory state for chain:', chainId)
    setJars([])
    setFailedJars([])
    setJarAddresses(undefined)
    setJarMetadatas(undefined)
    setIsLoadingData(true)
    setDataError(null)
    setError(null)
    setFetchProgress(null)
    
    // Small delay to allow wallet/provider to settle
    const timer = setTimeout(() => {
      if (!publicClient || addressLoading) return
      fetchFactoryData()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [chainId, publicClient, addressLoading, fetchFactoryData])

  // Error handling
  useEffect(() => {
    if (dataError) {
      console.error('❌ Error fetching factory data:', dataError)
      setError(dataError)
    } else {
      setError(null)
    }
  }, [dataError])

  // 🐛 DEBUG: Log final hook state
  useEffect(() => {
    console.log('📊 useCookieJarFactory: Final state update:', {
      jarsCount: jars.length,
      isLoading: addressLoading || isLoadingData || isLoading,
      error: error?.message || 'none',
      timestamp: new Date().toISOString()
    })
  }, [jars, isLoading, error, addressLoading, isLoadingData])

  // For compatibility with the jars page interface
  const cookieJarsData = jars.map(jar => ({
    ...jar,
    jarCreator: '0x0000000000000000000000000000000000000000' as Address // placeholder address
  }))
  
  return {
    jars,
    cookieJarsData, // Named to match useCookieJarData interface
    isLoading: addressLoading || isLoadingData || isLoading,
    error,
    // Raw jar data for existing components
    jarAddresses,
    jarMetadatas,
    isLoadingData,
    // Enhanced features
    fetchProgress,
    failedJars,
    retryFailedJars,
    // Add manual refresh functions for debugging
    refresh: () => {
      console.log('🔄 Manual refresh triggered')
      fetchFactoryData()
    }
  }
}

/**
 * Hook to get information about a specific jar by its address
 * @param jarAddress The address of the jar to fetch details for
 * @returns Jar details
 */
export function useCookieJarByAddress(jarAddress?: Address) {
  const [jar, setJar] = useState<CookieJarInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  console.log('🏗️ useCookieJarByAddress: Hook initialized for address:', jarAddress)
  
  // Function to fetch details for a single jar
  const fetchJarDetails = useCallback(async (address: Address): Promise<CookieJarInfo | null> => {
    console.log(`🔍 useCookieJarByAddress: Fetching details for ${address}`)
    
    try {
      if (!publicClient) throw new Error('Public client not available')
      
      const [currency, accessType, withdrawalOption, fixedAmount, maxWithdrawal, withdrawalInterval, 
             strictPurpose, emergencyWithdrawalEnabled, oneTimeWithdrawal, currencyHeldByJar] = 
        await publicClient.multicall({
          contracts: [
            { address, abi: cookieJarAbi, functionName: 'currency' },
            { address, abi: cookieJarAbi, functionName: 'accessType' },
            { address, abi: cookieJarAbi, functionName: 'withdrawalOption' },
            { address, abi: cookieJarAbi, functionName: 'fixedAmount' },
            { address, abi: cookieJarAbi, functionName: 'maxWithdrawal' },
            { address, abi: cookieJarAbi, functionName: 'withdrawalInterval' },
            { address, abi: cookieJarAbi, functionName: 'strictPurpose' },
            { address, abi: cookieJarAbi, functionName: 'emergencyWithdrawalEnabled' },
            { address, abi: cookieJarAbi, functionName: 'oneTimeWithdrawal' },
            { address, abi: cookieJarAbi, functionName: 'currencyHeldByJar' }
          ]
        })
      
      console.log(`✅ useCookieJarByAddress: Successfully fetched details for ${address}`)
      
      const accessTypeNum = accessType.result as number
      const supportsProtocols = accessTypeNum >= 2  // All contracts are v2 now
      
      return {
        jarAddress: address,
        currency: currency.result as Address,
        accessType: accessTypeNum,
        withdrawalOption: withdrawalOption.result as number,
        fixedAmount: fixedAmount.result as bigint,
        maxWithdrawal: maxWithdrawal.result as bigint,
        withdrawalInterval: withdrawalInterval.result as bigint,
        strictPurpose: strictPurpose.result as boolean,
        emergencyWithdrawalEnabled: emergencyWithdrawalEnabled.result as boolean,
        oneTimeWithdrawal: oneTimeWithdrawal.result as boolean,
        currencyHeldByJar: currencyHeldByJar.result as bigint,
        supportsProtocols
      }
    } catch (err) {
      console.error(`❌ useCookieJarByAddress: Error fetching details for ${address}:`, err)
      return null
    }
  }, [publicClient])

  useEffect(() => {
    if (!jarAddress) {
      console.log('🚫 useCookieJarByAddress: No jar address provided')
      setJar(null)
      setIsLoading(false)
      return
    }
    
    console.log(`🚀 useCookieJarByAddress: Starting fetch for ${jarAddress}`)
    setIsLoading(true)
    
    fetchJarDetails(jarAddress)
      .then(jarInfo => {
        console.log(`✅ useCookieJarByAddress: Fetch successful for ${jarAddress}:`, jarInfo)
        setJar(jarInfo)
        setError(null)
      })
      .catch(err => {
        console.error(`❌ useCookieJarByAddress: Fetch failed for ${jarAddress}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        console.log(`🏁 useCookieJarByAddress: Fetch completed for ${jarAddress}`)
        setIsLoading(false)
      })
  }, [jarAddress, fetchJarDetails])

  return {
    jar,
    isLoading,
    error
  }
}

/**
 * Simple helper hook to get parsed metadata for any jar
 */
export function useJarMetadata(rawMetadata: string): ParsedMetadata {
  return parseJarMetadata(rawMetadata || '')
}

/**
 * Helper hook to get jars with parsed metadata
 */
export function useJarsWithMetadata() {
  const { jars, isLoading, error, ...rest } = useCookieJarFactory()
  
  const jarsWithMetadata = jars.map(jar => ({
    ...jar,
    parsedMetadata: jar.parsedMetadata || parseJarMetadata(jar.metadata || '')
  }))

  return {
    jars: jarsWithMetadata,
    isLoading,
    error,
    ...rest
  }
}