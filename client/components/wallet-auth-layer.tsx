"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { CustomConnectButton } from "./custom-connect-button"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

interface WalletAuthLayerProps {
  children: React.ReactNode
}

export function WalletAuthLayer({ children }: WalletAuthLayerProps) {
  const { isConnected } = useAccount()
  const router = useRouter()

  if (isConnected) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Semi-transparent background to show content is there but inaccessible */}
      <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/70 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 border border-border">
          <h2 className="text-2xl font-bold text-center mb-4">Connect Your Wallet</h2>
          <p className="text-center text-muted-foreground mb-8">
            Please connect your wallet to create a new Cookie Jar.
          </p>

          <div className="flex flex-col gap-4 items-center">
            <CustomConnectButton className="w-full" />

            <div className="relative w-full text-center my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative px-4 text-sm bg-card text-muted-foreground">or</span>
            </div>

            <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => router.push("/")}>
              <Home size={18} />
              Return to Home
            </Button>
          </div>
        </div>
      </div>

      {/* The actual page content (blurred in background) */}
      <div className="pointer-events-none" aria-hidden="true">
        {children}
      </div>
    </div>
  )
}

