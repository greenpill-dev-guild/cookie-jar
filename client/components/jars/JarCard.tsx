"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { getAccessTypeName } from "@/lib/access-type-utils"
import { JarImage } from "./JarImage"
import { JarStatusBadge } from "./JarStatusBadge"
import type { JarData, getCurrencyAmount, getCurrencySymbol, getWithdrawalAmountDisplay, getJarName } from "@/lib/utils/jar-utils"
import type { NativeCurrency } from "@/config/supported-networks"

interface JarCardProps {
  jar: JarData & { accessType?: number }
  nativeCurrency: NativeCurrency
  tokenSymbols: Record<string, string>
  onClick: (jarAddress: string) => void
}

export function JarCard({ jar, nativeCurrency, tokenSymbols, onClick }: JarCardProps) {
  // Import utility functions inline to avoid circular dependency issues
  const getCurrencyAmount = (jarData: JarData) => {
    const { ethers } = require("ethers")
    const { ETH_ADDRESS } = require("@/lib/utils/token-utils")
    
    if (jarData.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
      return ethers.formatEther(jarData.currencyHeldByJar || "0")
    } else {
      return ethers.formatUnits(jarData.currencyHeldByJar || "0", 18)
    }
  }

  const getCurrencySymbol = (jarData: JarData) => {
    const { ETH_ADDRESS } = require("@/lib/utils/token-utils")
    
    if (jarData.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
      return nativeCurrency.symbol
    } else {
      return tokenSymbols[jarData.currency?.toLowerCase() || ""] || "TOKEN"
    }
  }

  const getWithdrawalAmountDisplay = (jarData: JarData) => {
    const { ethers } = require("ethers")
    const symbol = getCurrencySymbol(jarData)
    
    if (jarData.withdrawalOption === 0) { // Fixed
      return `Fixed: ${ethers.formatEther(jarData.fixedAmount || "0")} ${symbol}`
    } else { // Variable
      return `Max: ${ethers.formatEther(jarData.maxWithdrawal || "0")} ${symbol}`
    }
  }

  const getJarName = (jarData: JarData) => {
    if (jarData.metadata) {
      try {
        const parsed = JSON.parse(jarData.metadata)
        return parsed.name || 'Cookie Jar'
      } catch (e) {
        return jarData.metadata || 'Cookie Jar'
      }
    }
    return 'Cookie Jar'
  }

  const jarName = getJarName(jar)

  return (
    <Card 
      className="cj-card-primary hover:shadow-lg transition-all duration-200 cursor-pointer group transform hover:-translate-y-1 overflow-hidden p-0"
      onClick={() => onClick(jar.jarAddress)}
    >
      {/* Image Section - Full width, no padding */}
      <JarImage metadata={jar.metadata} jarName={jarName} />
      
      <CardHeader className="pb-3 px-6 pt-6">
        <CardTitle className="content-title text-[hsl(var(--cj-dark-brown))] group-hover:text-[hsl(var(--cj-brand-orange))] transition-colors">
          {jarName}
        </CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <CardDescription className="address-text-mobile text-[hsl(var(--cj-medium-brown))] truncate flex-1 min-w-0">
            {jar.jarAddress.slice(0, 6)}...{jar.jarAddress.slice(-4)}
          </CardDescription>
          <div className="flex-shrink-0 ml-auto">
            <JarStatusBadge jarAddress={jar.jarAddress} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 px-6 pb-6">
        <div className="flex-between-safe">
          <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">Balance:</span>
          <span className="font-semibold text-[hsl(var(--cj-dark-brown))] text-responsive-sm truncate text-right">
            {getCurrencyAmount(jar)} {getCurrencySymbol(jar)}
          </span>
        </div>
        
        <div className="flex-between-safe">
          <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">Withdrawal:</span>
          <span className="text-responsive-sm text-[hsl(var(--cj-dark-brown))] truncate text-right">
            {getWithdrawalAmountDisplay(jar)}
          </span>
        </div>

        <div className="flex-between-safe">
          <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">Access:</span>
          <div className="flex items-center gap-1 min-w-0">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span className="text-responsive-sm text-[hsl(var(--cj-dark-brown))] truncate">
              {getAccessTypeName(jar.accessType)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
