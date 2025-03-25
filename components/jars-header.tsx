"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Search } from "lucide-react"
import { CustomConnectButton } from "@/components/custom-connect-button"
import { useAccount } from "wagmi"
import { AnimatedButton } from "@/components/animated-button"

export function JarsHeader() {
  const [showFilters, setShowFilters] = useState(false)
  const { isConnected } = useAccount()

  return (
    <div className="mb-12 sticky top-0 z-50 cream-bg pt-8 pb-6 w-full">
      <div className="section-container w-full">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Cookie Jar Logo" width={48} height={48} />
            <span className="text-2xl md:text-3xl font-bold text-[#4a3520]">Cookie Jar V3</span>
          </Link>

          <div className="flex items-center gap-4">
            <CustomConnectButton />
            {isConnected && (
              <Link href="/create">
                <AnimatedButton text="CREATE JAR" small={true} />
              </Link>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-[#4a3520]">EXPLORE COOKIE JARS</h1>
          <p className="text-xl text-[#4a3520]">Discover and interact with cookie jars across all supported networks</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search jars by name, description, or address..."
              className="pl-12 py-6 text-lg bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden h-14 w-14"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-[220px] h-14 text-lg bg-white">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="optimism">Optimism</SelectItem>
                <SelectItem value="gnosis">Gnosis Chain</SelectItem>
                <SelectItem value="sepolia">Sepolia</SelectItem>
                <SelectItem value="arbitrum">Arbitrum</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[220px] h-14 text-lg bg-white">
                <SelectValue placeholder="Access Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="whitelist">Whitelist</SelectItem>
                <SelectItem value="nft">NFT Gated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 md:hidden">
            <Select defaultValue="all">
              <SelectTrigger className="h-14 text-lg bg-white">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="optimism">Optimism</SelectItem>
                <SelectItem value="gnosis">Gnosis Chain</SelectItem>
                <SelectItem value="sepolia">Sepolia</SelectItem>
                <SelectItem value="arbitrum">Arbitrum</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="h-14 text-lg bg-white">
                <SelectValue placeholder="Access Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="whitelist">Whitelist</SelectItem>
                <SelectItem value="nft">NFT Gated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}

