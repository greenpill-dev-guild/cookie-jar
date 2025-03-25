"use client"

import { useState, useCallback } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/components/wallet-provider"
import {
  getFactoryContract,
  getNetworkByChainId,
  getJarContract,
  type CookieJarContract,
  type CookieJarFactoryContract,
} from "@/lib/contracts"
import { useToast } from "@/components/ui/use-toast"

export function useJarCreation() {
  const { signer, provider, chainId } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const createJar = useCallback(
    async (
      name: string,
      description: string,
      networkKey: string,
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
      if (!signer || !provider || !chainId) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to create a jar",
          variant: "destructive",
        })
        return null
      }

      // Check if we're on the right network
      const network = getNetworkByChainId(chainId)
      if (!network || network.name.toLowerCase() !== networkKey.toLowerCase()) {
        toast({
          title: "Wrong network",
          description: `Please switch to ${networkKey} to create this jar`,
          variant: "destructive",
        })
        return null
      }

      try {
        setIsCreating(true)

        // Get the factory contract
        const factory = getFactoryContract(provider, networkKey).connect(signer) as CookieJarFactoryContract

        // Parse the max withdrawal amount
        const maxWithdrawalAmountWei = ethers.parseEther(maxWithdrawalAmount)

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
        )

        // Wait for the transaction to be mined
        const receipt = await tx.wait()

        // Get the jar address from the event
        const event = receipt.logs
          .map((log: any) => {
            try {
              return factory.interface.parseLog(log)
            } catch (e) {
              return null
            }
          })
          .find((event: any) => event && event.name === "CookieJarCreated")

        if (!event) {
          throw new Error("Failed to get jar address from event")
        }

        const jarAddress = event.args.jarAddress

        // If whitelist is enabled and addresses are provided, add them to the whitelist
        if (useWhitelist && whitelistAddresses && whitelistAddresses.length > 0) {
          const jar = getJarContract(provider, jarAddress).connect(signer) as CookieJarContract

          // Add each address to the whitelist
          for (const address of whitelistAddresses) {
            try {
              // Validate the address
              if (ethers.isAddress(address)) {
                const whitelistTx = await jar.addToWhitelist(address)
                await whitelistTx.wait()
              }
            } catch (error) {
              console.error(`Error adding ${address} to whitelist:`, error)
              // Continue with other addresses even if one fails
            }
          }
        }

        // If NFT gating is enabled, add the NFT gate
        if (!useWhitelist && nftConfig && nftConfig.nftAddress) {
          try {
            // Validate the NFT address
            if (ethers.isAddress(nftConfig.nftAddress)) {
              const jar = getJarContract(provider, jarAddress).connect(signer) as CookieJarContract
              const tokenId = BigInt(nftConfig.tokenId || "0")
              const isERC1155 = nftConfig.isERC1155 || false
              const minBalance = BigInt(nftConfig.minBalance || "1")

              const nftGateTx = await jar.addNFTGate(nftConfig.nftAddress, tokenId, isERC1155, minBalance)
              await nftGateTx.wait()
            }
          } catch (error) {
            console.error("Error adding NFT gate:", error)
            // Continue even if NFT gate addition fails
          }
        }

        toast({
          title: "Cookie Jar Created!",
          description: "Your cookie jar has been successfully created",
        })

        return jarAddress
      } catch (err) {
        console.error("Error creating jar:", err)
        toast({
          title: "Creation failed",
          description: "Failed to create cookie jar. Please try again.",
          variant: "destructive",
        })
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [signer, provider, chainId, toast],
  )

  return {
    isCreating,
    createJar,
  }
}

