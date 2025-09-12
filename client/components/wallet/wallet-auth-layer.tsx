"use client"

import type React from "react"

import { useAccount } from "wagmi"
import { TermsAndConditionsAuth } from "@/components/wallet/terms-and-conditions-auth"

export function WalletAuthLayer({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="container max-w-5xl py-8">
        <p className="text-center text-xl text-[#4a3520]">Please connect your wallet to continue.</p>
      </div>
    )
  }

  return <TermsAndConditionsAuth>{children}</TermsAndConditionsAuth>
}
