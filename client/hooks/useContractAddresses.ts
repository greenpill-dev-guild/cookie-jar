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

  // 🐛 DEBUG: Log hook initialization
  console.log('🏗️ useContractAddresses: Hook initialized with chainId:', chainId)

  useEffect(() => {
    console.log('🔄 useContractAddresses: Effect triggered for chainId:', chainId)
    
    if (chainId === 31337) {
      const loadLocalDeployment = async () => {
        console.log('📡 useContractAddresses: Loading local deployment for anvil chain')
        
        try {
          // Always try HTTP first for live updates
          const url = '/contracts/local-deployment.json?t=' + Date.now()
          console.log('🌐 useContractAddresses: Fetching from:', url)
          
          const response = await fetch(url)
          if (!response.ok) {
            console.warn('⚠️ useContractAddresses: HTTP fetch failed:', response.status, response.statusText)
            throw new Error('HTTP fetch failed')
          }
          
          const deployment = await response.json()
          console.log('📦 useContractAddresses: Received deployment data:', deployment)
          
          const deploymentTime = deployment.timestamp || 0
          
          // Only update if we have a newer deployment
          if (deploymentTime > lastDeploymentTime || !localFactory) {
            console.log('✅ useContractAddresses: Updating local factory address:', {
              oldAddress: localFactory,
              newAddress: deployment.CookieJarFactory,
              deploymentTime,
              lastDeploymentTime
            })
            
            setLocalFactory(deployment.CookieJarFactory)
            setLastDeploymentTime(deploymentTime)
            
            // Development logging
            if (process.env.NODE_ENV === 'development') {
              console.log('🏭 Updated local factory address:', deployment.CookieJarFactory)
              console.log('⏰ Deployment time:', new Date(deploymentTime).toLocaleString())
            }
          } else {
            console.log('⏭️ useContractAddresses: Skipping update (no newer deployment)', {
              deploymentTime,
              lastDeploymentTime,
              hasLocalFactory: !!localFactory
            })
          }
          
        } catch (error) {
          console.error('❌ useContractAddresses: Error loading local deployment:', error)
          
          // Fallback to static addresses for local development
          const fallbackAddress = staticAddresses.cookieJarFactory[31337]
          console.log('🔄 useContractAddresses: Falling back to static address:', fallbackAddress)
          
          if (fallbackAddress) {
            setLocalFactory(fallbackAddress as Address)
          }
        } finally {
          console.log('🏁 useContractAddresses: Setting isLoading to false')
          setIsLoading(false)
        }
      }

      loadLocalDeployment()
      
      // Polling disabled - only load once per chain change
      // This prevents race conditions with jar creation on Anvil
    } else {
      console.log('🌐 useContractAddresses: Using static addresses for chainId:', chainId)
      setIsLoading(false)
    }
  }, [chainId, lastDeploymentTime, localFactory])

  // Get the appropriate factory address
  const cookieJarFactory = chainId === 31337 
    ? localFactory || staticAddresses.cookieJarFactory[31337]
    : staticAddresses.cookieJarFactory[chainId]

  // 🐛 DEBUG: Log final state
  useEffect(() => {
    console.log('📊 useContractAddresses: Final state:', {
      chainId,
      cookieJarFactory,
      localFactory,
      isLoading,
      staticFactoryForChain: staticAddresses.cookieJarFactory[chainId],
      allStaticAddresses: Object.keys(staticAddresses.cookieJarFactory),
      timestamp: new Date().toISOString()
    })
  }, [chainId, cookieJarFactory, localFactory, isLoading])

  return {
    cookieJarFactory: cookieJarFactory as Address,
    isLoading
  }
}