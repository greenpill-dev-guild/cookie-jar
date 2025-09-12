"use client"

import { useState, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { Address } from 'viem'
import { contractAddresses as staticAddresses } from '../config/supported-networks'

export function useContractAddresses() {
  const chainId = useChainId()
  const [localFactory, setLocalFactory] = useState<Address>()
  const [isLoading, setIsLoading] = useState(true)
  const [lastDeploymentTime, setLastDeploymentTime] = useState<number>(0)

  useEffect(() => {
    if (chainId === 31337) {
      const loadLocalDeployment = async () => {
        try {
          // Always try HTTP first for live updates
          const response = await fetch('/contracts/local-deployment.json?t=' + Date.now())
          if (!response.ok) throw new Error('HTTP fetch failed')
          
          const deployment = await response.json()
          const deploymentTime = deployment.timestamp || 0
          
          // Only update if we have a newer deployment
          if (deploymentTime > lastDeploymentTime || !localFactory) {
            setLocalFactory(deployment.CookieJarFactory)
            setLastDeploymentTime(deploymentTime)
            
            // Development logging
            if (process.env.NODE_ENV === 'development') {
              console.log('🏭 Updated local factory address:', deployment.CookieJarFactory)
              console.log('⏰ Deployment time:', new Date(deploymentTime * 1000).toLocaleString())
            }
          }
        } catch (error) {
          // Fallback to static addresses if HTTP fails
          console.warn('📄 Failed to load deployment via HTTP, using static fallback')
          const fallback = staticAddresses.cookieJarFactory[31337]
          if (fallback && fallback !== localFactory) {
            setLocalFactory(fallback)
          }
        } finally {
          setIsLoading(false)
        }
      }
      
      loadLocalDeployment()
      
      // Poll for updates less frequently to reduce load
      const interval = process.env.NODE_ENV === 'development'
        ? setInterval(loadLocalDeployment, 15000) // Reduced from 5s to 15s
        : null
        
      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      setIsLoading(false)
    }
  }, [chainId, lastDeploymentTime, localFactory])

  const cookieJarFactory = chainId === 31337 
    ? localFactory || staticAddresses.cookieJarFactory[31337]
    : chainId 
      ? staticAddresses.cookieJarFactory[chainId]
      : undefined

  return {
    cookieJarFactory,
    cookieJarRegistry: chainId ? staticAddresses.cookieJarRegistry[chainId] : undefined,
    isLoading: chainId === 31337 ? isLoading : false,
    // 🆕 Expose deployment info for debugging
    deploymentInfo: chainId === 31337 ? {
      lastDeploymentTime,
      address: localFactory
    } : null
  }
}
