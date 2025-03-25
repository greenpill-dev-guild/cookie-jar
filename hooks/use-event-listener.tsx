"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/components/wallet-provider"
import { getJarContract } from "@/lib/contracts"

export function useEventListener(jarAddress: string | null) {
  const { provider } = useWallet()
  const [events, setEvents] = useState<any[]>([])
  const [isListening, setIsListening] = useState(false)

  // Start listening for events
  const startListening = useCallback(() => {
    if (!provider || !jarAddress) return

    setIsListening(true)

    // Create a contract instance
    const jar = getJarContract(provider, jarAddress)

    // Listen for Deposit events
    jar.on("Deposit", (sender, token, amount, event) => {
      setEvents((prev) => [
        ...prev,
        {
          type: "Deposit",
          sender,
          token,
          amount: ethers.formatUnits(amount, 18), // Assuming ETH for simplicity
          timestamp: Date.now(),
          event,
        },
      ])
    })

    // Listen for Withdrawal events
    jar.on("Withdrawal", (user, token, amount, purpose, event) => {
      setEvents((prev) => [
        ...prev,
        {
          type: "Withdrawal",
          user,
          token,
          amount: ethers.formatUnits(amount, 18), // Assuming ETH for simplicity
          purpose,
          timestamp: Date.now(),
          event,
        },
      ])
    })

    // Listen for other events as needed
    jar.on("WhitelistUpdated", (user, isWhitelisted, event) => {
      setEvents((prev) => [
        ...prev,
        {
          type: "WhitelistUpdated",
          user,
          isWhitelisted,
          timestamp: Date.now(),
          event,
        },
      ])
    })

    jar.on("JarConfigUpdated", (event) => {
      setEvents((prev) => [
        ...prev,
        {
          type: "JarConfigUpdated",
          timestamp: Date.now(),
          event,
        },
      ])
    })

    return () => {
      // Clean up listeners when component unmounts
      jar.removeAllListeners()
      setIsListening(false)
    }
  }, [provider, jarAddress])

  // Stop listening for events
  const stopListening = useCallback(() => {
    if (!provider || !jarAddress) return

    const jar = getJarContract(provider, jarAddress)
    jar.removeAllListeners()
    setIsListening(false)
  }, [provider, jarAddress])

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  // Start listening when component mounts
  useEffect(() => {
    const cleanup = startListening()
    return () => {
      if (cleanup) cleanup()
    }
  }, [startListening])

  return {
    events,
    isListening,
    startListening,
    stopListening,
    clearEvents,
  }
}

