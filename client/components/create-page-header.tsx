"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { useAccount } from "wagmi"
import { useEffect, useState } from "react"

export function CreatePageHeader() {
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)

  // Format address for display
  const displayAddress = address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ""

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="w-full bg-[#fff8f0] pt-6 pb-6">
      <div className="container mx-auto px-4 md:px-8">
        {/* Top navigation bar */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link href="/jars" className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <ArrowLeft className="h-5 w-5 text-[#4a3520]" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Cookie Jar Logo" width={40} height={40} />
              <span className="text-2xl font-bold text-[#4a3520]">Cookie Jar V3</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Sepolia</span>
            </div>
            {isConnected ? (
              <div className="py-1 px-3 rounded-full bg-white text-sm font-medium">{displayAddress}</div>
            ) : (
              <div className="py-1 px-3 rounded-full bg-red-100 text-red-600 text-sm font-medium">Not Connected</div>
            )}
          </div>
        </div>

        {/* Page title */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-3 text-[#4a3520] uppercase tracking-tight">Create a Cookie Jar</h1>
          <p className="text-xl text-[#4a3520]">
            Set up a new cookie jar with customized access controls and withdrawal rules.
          </p>
        </div>
      </div>
    </div>
  )
}

