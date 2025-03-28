import type React from "react"
import { BackButton } from "@/components/back-button"
import { WalletInfo } from "@/components/wallet-info"
import Link from "next/link"
import { AnimatedButton } from "@/components/animated-button"

export default function JarsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <WalletInfo />
          <Link href="/create" className="ml-4">
            <AnimatedButton text="CREATE JAR" small={true} />
          </Link>
        </div>
      </div>
      {children}
    </div>
  )
}

