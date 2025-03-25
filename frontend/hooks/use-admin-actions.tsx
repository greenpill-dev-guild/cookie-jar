"use client"

import { useState, useCallback } from "react"
import { useWallet } from "@/components/wallet-provider"
import { getFactoryContract, getNetworkByChainId } from "@/lib/contracts"
import { useToast } from "@/components/ui/use-toast"
import type { CookieJarFactoryContract } from "@/types/ethers-contracts"

export function useAdminActions() {
  const { signer, provider, chainId, address } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Check if the current user is the fee collector
  const checkIsFeeCollector = useCallback(
    async (networkKey: string) => {
      if (!provider || !address) return false

      try {
        const network = getNetworkByChainId(chainId!)
        if (!network) return false

        const factory = getFactoryContract(provider, networkKey)
        const feeCollector = await factory.feeCollector()

        return address.toLowerCase() === feeCollector.toLowerCase()
      } catch (error) {
        console.error("Error checking fee collector status:", error)
        return false
      }
    },
    [provider, address, chainId],
  )

  // Blacklist a jar
  const blacklistJar = useCallback(
    async (networkKey: string, jarAddress: string, isBlacklisted: boolean) => {
      if (!signer || !provider) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to perform this action",
          variant: "destructive",
        })
        return false
      }

      try {
        setIsLoading(true)

        // Check if user is fee collector
        const isFeeCollector = await checkIsFeeCollector(networkKey)
        if (!isFeeCollector) {
          toast({
            title: "Permission denied",
            description: "Only the fee collector can blacklist jars",
            variant: "destructive",
          })
          return false
        }

        const factory = getFactoryContract(provider, networkKey).connect(signer) as CookieJarFactoryContract
        const tx = await factory.blacklistJar(jarAddress, isBlacklisted)
        await tx.wait()

        toast({
          title: isBlacklisted ? "Jar blacklisted" : "Jar unblacklisted",
          description: `Jar ${jarAddress.substring(0, 6)}...${jarAddress.substring(38)} has been ${isBlacklisted ? "blacklisted" : "unblacklisted"}`,
        })
        return true
      } catch (error) {
        console.error("Error blacklisting jar:", error)
        toast({
          title: "Action failed",
          description: "Failed to update jar blacklist status",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [signer, provider, toast, checkIsFeeCollector],
  )

  // Blacklist an owner
  const blacklistOwner = useCallback(
    async (networkKey: string, ownerAddress: string, isBlacklisted: boolean) => {
      if (!signer || !provider) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to perform this action",
          variant: "destructive",
        })
        return false
      }

      try {
        setIsLoading(true)

        // Check if user is fee collector
        const isFeeCollector = await checkIsFeeCollector(networkKey)
        if (!isFeeCollector) {
          toast({
            title: "Permission denied",
            description: "Only the fee collector can blacklist owners",
            variant: "destructive",
          })
          return false
        }

        const factory = getFactoryContract(provider, networkKey).connect(signer) as CookieJarFactoryContract
        const tx = await factory.blacklistOwner(ownerAddress, isBlacklisted)
        await tx.wait()

        toast({
          title: isBlacklisted ? "Owner blacklisted" : "Owner unblacklisted",
          description: `Owner ${ownerAddress.substring(0, 6)}...${ownerAddress.substring(38)} has been ${isBlacklisted ? "blacklisted" : "unblacklisted"}`,
        })
        return true
      } catch (error) {
        console.error("Error blacklisting owner:", error)
        toast({
          title: "Action failed",
          description: "Failed to update owner blacklist status",
          variant: "destructive",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [signer, provider, toast, checkIsFeeCollector],
  )

  // Check if a jar is blacklisted
  const isJarBlacklisted = useCallback(
    async (networkKey: string, jarAddress: string) => {
      if (!provider) return false

      try {
        const factory = getFactoryContract(provider, networkKey)
        return await factory.blacklistedJars(jarAddress)
      } catch (error) {
        console.error("Error checking jar blacklist status:", error)
        return false
      }
    },
    [provider],
  )

  // Check if an owner is blacklisted
  const isOwnerBlacklisted = useCallback(
    async (networkKey: string, ownerAddress: string) => {
      if (!provider) return false

      try {
        const factory = getFactoryContract(provider, networkKey)
        return await factory.blacklistedOwners(ownerAddress)
      } catch (error) {
        console.error("Error checking owner blacklist status:", error)
        return false
      }
    },
    [provider],
  )

  return {
    isLoading,
    checkIsFeeCollector,
    blacklistJar,
    blacklistOwner,
    isJarBlacklisted,
    isOwnerBlacklisted,
  }
}

