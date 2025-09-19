"use client"

import type React from "react"

import { useAccount } from "wagmi"
// Note: TermsAndConditionsAuth is deprecated and commented out

export function WalletAuthLayer({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="container max-w-5xl py-8">
        <p className="text-center text-xl text-[#4a3520]">Please connect your wallet to continue.</p>
      </div>
    )
  }

  // Note: TermsAndConditionsAuth was deprecated, rendering children directly
  return <>{children}</>
}
