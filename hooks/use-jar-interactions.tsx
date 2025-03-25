"use client"

import { useState, useCallback } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/components/wallet-provider"
import { getJarContract, getERC20Contract } from "@/lib/contracts"
import { useToast } from "@/components/ui/use-toast"

export function useJarInteractions() {
  const { signer, provider } = useWallet()
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const { toast } = useToast()

  // Deposit ETH to a jar
  const depositETH = useCallback(
    async (jarAddress: string, amount: string) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to deposit",
          variant: "destructive",
        })
        return false
      }

      try {
        setIsDepositing(true)
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const amountWei = ethers.parseEther(amount)

        const tx = await jar.depositETH({ value: amountWei })
        await tx.wait()

        toast({
          title: "Deposit successful",
          description: `You have deposited ${amount} ETH`,
        })
        return true
      } catch (err) {
        console.error("Error depositing ETH:", err)
        toast({
          title: "Deposit failed",
          description: "Failed to deposit ETH. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsDepositing(false)
      }
    },
    [signer, provider, toast],
  )

  // Deposit ERC20 tokens to a jar
  const depositERC20 = useCallback(
    async (jarAddress: string, tokenAddress: string, amount: string, decimals: number) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to deposit",
          variant: "destructive",
        })
        return false
      }

      try {
        setIsDepositing(true)
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const token = getERC20Contract(provider!, tokenAddress).connect(signer)
        const amountWithDecimals = ethers.parseUnits(amount, decimals)

        // First approve the jar to spend tokens
        const approveTx = await token.approve(jarAddress, amountWithDecimals)
        await approveTx.wait()

        // Then deposit
        const depositTx = await jar.depositERC20(tokenAddress, amountWithDecimals)
        await depositTx.wait()

        toast({
          title: "Deposit successful",
          description: `You have deposited ${amount} tokens`,
        })
        return true
      } catch (err) {
        console.error("Error depositing ERC20:", err)
        toast({
          title: "Deposit failed",
          description: "Failed to deposit tokens. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsDepositing(false)
      }
    },
    [signer, provider, toast],
  )

  // Withdraw ETH from a jar
  const withdrawETH = useCallback(
    async (jarAddress: string, amount: string, purpose: string) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to withdraw",
          variant: "destructive",
        })
        return false
      }

      try {
        setIsWithdrawing(true)
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const amountWei = ethers.parseEther(amount)

        const tx = await jar.withdrawETH(amountWei, purpose)
        await tx.wait()

        toast({
          title: "Withdrawal successful",
          description: `You have withdrawn ${amount} ETH`,
        })
        return true
      } catch (err) {
        console.error("Error withdrawing ETH:", err)
        toast({
          title: "Withdrawal failed",
          description: "Failed to withdraw ETH. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsWithdrawing(false)
      }
    },
    [signer, provider, toast],
  )

  // Withdraw ERC20 tokens from a jar
  const withdrawERC20 = useCallback(
    async (jarAddress: string, tokenAddress: string, amount: string, purpose: string, decimals: number) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to withdraw",
          variant: "destructive",
        })
        return false
      }

      try {
        setIsWithdrawing(true)
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const amountWithDecimals = ethers.parseUnits(amount, decimals)

        const tx = await jar.withdrawERC20(tokenAddress, amountWithDecimals, purpose)
        await tx.wait()

        toast({
          title: "Withdrawal successful",
          description: `You have withdrawn ${amount} tokens`,
        })
        return true
      } catch (err) {
        console.error("Error withdrawing ERC20:", err)
        toast({
          title: "Withdrawal failed",
          description: "Failed to withdraw tokens. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsWithdrawing(false)
      }
    },
    [signer, provider, toast],
  )

  // Add a user to the whitelist
  const addToWhitelist = useCallback(
    async (jarAddress: string, userAddress: string) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet",
          variant: "destructive",
        })
        return false
      }

      try {
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const tx = await jar.addToWhitelist(userAddress)
        await tx.wait()

        toast({
          title: "User whitelisted",
          description: `User ${userAddress} has been added to the whitelist`,
        })
        return true
      } catch (err) {
        console.error("Error adding to whitelist:", err)
        toast({
          title: "Operation failed",
          description: "Failed to add user to whitelist. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [signer, provider, toast],
  )

  // Remove a user from the whitelist
  const removeFromWhitelist = useCallback(
    async (jarAddress: string, userAddress: string) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet",
          variant: "destructive",
        })
        return false
      }

      try {
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const tx = await jar.removeFromWhitelist(userAddress)
        await tx.wait()

        toast({
          title: "User removed",
          description: `User ${userAddress} has been removed from the whitelist`,
        })
        return true
      } catch (err) {
        console.error("Error removing from whitelist:", err)
        toast({
          title: "Operation failed",
          description: "Failed to remove user from whitelist. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [signer, provider, toast],
  )

  // Emergency withdraw all funds
  const emergencyWithdraw = useCallback(
    async (jarAddress: string, tokenAddress: string) => {
      if (!signer) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet",
          variant: "destructive",
        })
        return false
      }

      try {
        const jar = getJarContract(provider!, jarAddress).connect(signer)
        const tx = await jar.emergencyWithdraw(tokenAddress)
        await tx.wait()

        toast({
          title: "Emergency withdrawal successful",
          description: "All funds have been withdrawn",
        })
        return true
      } catch (err) {
        console.error("Error emergency withdrawing:", err)
        toast({
          title: "Operation failed",
          description: "Failed to perform emergency withdrawal. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [signer, provider, toast],
  )

  return {
    isDepositing,
    isWithdrawing,
    depositETH,
    depositERC20,
    withdrawETH,
    withdrawERC20,
    addToWhitelist,
    removeFromWhitelist,
    emergencyWithdraw,
  }
}

