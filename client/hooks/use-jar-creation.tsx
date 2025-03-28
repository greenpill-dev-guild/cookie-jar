"use client"

import { useState, useCallback } from "react"
import { ethers } from "ethers"
import { useAccount, useChainId, useConfig } from "wagmi"
import { switchChain } from "wagmi/actions"
import { useToast } from "@/components/ui/use-toast"
import { CONTRACT_ADDRESSES, FACTORY_ABI, SUPPORTED_NETWORKS } from "@/lib/contract-config"

export function useJarCreation() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const createJar = useCallback(
    async (
      name: string,
      description: string,
      maxWithdrawalAmount: string,
      cooldownPeriod: number, // in seconds
      requirePurpose: boolean,
      fixedWithdrawalAmount: boolean,
      emergencyWithdrawalEnabled: boolean,
      useWhitelist: boolean,
      whitelistAddresses?: string[],
      nftConfig?: {
        nftAddress: string
        tokenId: string
        isERC1155: boolean
        minBalance: string
      },
    ) => {
      // Double-check wallet connection
      if (!isConnected || !address) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to create a jar",
          variant: "destructive",
        })
        return null
      }

      // Check if we're on Sepolia
      if (chainId !== SUPPORTED_NETWORKS.sepolia.chainId) {
        toast({
          title: "Wrong network",
          description: "Please switch to Sepolia to create a jar",
          variant: "destructive",
        })

        // Try to switch network
        try {
          await switchChain(config, { chainId: SUPPORTED_NETWORKS.sepolia.chainId })
        } catch (err) {
          console.error("Failed to switch network:", err)
        }
        return null
      }

      try {
        setIsCreating(true)

        // Get provider and signer
        if (!window.ethereum) {
          throw new Error("No Ethereum provider found")
        }

        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()

        // Create contract instance
        const factory = new ethers.Contract(CONTRACT_ADDRESSES.FACTORY, FACTORY_ABI, signer)

        // Parse the max withdrawal amount
        const maxWithdrawalAmountWei = ethers.parseEther(maxWithdrawalAmount)

        // Check if creation fee is required
        const creationFee = await factory.creationFee()
        const options = creationFee > 0 ? { value: creationFee } : {}

        // Create the jar
        const tx = await factory.createCookieJar(
          name,
          description,
          maxWithdrawalAmountWei,
          cooldownPeriod,
          requirePurpose,
          fixedWithdrawalAmount,
          emergencyWithdrawalEnabled,
          useWhitelist,
          options,
        )

        // Wait for the transaction to be mined
        toast({
          title: "Creating Cookie Jar",
          description: "Transaction submitted. Please wait for confirmation...",
        })

        const receipt = await tx.wait()

        // Get the jar address from the event
        const jarAddress = extractJarAddressFromReceipt(receipt)

        if (!jarAddress) {
          throw new Error("Failed to get jar address from event")
        }

        toast({
          title: "Cookie Jar Created!",
          description: "Your cookie jar has been successfully created",
        })

        return jarAddress
      } catch (err: any) {
        console.error("Error creating jar:", err)
        toast({
          title: "Creation failed",
          description: err.message || "Failed to create cookie jar. Please try again.",
          variant: "destructive",
        })
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [isConnected, address, chainId, config, toast],
  )

  // Helper function to extract jar address from transaction receipt
  const extractJarAddressFromReceipt = (receipt: any) => {
    // Look for the CookieJarCreated event
    for (const log of receipt.logs) {
      try {
        // Create an interface to parse the log
        const iface = new ethers.Interface([
          "event CookieJarCreated(address indexed jarAddress, address indexed creator, string name, string description)",
        ])

        // Try to parse the log
        const parsedLog = iface.parseLog({
          topics: log.topics,
          data: log.data,
        })

        // If this is the CookieJarCreated event, return the jar address
        if (parsedLog && parsedLog.name === "CookieJarCreated") {
          return parsedLog.args.jarAddress
        }
      } catch (e) {
        // Not the event we're looking for, continue
        continue
      }
    }
    return null
  }

  return {
    isCreating,
    createJar,
  }
}

