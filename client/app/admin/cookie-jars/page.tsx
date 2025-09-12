"use client"

import type React from "react"
import { useCookieJarData } from "@/hooks/use-cookie-jar-registry"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowUpRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { ETH_ADDRESS, useTokenInfo } from "@/lib/utils/token-utils"
import { formatAddress } from "@/lib/utils/format"
import type { Address } from "viem"

// Component to display currency with symbol instead of raw address
const CurrencyLabel: React.FC<{ address: string }> = ({ address }) => {
  const { symbol } = useTokenInfo(address as Address)
  
  if (!address) return null
  if (address === ETH_ADDRESS) return <span>ETH</span>
  
  return <span>{symbol || formatAddress(address)}</span>
}

// Component to display parsed metadata name
const MetadataDisplay: React.FC<{ metadata: string }> = ({ metadata }) => {
  try {
    const parsed = JSON.parse(metadata)
    return <span>{parsed.name || metadata}</span>
  } catch {
    return <span>{metadata}</span>
  }
}

const CookieJarPage: React.FC = () => {
  const { cookieJarsData, isLoading, error } = useCookieJarData()
  const router = useRouter()
  const { isConnected } = useAccount()

  const navigateToJar = (address: string) => {
    router.push(`/jar/${address}`)
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg font-semibold text-gray-700">Please connect your wallet to view Cookie Jars.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-4">
      <h1 className="text-2xl">Explore Cookie Jars</h1>
      <h2>View all deployed cookie jars and their details</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error: {error.message}</p>
        </div>
      )}

      {isLoading && cookieJarsData.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-6">
          {cookieJarsData.map((jar, index) => (
            <Card key={jar.jarAddress} className="p-4 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  <MetadataDisplay metadata={jar.metadata} />
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 truncate">{jar.jarAddress}</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-sm">
                  <span className="font-semibold">Currency:</span> <CurrencyLabel address={jar.currency} />
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Creator:</span> {formatAddress(jar.jarCreator)}
                </p>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateToJar(jar.jarAddress)}>
                  <ArrowUpRight className="h-4 w-4 mr-2" /> View
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {isLoading && cookieJarsData.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
          <span>Loading more cookie jars...</span>
        </div>
      )}

      <p className="text-sm text-gray-500">Total jars loaded: {cookieJarsData.length}</p>
    </div>
  )
}

export default CookieJarPage
