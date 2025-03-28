"use client"

import type React from "react"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  className?: string
  showWalletInfo?: boolean
  children?: React.ReactNode
}

export function BackButton({ className = "", showWalletInfo = false, children }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { address } = useAccount()
  const chainId = useChainId()

  // Don't show on home page
  if (pathname === "/") return null

  // Format address for display
  const formatAddress = (address: string | undefined) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className={cn("flex items-center justify-between w-full bg-white rounded-xl py-2 px-4 shadow-sm", className)}>
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#3c2a14] font-medium"
      >
        <div className="bg-[#ff5e14] rounded-full h-8 w-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </div>
        <span>Go Back</span>
      </button>

      {children}

      {showWalletInfo && address && !children && (
        <div className="flex items-center gap-3 text-[#3c2a14]">
          <span className="px-3 py-1 bg-[#ff5e14] text-white rounded-full text-sm font-medium">
            {chainId === 11155111
              ? "Sepolia"
              : chainId === 8453
                ? "Base"
                : chainId === 10
                  ? "Optimism"
                  : chainId === 42161
                    ? "Arbitrum"
                    : "Unknown Network"}
          </span>
          <span className="text-sm font-medium">{formatAddress(address)}</span>
        </div>
      )}
    </div>
  )
}

