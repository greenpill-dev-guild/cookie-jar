"use client"

import { Globe2 } from "lucide-react"
import { getNetworkName } from "@/lib/network-utils"

interface ChainDisplayProps {
  chainId: number
}

export function ChainDisplay({ chainId }: ChainDisplayProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--cj-warm-white))] border border-[hsl(var(--border))] rounded-lg">
      <Globe2 className="h-4 w-4 text-[hsl(var(--cj-medium-brown))]" />
      <span className="text-sm font-medium text-[hsl(var(--cj-dark-brown))]">
        {getNetworkName(chainId)}
      </span>
    </div>
  )
}
