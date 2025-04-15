"use client"

import type React from "react"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { Badge } from "@/components/ui/badge"
import { useChainId } from "wagmi"

interface BackButtonProps {
  className?: string
  showWalletInfo?: boolean
  children?: React.ReactNode
}

export function BackButton({ className = "", showWalletInfo = false, children }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const chainId = useChainId()

  // Don't show on home page
  if (pathname === "/") return null

  // Get network name and color based on chain ID
  const getNetworkInfo = () => {
    if (!chainId) return { name: "Disconnected", color: "bg-gray-500" }

    switch (chainId) {
      case 84532: // Base Sepolia
        return { name: "Base Sepolia", color: "bg-[#ff5e14]" }
      case 8453: // Base Mainnet
        return { name: "Base", color: "bg-blue-500" }
      case 10: // Optimism
        return { name: "Optimism", color: "bg-red-500" }
      case 100: // Gnosis
        return { name: "Gnosis", color: "bg-green-500" }
      case 42161: // Arbitrum
        return { name: "Arbitrum", color: "bg-blue-700" }
      default:
        return { name: "Unknown", color: "bg-gray-500" }
    }
  }

  const networkInfo = getNetworkInfo()

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

      {children || (
        <Badge className={`ml-auto ${networkInfo.color} text-white border-none px-4 py-1 rounded-full`}>
          {networkInfo.name}
        </Badge>
      )}
    </div>
  )
}
