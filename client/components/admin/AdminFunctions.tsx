"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigateToTop } from "@/hooks/useNavigateToTop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseEther, keccak256, toHex } from "viem"
import { ETH_ADDRESS, parseTokenAmount, useTokenInfo } from "@/lib/utils/token-utils"
import {
  useReadCookieJarHasRole,
  useWriteCookieJarEmergencyWithdraw,
  cookieJarAbi,
} from "../../generated"
import { useWriteContract } from "wagmi"
import { cookieJarV1Abi } from "@/lib/abis/cookie-jar-v1-abi"
import { isV2Chain } from "@/config/supported-networks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, UserPlus, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAccount, useChainId } from "wagmi"
import { getNativeCurrency } from '@/config/supported-networks'
import { AllowlistManagement } from "./AllowListManagement"

interface AdminFunctionsProps {
  address: `0x${string}`
}

// Hash the JAR_OWNER role
const JAR_OWNER_ROLE = keccak256(toHex("JAR_OWNER")) as `0x${string}`

export const AdminFunctions: React.FC<AdminFunctionsProps> = ({ address }) => {
  const chainId = useChainId();
  const nativeCurrency = getNativeCurrency(chainId);
  const { scrollToTop } = useNavigateToTop();
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenToWithdraw, setTokenToWithdraw] = useState<`0x${string}`>(ETH_ADDRESS as `0x${string}`)

  // Update emergency tokenToWithdraw when tokenAddress changes
  useEffect(() => {
    if (tokenAddress.length > 3) {
      setTokenToWithdraw(tokenAddress as `0x${string}`)
    } else {
      setTokenToWithdraw(ETH_ADDRESS as `0x${string}`)
    }
  }, [tokenAddress])

  // Get token info including decimals and symbol
  const { symbol, decimals } = useTokenInfo(tokenToWithdraw)
  const { toast } = useToast()
  const { address: currentUserAddress } = useAccount()

  // Check if current user has the JAR_OWNER role
  const { data: hasJarOwnerRole } = useReadCookieJarHasRole({
    address,
    args: [JAR_OWNER_ROLE, currentUserAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`],
  })

  // Emergency withdraw hook
  const {
    writeContract: emergencyWithdraw,
    error: emergencyWithdrawError,
    isSuccess: isEmergencyWithdrawSuccess,
  } = useWriteCookieJarEmergencyWithdraw()

  // Show success toasts
  useEffect(() => {
    if (isEmergencyWithdrawSuccess) {
      toast({
        title: "Emergency Withdrawal Complete",
        description: "Funds have been successfully withdrawn.",
      })
    }
  }, [isEmergencyWithdrawSuccess, toast])

  // Emergency withdraw function
  const handleEmergencyWithdraw = () => {
    if (!withdrawalAmount) return;
    console.log("Emergency withdrawal amount:", withdrawalAmount);

    try {
      const parsedAmount = parseTokenAmount(withdrawalAmount, decimals);

      emergencyWithdraw({
        address: address,
        args: [tokenToWithdraw, parsedAmount],
      });

      toast({
        title: "Emergency Withdraw Initiated",
        description: `Attempting to withdraw ${withdrawalAmount} ${symbol || (tokenToWithdraw === ETH_ADDRESS ? 'ETH' : 'tokens')}.`,
      });
    } catch (error) {
      console.error("Emergency withdrawal error:", error);
      toast({
        title: "Emergency Withdraw Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }

  // Check if current user has the JAR_OWNER role
  const isCurrentUserOwner = hasJarOwnerRole === true

  return (
    <div className="space-y-6 bg-[#2b1d0e] p-4 rounded-lg">
      <Tabs 
        defaultValue="access" 
        className="w-full"
        onValueChange={() => {
          // Scroll to top on tab change
          scrollToTop()
        }}
      >
        <TabsList className="mb-6 bg-[#fff8f0] p-1">
          <TabsTrigger
            value="access"
            className="data-[state=active]:bg-white data-[state=active]:text-[#ff5e14] data-[state=active]:shadow-sm text-[#4a3520]"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Access Control
          </TabsTrigger>
          <TabsTrigger
            value="emergency"
            className="data-[state=active]:bg-white data-[state=active]:text-[#ff5e14] data-[state=active]:shadow-sm text-[#4a3520]"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-[#fff8f0] rounded-t-lg">
              <CardTitle className="text-xl text-[#3c2a14] flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-[#ff5e14]" />
                Allowlist Management
              </CardTitle>
              <CardDescription className="text-[#8b7355]">
                Control who can access and withdraw from this jar
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AllowlistManagement cookieJarAddress={address as `0x${string}`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-[#fff8f0] rounded-t-lg">
              <CardTitle className="text-xl text-[#3c2a14] flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-[#ff5e14]" />
                Emergency Withdrawal
              </CardTitle>
              <CardDescription className="text-[#8b7355]">Withdraw funds in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-[#fff0e0] border border-[#ffcc80] rounded-lg p-4 text-[#e65100] flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Warning: Emergency Use Only</p>
                    <p className="text-sm mt-1">
                      This function should only be used in emergency situations. It will withdraw all funds from the
                      jar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label htmlFor="withdrawalAmount" className="text-[#ff5e14] font-medium">
                      Amount to Withdraw
                    </label>
                    <Input
                      id="withdrawalAmount"
                      placeholder="Amount"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="border-[#f0e6d8] bg-white text-[#3c2a14]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tokenAddress" className="text-[#ff5e14] font-medium">
                      Token Address
                    </label>
                    <Input
                      id="tokenAddress"
                      placeholder="0x... (leave empty for ETH)"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      className="border-[#f0e6d8] bg-white text-[#3c2a14]"
                    />
                    <p className="text-sm text-[#8b7355]">Leave blank if withdrawing {nativeCurrency.symbol}/native currency.</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-[#fff8f0] p-4 rounded-b-lg flex justify-end">
              <Button
                onClick={handleEmergencyWithdraw}
                variant="destructive"
                className="bg-[#d32f2f] hover:bg-[#b71c1c]"
                disabled={!withdrawalAmount}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Withdraw
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
