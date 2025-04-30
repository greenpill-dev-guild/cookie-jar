"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId, useConfig } from "wagmi"
import { Button } from "@/components/ui/button"
import { useChainModal } from "@rainbow-me/rainbowkit"
import { supportedChains } from "@/config/supported-networks"

export function NetworkSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [mounted, setMounted] = useState(false)
  const config = useConfig()
  const { openChainModal } = useChainModal()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Add an effect to watch for chain changes
  useEffect(() => {
    // Set up a watcher for chain changes
    const unwatch = config.subscribe(
      (state) => state.chainId,
      (newChainId: number) => {
        console.log("Chain changed to:", newChainId)
      },
    )

    // Clean up the watcher when component unmounts
    return () => {
      unwatch()
    }
  }, [config])

  // Check if current chain is in the list of supported chains
  const isChainSupported = chainId ? supportedChains.some(chain => chain.id === chainId) : false

  if (!mounted) return null

  // If user is not connected or on a supported chain, don't show anything
  if (!isConnected || isChainSupported) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white/90 backdrop-blur-md p-8 rounded-xl shadow-xl max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 2C8.268 2 2 8.268 2 16C2 23.732 8.268 30 16 30C23.732 30 30 23.732 30 16C30 8.268 23.732 2 16 2Z"
                fill="#FF5E14"
                fillOpacity="0.2"
              />
              <path d="M16 7V13M16 19V25M7 16H13M19 16H25" stroke="#FF5E14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-[#3c2a14] mb-2">Unsupported Network</h3>
          <p className="text-[#8b7355] mb-6">
            The network you're currently connected to is not supported by Cookie Jar. 
            Please switch to a supported network to continue.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              onClick={openChainModal}
              className="w-full bg-[#ff5e14] hover:bg-[#e54d00] text-white"
            >
              Switch to a Supported Network
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
