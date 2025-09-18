"use client"

import { useCallback } from 'react'
import { useChainId, usePublicClient, useWatchContractEvent } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Address } from 'viem'
import { 
  cookieJarAbi,
  cookieJarFactoryAbi
} from '../generated'
import { cookieJarFactoryV1Abi } from '@/lib/abis/cookie-jar-v1-abi'
import { useContractAddresses } from './useContractAddresses'
import { isV2Chain } from '@/config/supported-networks'
import { useToast } from './useToast'

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

// Helper function to fetch jar details
async function fetchJarDetails(publicClient: any, jarAddress: Address): Promise<CookieJarInfo | null> {
  try {
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
    
    const accessTypeNum = accessType.result as number
    const supportsProtocols = accessTypeNum >= 2
    
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
    console.error(`❌ Error fetching details for jar ${jarAddress}:`, err)
    return null
  }
}

/**
 * Hook to get all jar information directly from the factory and jar contracts
 * Uses React Query for better caching, error handling, and race condition prevention
 * @returns Array of jars with their details
 */
export function useCookieJarFactory() {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const { cookieJarFactory: factoryAddress, isLoading: addressLoading } = useContractAddresses()
  const { toast } = useToast()
  
  // Query for factory data (addresses and metadata)
  const {
    data: factoryData,
    error: factoryError,
    isLoading: isLoadingFactory
  } = useQuery({
    queryKey: ['cookie-jar-factory', chainId, factoryAddress],
    queryFn: async () => {
      if (!publicClient || !factoryAddress) {
        throw new Error('Missing dependencies')
      }
      
      const isV2Contract = isV2Chain(chainId)
      const factoryAbi = isV2Contract ? cookieJarFactoryAbi : cookieJarFactoryV1Abi
      
      // Get jar addresses
      const addresses = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'getCookieJars'
      }) as Address[]
      
      // Get metadata differently based on version
      let metadatas: string[]
      if (isV2Contract) {
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
              return 'Jar Info'
            }
          })
        )
      }
      
      return { addresses, metadatas }
    },
    enabled: !addressLoading && !!publicClient && !!factoryAddress,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
  
  // Query for all jar details
  const {
    data: jars = [],
    error: jarsError,
    isLoading: isLoadingJars,
    refetch: refetchJars
  } = useQuery({
    queryKey: ['cookie-jar-details', chainId, factoryData?.addresses],
    queryFn: async (): Promise<CookieJarInfo[]> => {
      if (!publicClient || !factoryData?.addresses) {
        return []
      }
      
      const { addresses, metadatas } = factoryData
      
      // Process jars in batches to avoid overwhelming the network
      const batchSize = 10
      const validJars: CookieJarInfo[] = []
      
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize)
        const batchResults = await Promise.allSettled(
          batch.map(address => fetchJarDetails(publicClient, address))
        )
        
        batchResults.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled' && result.value) {
            const originalIndex = i + batchIndex
            const metadata = metadatas[originalIndex] || 'Jar Info'
            
            validJars.push({
              ...result.value,
              metadata,
              parsedMetadata: parseJarMetadata(metadata)
            })
          }
        })
      }
      
      return validJars
    },
    enabled: !!factoryData?.addresses && !!publicClient,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2
  })

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
      queryClient.invalidateQueries({ 
        queryKey: ['cookie-jar-factory', chainId, factoryAddress] 
      })
    },
    enabled: !!factoryAddress,
  })

  // Handle errors and show toasts
  const error = factoryError || jarsError
  const isLoading = addressLoading || isLoadingFactory || isLoadingJars

  // Determine loading state and error messages
  if (error) {
    console.error('❌ Error in cookie jar factory:', error)
  }
  
  // For compatibility with the jars page interface  
  const cookieJarsData = jars.map(jar => ({
    ...jar,
    jarCreator: '0x0000000000000000000000000000000000000000' as Address // placeholder address
  }))
  
  return {
    jars,
    cookieJarsData, // Named to match useCookieJarData interface
    isLoading,
    error,
    // Raw jar data for existing components
    jarAddresses: factoryData?.addresses,
    jarMetadatas: factoryData?.metadatas,
    isLoadingData: isLoadingFactory,
    // Enhanced features (simplified with React Query)
    fetchProgress: null as FetchProgress | null, // React Query handles progress internally
    failedJars: [] as JarFetchError[], // React Query handles retries internally
    retryFailedJars: () => refetchJars(), // Simple retry function
    // Add manual refresh functions
    refresh: () => {
      console.log('🔄 Manual refresh triggered')
      queryClient.invalidateQueries({ 
        queryKey: ['cookie-jar-factory', chainId, factoryAddress] 
      })
    }
  }
}

/**
 * Hook to get information about a specific jar by its address
 * Uses React Query for better caching and error handling
 * @param jarAddress The address of the jar to fetch details for
 * @returns Jar details
 */
export function useCookieJarByAddress(jarAddress?: Address) {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  const {
    data: jar = null,
    isLoading,
    error
  } = useQuery({
    queryKey: ['cookie-jar-by-address', chainId, jarAddress],
    queryFn: async (): Promise<CookieJarInfo | null> => {
      if (!jarAddress || !publicClient) {
        return null
      }
      
      return await fetchJarDetails(publicClient, jarAddress)
    },
    enabled: !!jarAddress && !!publicClient,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })

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