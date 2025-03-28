"use client"

import { useAccount, useBalance, useChainId } from "wagmi"

export function WalletInfo() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: balance } = useBalance({
    address,
  })

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

  return (
    <div className="flex items-center gap-3">
      <span className="px-3 py-1 bg-[#ff5e14] text-white rounded-full text-sm font-medium">{networkName}</span>
      <span className="text-sm font-medium text-[#3c2a14]">
        {ensName || formatAddress(address)}
        {balance && ` (${Number.parseFloat(balance.formatted).toFixed(3)} ${balance.symbol})`}
      </span>
    </div>
  )
}

