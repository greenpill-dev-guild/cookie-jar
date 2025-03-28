"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, DollarSign, Download, TrendingUp, Upload } from "lucide-react"

// Mock data for analytics
const mockTransactions = [
  {
    id: "1",
    type: "deposit",
    jarName: "Team Expenses",
    amount: "1.0 ETH",
    user: "0x1234...5678",
    date: "2023-08-15",
    network: "Sepolia",
  },
  {
    id: "2",
    type: "withdrawal",
    jarName: "Marketing Budget",
    amount: "0.5 ETH",
    user: "0xabcd...ef01",
    date: "2023-08-10",
    network: "Base",
  },
  {
    id: "3",
    type: "fee",
    jarName: "Team Expenses",
    amount: "0.01 ETH",
    user: "System",
    date: "2023-08-15",
    network: "Sepolia",
  },
  {
    id: "4",
    type: "deposit",
    jarName: "Developer Fund",
    amount: "2.0 ETH",
    user: "0x4567...8901",
    date: "2023-08-05",
    network: "Optimism",
  },
  {
    id: "5",
    type: "withdrawal",
    jarName: "Team Expenses",
    amount: "0.1 ETH",
    user: "0x1234...5678",
    date: "2023-08-02",
    network: "Sepolia",
  },
]

export function AdminAnalytics() {
  // Calculate totals
  const totalDeposits = "3.0 ETH"
  const totalWithdrawals = "0.6 ETH"
  const totalFees = "0.03 ETH"
  const netBalance = "2.37 ETH"

  return (
    <div className="space-y-6">
      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Analytics Overview</CardTitle>
          <CardDescription className="text-[#a89a8c]">Summary of all jar activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Total Deposits</p>
                  <h3 className="text-3xl font-bold text-white">{totalDeposits}</h3>
                </div>
                <div className="bg-green-500/20 p-2 rounded-full">
                  <ArrowUp className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Total Withdrawals</p>
                  <h3 className="text-3xl font-bold text-white">{totalWithdrawals}</h3>
                </div>
                <div className="bg-red-500/20 p-2 rounded-full">
                  <ArrowDown className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Total Fees</p>
                  <h3 className="text-3xl font-bold text-white">{totalFees}</h3>
                </div>
                <div className="bg-[#ff5e14]/20 p-2 rounded-full">
                  <DollarSign className="h-8 w-8 text-[#ff5e14]" />
                </div>
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Net Balance</p>
                  <h3 className="text-3xl font-bold text-white">{netBalance}</h3>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Recent Transactions</CardTitle>
          <CardDescription className="text-[#a89a8c]">Latest activity across all jars</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#4a3520] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#3c2a14]">
                <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                  <TableHead className="text-[#ff8e14]">Type</TableHead>
                  <TableHead className="text-[#ff8e14]">Jar</TableHead>
                  <TableHead className="text-[#ff8e14]">Amount</TableHead>
                  <TableHead className="text-[#ff8e14]">User</TableHead>
                  <TableHead className="text-[#ff8e14]">Network</TableHead>
                  <TableHead className="text-[#ff8e14]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                    <TableCell>
                      {tx.type === "deposit" && (
                        <Badge className="bg-green-600 text-white border-none flex items-center gap-1 w-fit">
                          <Upload className="h-3 w-3" /> Deposit
                        </Badge>
                      )}
                      {tx.type === "withdrawal" && (
                        <Badge className="bg-red-600 text-white border-none flex items-center gap-1 w-fit">
                          <Download className="h-3 w-3" /> Withdrawal
                        </Badge>
                      )}
                      {tx.type === "fee" && (
                        <Badge className="bg-[#ff5e14] text-white border-none flex items-center gap-1 w-fit">
                          <DollarSign className="h-3 w-3" /> Fee
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-white">{tx.jarName}</TableCell>
                    <TableCell className="text-[#ff5e14] font-medium">{tx.amount}</TableCell>
                    <TableCell className="text-[#a89a8c]">{tx.user}</TableCell>
                    <TableCell>
                      <Badge
                        className={`
                        ${
                          tx.network === "Sepolia"
                            ? "bg-[#ff5e14]"
                            : tx.network === "Base"
                              ? "bg-[#0052ff]"
                              : tx.network === "Optimism"
                                ? "bg-[#ff0420]"
                                : tx.network === "Arbitrum"
                                  ? "bg-[#28a0f0]"
                                  : "bg-[#6f41d8]"
                        } 
                        text-white border-none`}
                      >
                        {tx.network}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#a89a8c]">{tx.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Network Distribution</CardTitle>
          <CardDescription className="text-[#a89a8c]">Jar distribution across networks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex flex-col items-center justify-center">
                <Badge className="bg-[#ff5e14] text-white border-none px-3 py-1 mb-2">Sepolia</Badge>
                <p className="text-[#a89a8c]">Jars</p>
                <h3 className="text-2xl font-bold text-white">2</h3>
                <p className="text-[#a89a8c] mt-2">Balance</p>
                <h4 className="text-xl font-bold text-[#ff5e14]">1.5 ETH</h4>
              </div>
            </div>

            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex flex-col items-center justify-center">
                <Badge className="bg-[#0052ff] text-white border-none px-3 py-1 mb-2">Base</Badge>
                <p className="text-[#a89a8c]">Jars</p>
                <h3 className="text-2xl font-bold text-white">1</h3>
                <p className="text-[#a89a8c] mt-2">Balance</p>
                <h4 className="text-xl font-bold text-[#ff5e14]">3.2 ETH</h4>
              </div>
            </div>

            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex flex-col items-center justify-center">
                <Badge className="bg-[#ff0420] text-white border-none px-3 py-1 mb-2">Optimism</Badge>
                <p className="text-[#a89a8c]">Jars</p>
                <h3 className="text-2xl font-bold text-white">1</h3>
                <p className="text-[#a89a8c] mt-2">Balance</p>
                <h4 className="text-xl font-bold text-[#ff5e14]">5.0 ETH</h4>
              </div>
            </div>

            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex flex-col items-center justify-center">
                <Badge className="bg-[#28a0f0] text-white border-none px-3 py-1 mb-2">Arbitrum</Badge>
                <p className="text-[#a89a8c]">Jars</p>
                <h3 className="text-2xl font-bold text-white">1</h3>
                <p className="text-[#a89a8c] mt-2">Balance</p>
                <h4 className="text-xl font-bold text-[#ff5e14]">2.5 ETH</h4>
              </div>
            </div>

            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex flex-col items-center justify-center">
                <Badge className="bg-[#6f41d8] text-white border-none px-3 py-1 mb-2">Gnosis</Badge>
                <p className="text-[#a89a8c]">Jars</p>
                <h3 className="text-2xl font-bold text-white">0</h3>
                <p className="text-[#a89a8c] mt-2">Balance</p>
                <h4 className="text-xl font-bold text-[#ff5e14]">0.0 ETH</h4>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

