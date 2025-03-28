"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Percent, RefreshCw, Save } from "lucide-react"

export function AdminSystemSettings() {
  const [feePercentage, setFeePercentage] = useState("1")
  const [feeCollector, setFeeCollector] = useState("0x603f...02A6")
  const [emergencyWithdrawalEnabled, setEmergencyWithdrawalEnabled] = useState(true)

  return (
    <div className="space-y-6">
      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Fee Settings</CardTitle>
          <CardDescription className="text-[#a89a8c]">Configure the fee structure for all jars</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fee-percentage" className="text-white">
                Fee Percentage
              </Label>
              <div className="relative">
                <Input
                  id="fee-percentage"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={feePercentage}
                  onChange={(e) => setFeePercentage(e.target.value)}
                  className="bg-[#3c2a14] border-none text-white pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Percent className="h-4 w-4 text-[#a89a8c]" />
                </div>
              </div>
              <p className="text-[#a89a8c] text-sm">Percentage fee applied to all deposits (1% recommended)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee-collector" className="text-white">
                Fee Collector Address
              </Label>
              <Input
                id="fee-collector"
                value={feeCollector}
                onChange={(e) => setFeeCollector(e.target.value)}
                className="bg-[#3c2a14] border-none text-white"
              />
              <p className="text-[#a89a8c] text-sm">Address where all collected fees will be sent</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">
            <Save className="mr-2 h-4 w-4" /> Save Fee Settings
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Security Settings</CardTitle>
          <CardDescription className="text-[#a89a8c]">Configure security features for all jars</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emergency-withdrawal" className="text-white">
                Emergency Withdrawal
              </Label>
              <p className="text-[#a89a8c] text-sm">Allow admins to withdraw all funds in case of emergency</p>
            </div>
            <Switch
              id="emergency-withdrawal"
              checked={emergencyWithdrawalEnabled}
              onCheckedChange={setEmergencyWithdrawalEnabled}
            />
          </div>

          <div className="pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                  <RefreshCw className="mr-2 h-4 w-4" /> Reset All Blacklists
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#231811] text-white border-[#4a3520]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#ff8e14]">Reset All Blacklists</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#a89a8c]">
                    This will remove all addresses from all jar blacklists. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#3c2a14] text-white hover:bg-[#4a3520] border-none">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700">Reset All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Network Settings</CardTitle>
          <CardDescription className="text-[#a89a8c]">Configure supported networks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#ff5e14] text-white border-none px-3 py-1">Sepolia</Badge>
                  <span className="text-white">Sepolia Testnet</span>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#0052ff] text-white border-none px-3 py-1">Base</Badge>
                  <span className="text-white">Base Mainnet</span>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#ff0420] text-white border-none px-3 py-1">Optimism</Badge>
                  <span className="text-white">Optimism Mainnet</span>
                </div>
                <Switch defaultChecked={true} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#28a0f0] text-white border-none px-3 py-1">Arbitrum</Badge>
                  <span className="text-white">Arbitrum Mainnet</span>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#6f41d8] text-white border-none px-3 py-1">Gnosis</Badge>
                  <span className="text-white">Gnosis Chain</span>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#ff007a] text-white border-none px-3 py-1">Uniswap</Badge>
                  <span className="text-white">Uniswap Chain</span>
                </div>
                <Switch defaultChecked={false} />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">
            <Save className="mr-2 h-4 w-4" /> Save Network Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

