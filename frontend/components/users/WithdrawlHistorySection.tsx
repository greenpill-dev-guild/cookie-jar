"use client"

import type React from "react"
import { formatEther } from "viem"

// Export the Withdrawal interface so it can be imported elsewhere
export interface Withdrawal {
  amount: bigint
  purpose: string
}

interface WithdrawalHistorySectionProps {
  pastWithdrawals?: Withdrawal[]
}

export const WithdrawalHistorySection: React.FC<WithdrawalHistorySectionProps> = ({ pastWithdrawals = [] }) => {
  // Helper function to format wei to ETH with proper decimal places
  const formatWeiToEth = (weiAmount: bigint): string => {
    try {
      // Convert wei to ETH using formatEther from viem
      const ethValue = formatEther(weiAmount)

      // Format to 6 decimal places maximum
      const formattedValue = Number.parseFloat(ethValue).toFixed(6)

      // Remove trailing zeros after decimal point
      return formattedValue.replace(/\.?0+$/, "") + " ETH"
    } catch (error) {
      console.error("Error formatting wei to ETH:", error)
      return weiAmount.toString() + " wei"
    }
  }

  return (
    <div className="mt-6">
      <h1 className="text-lg font-semibold mb-2">Past Withdrawals from this Jar</h1>
      {pastWithdrawals.length > 0 ? (
        <ul className="space-y-4">
          {pastWithdrawals.map((withdrawal, index) => (
            <li key={index} className="border border-[#f0e6d8] p-4 rounded-lg bg-[#fff8f0]">
              <div className="flex flex-col md:flex-row md:justify-between gap-2">
                <div>
                  <p className="font-medium text-[#3c2a14]">
                    <span className="text-[#8b7355]">Amount:</span>{" "}
                    <span className="text-[#ff5e14]">{formatWeiToEth(withdrawal.amount)}</span>
                  </p>
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-[#3c2a14]">
                    <span className="text-[#8b7355]">Purpose:</span>{" "}
                    <span className="text-[#3c2a14]">{withdrawal.purpose || "No purpose provided"}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-8 text-[#8b7355] bg-[#fff8f0] rounded-lg border border-[#f0e6d8]">
          No withdrawal history available
        </div>
      )}
    </div>
  )
}
