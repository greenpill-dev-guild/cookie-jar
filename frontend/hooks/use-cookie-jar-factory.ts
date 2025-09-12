"use client"

import { useCallback, useEffect, useState } from 'react'
import { useChainId, usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { 
  useReadCookieJarFactoryGetCookieJars,
  useReadCookieJarFactoryGetMetadatas,
  cookieJarAbi
} from '../generated'
import { useContractAddresses } from './use-contract-addresses'

// Define a type that includes important jar information
export type CookieJarInfo = {
  jarAddress: Address
  currency: Address
  jarCreator?: Address // Added for compatibility with JarData
  metadata?: string // Added for compatibility with JarData
  accessType: number
  withdrawalOption: number
  fixedAmount: bigint
  maxWithdrawal: bigint
  withdrawalInterval: bigint
  strictPurpose: boolean
  emergencyWithdrawalEnabled: boolean
  oneTimeWithdrawal: boolean
  currencyHeldByJar?: bigint
}

/**
 * Hook to get all jar information directly from the factory and jar contracts
 * @returns Array of jars with their details
 */
export function useCookieJarFactory() {
  const [jars, setJars] = useState<CookieJarInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { cookieJarFactory: factoryAddress, isLoading: addressLoading } = useContractAddresses()
  
  // Get all jar addresses from the factory
  const { data: jarAddresses, isLoading: isLoadingAddresses, error: addressesError, refetch: refetchAddresses } = 
    useReadCookieJarFactoryGetCookieJars({
      address: factoryAddress as Address,
      query: {
        enabled: !addressLoading && !!factoryAddress,
        refetchInterval: process.env.NODE_ENV === 'development' ? 10000 : 30000, // 10s dev, 30s prod - much less aggressive
        staleTime: 5000,    // Consider data fresh for 5 seconds
        gcTime: 300000,  // Keep in cache for 5 minutes
      }
    })
    
  // Get the metadata for all jars
  const { 
    data: jarMetadatas, 
    isLoading: isLoadingMetadatas, 
    error: metadatasError,
    refetch: refetchMetadatas
  } = useReadCookieJarFactoryGetMetadatas({
    address: factoryAddress as Address,
      query: {
        enabled: !addressLoading && !!factoryAddress,
        refetchInterval: process.env.NODE_ENV === 'development' ? 10000 : 30000, // 10s dev, 30s prod - much less aggressive
        staleTime: 5000,    // Consider data fresh for 5 seconds
        gcTime: 300000,  // Keep in cache for 5 minutes
      }
  })
  
  // Function to fetch all details for a single jar
  const fetchJarDetails = useCallback(async (jarAddress: Address): Promise<CookieJarInfo | null> => {
    try {
      // Use multicall to fetch multiple values in a single request
      if (!publicClient) throw new Error('Public client not available')
      
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
      
      return {
        jarAddress,
        currency: currency.result as Address,
        accessType: accessType.result as number,
        withdrawalOption: withdrawalOption.result as number,
        fixedAmount: fixedAmount.result as bigint,
        maxWithdrawal: maxWithdrawal.result as bigint,
        withdrawalInterval: withdrawalInterval.result as bigint,
        strictPurpose: strictPurpose.result as boolean,
        emergencyWithdrawalEnabled: emergencyWithdrawalEnabled.result as boolean,
        oneTimeWithdrawal: oneTimeWithdrawal.result as boolean,
        currencyHeldByJar: currencyHeldByJar.result as bigint
      }
    } catch (err) {
      console.error(`Error fetching details for jar ${jarAddress}:`, err)
      return null
    }
  }, [publicClient])

  // Fetch all jars when addresses are available
  useEffect(() => {
    const fetchAllJars = async () => {
      if (!jarAddresses || jarAddresses.length === 0) {
        console.log('useCookieJarFactory: No jar addresses available')
        return
      }
      
      console.log(`useCookieJarFactory: Fetching details for ${jarAddresses.length} jars:`, jarAddresses)
      setIsLoading(true)
      try {
        const jarDetailsPromises = jarAddresses.map(address => 
          fetchJarDetails(address as Address)
        )
        
        const jarDetails = await Promise.all(jarDetailsPromises) //may wnat to use promise.allsettled instead
        const validJarDetails = jarDetails.filter(jar => jar !== null) as CookieJarInfo[]
        
        // Update jar data to include metadata
        const updatedJars = validJarDetails.map((jar, index) => ({
          ...jar,
          metadata: jarMetadatas && index < jarMetadatas.length ? jarMetadatas[index] : 'Jar Info'
        }))
        
        console.log(`useCookieJarFactory: Successfully fetched ${updatedJars.length} jars`)
        setJars(updatedJars)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch jars when addresses are available
    if (jarAddresses && jarAddresses.length > 0) {
      fetchAllJars()
    } else {
      console.log('useCookieJarFactory: Waiting for jar addresses...', { 
        jarAddresses: jarAddresses?.length || 0, 
        isLoadingAddresses,
        factoryAddress 
      })
    }
  }, [jarAddresses, isLoadingMetadatas, metadatasError, fetchJarDetails, jarMetadatas])

  // Error handling for addresses and metadata errors
  useEffect(() => {
    if (addressesError) {
      setError(addressesError instanceof Error 
        ? addressesError 
        : new Error(String(addressesError)))
    } else if (metadatasError) {
      setError(metadatasError instanceof Error 
        ? metadatasError 
        : new Error(String(metadatasError)))
    }
  }, [addressesError, metadatasError])

  // For compatibility with the jars page interface
  const cookieJarsData = jars.map(jar => ({
    ...jar,
    jarCreator: '0x0000000000000000000000000000000000000000' as Address // placeholder address
  }))
  
  return {
    jars,
    cookieJarsData, // Named to match useCookieJarData interface
    isLoading: addressLoading || isLoadingAddresses || isLoadingMetadatas || isLoading,
    error,
    // Add manual refresh functions for debugging
    refresh: () => {
      refetchAddresses?.()
      refetchMetadatas?.()
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
  
  // Function to fetch details for a single jar
  const fetchJarDetails = useCallback(async (address: Address): Promise<CookieJarInfo | null> => {
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
      
      return {
        jarAddress: address,
        currency: currency.result as Address,
        accessType: accessType.result as number,
        withdrawalOption: withdrawalOption.result as number,
        fixedAmount: fixedAmount.result as bigint,
        maxWithdrawal: maxWithdrawal.result as bigint,
        withdrawalInterval: withdrawalInterval.result as bigint,
        strictPurpose: strictPurpose.result as boolean,
        emergencyWithdrawalEnabled: emergencyWithdrawalEnabled.result as boolean,
        oneTimeWithdrawal: oneTimeWithdrawal.result as boolean,
        currencyHeldByJar: currencyHeldByJar.result as bigint
      }
    } catch (err) {
      console.error(`Error fetching details for jar ${address}:`, err)
      return null
    }
  }, [publicClient])

  useEffect(() => {
    if (!jarAddress) {
      setJar(null)
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    
    fetchJarDetails(jarAddress)
      .then(jarInfo => {
        setJar(jarInfo)
        setError(null)
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [jarAddress, fetchJarDetails])

  return {
    jar,
    isLoading,
    error
  }
}