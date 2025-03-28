"use client"

import { useAccount, useBalance, useChainId } from "wagmi"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, ExternalLink } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function UserProfile() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: balance } = useBalance({
    address,
  })
  const [copied, setCopied] = useState(false)

  if (!address) return null

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Get ENS name if available (simplified for now)
  const ensName = "blocke.eth" // In a real app, you'd fetch this

  // Get network name
  const networkName =
    chainId === 11155111
      ? "Sepolia"
      : chainId === 8453
        ? "Base"
        : chainId === 10
          ? "Optimism"
          : chainId === 42161
            ? "Arbitrum"
            : "Unknown Network"

  // Copy address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Mock data for user activity
  const userJars = [
    { id: "1", name: "Team Expenses", network: "Sepolia", balance: "1.5 ETH", created: "2023-05-15" },
    { id: "2", name: "Marketing Budget", network: "Base", balance: "3.2 ETH", created: "2023-06-22" },
  ]

  const userWithdrawals = [
    { id: "1", jarName: "Team Expenses", amount: "0.1 ETH", date: "2023-07-10", txHash: "0x123..." },
    { id: "2", jarName: "Marketing Budget", amount: "0.5 ETH", date: "2023-08-05", txHash: "0x456..." },
  ]

  const userDeposits = [
    { id: "1", jarName: "Team Expenses", amount: "1.0 ETH", date: "2023-05-15", txHash: "0x789..." },
    { id: "2", jarName: "Marketing Budget", amount: "2.0 ETH", date: "2023-06-22", txHash: "0xabc..." },
    { id: "3", jarName: "Team Expenses", amount: "0.5 ETH", date: "2023-06-30", txHash: "0xdef..." },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-xl overflow-hidden mb-8">
        {/* Orange header */}
        <div className="h-32 bg-[#ff5e14]" />

        {/* Profile info section with dark brown background */}
        <div className="bg-[#231811] p-6 pt-16 relative">
          {/* Profile image */}
          <div className="absolute -top-16 left-6 rounded-full border-4 border-white overflow-hidden">
            <Image src="/profile.png" alt="Profile" width={120} height={120} className="bg-white" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#ff8e14]">{ensName}</h1>
              <div className="flex items-center mt-2">
                <span className="text-lg text-[#a89a8c]">{formatAddress(address)}</span>
                <button
                  onClick={copyAddress}
                  className="ml-2 p-1 hover:bg-[#3c2a14] rounded-full transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-[#a89a8c]" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 p-1 hover:bg-[#3c2a14] rounded-full transition-colors"
                  aria-label="View on Etherscan"
                >
                  <ExternalLink className="h-4 w-4 text-[#a89a8c]" />
                </a>
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-2">
              <Badge className="px-4 py-2 text-base bg-[#ff5e14] text-white border-none">{networkName}</Badge>
              <div className="text-xl font-medium text-white">
                {balance && `${Number.parseFloat(balance.formatted).toFixed(3)} ${balance.symbol}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="jars" className="w-full">
        <TabsList className="grid grid-cols-3 mb-8 bg-[#231811] rounded-xl h-14">
          <TabsTrigger
            value="jars"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            My Jars
          </TabsTrigger>
          <TabsTrigger
            value="withdrawals"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            Withdrawals
          </TabsTrigger>
          <TabsTrigger
            value="deposits"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            Deposits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jars" className="space-y-4">
          {userJars.length > 0 ? (
            userJars.map((jar) => (
              <div key={jar.id} className="bg-[#231811] rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-[#ff8e14]">{jar.name}</h3>
                    <div className="flex items-center mt-2">
                      <Badge className="mr-2 bg-[#ff5e14] text-white border-none">{jar.network}</Badge>
                      <span className="text-[#a89a8c]">Created on {jar.created}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xl font-medium text-[#ff5e14]">{jar.balance}</div>
                    <Link href={`/jars/${jar.id}`}>
                      <Button
                        variant="outline"
                        className="border-[#ff5e14] text-[#ff5e14] hover:bg-[#ff5e14] hover:text-white"
                      >
                        View Jar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#231811] rounded-xl p-12 text-center">
              <p className="text-xl text-[#a89a8c]">You haven't created any jars yet.</p>
              <Button className="mt-4 bg-[#ff5e14] hover:bg-[#ff5e14]/90">Create Your First Jar</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {userWithdrawals.length > 0 ? (
            userWithdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="bg-[#231811] rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#ff8e14]">Withdrawal from {withdrawal.jarName}</h3>
                    <div className="flex items-center mt-2">
                      <span className="text-[#a89a8c]">{withdrawal.date}</span>
                      <span className="mx-2 text-[#a89a8c]">•</span>
                      <span className="text-[#a89a8c]">Tx: {withdrawal.txHash}</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${withdrawal.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-[#ff5e14]"
                        aria-label="View transaction"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="text-xl font-medium text-[#ff5e14]">{withdrawal.amount}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#231811] rounded-xl p-12 text-center">
              <p className="text-xl text-[#a89a8c]">You haven't made any withdrawals yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deposits" className="space-y-4">
          {userDeposits.length > 0 ? (
            userDeposits.map((deposit) => (
              <div key={deposit.id} className="bg-[#231811] rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#ff8e14]">Deposit to {deposit.jarName}</h3>
                    <div className="flex items-center mt-2">
                      <span className="text-[#a89a8c]">{deposit.date}</span>
                      <span className="mx-2 text-[#a89a8c]">•</span>
                      <span className="text-[#a89a8c]">Tx: {deposit.txHash}</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${deposit.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-[#ff5e14]"
                        aria-label="View transaction"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="text-xl font-medium text-[#ff5e14]">{deposit.amount}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#231811] rounded-xl p-12 text-center">
              <p className="text-xl text-[#a89a8c]">You haven't made any deposits yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

