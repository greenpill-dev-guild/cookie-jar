"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Edit, Trash2, DollarSign, Users, Search, Ban, CheckCircle2, Cookie } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for jars
const mockJars = [
  {
    id: "1",
    name: "Team Expenses",
    network: "Sepolia",
    balance: "1.5 ETH",
    accessType: "Whitelist",
    maxWithdrawal: "0.1 ETH",
    cooldownPeriod: "1 day",
    status: "active",
    createdAt: "2023-05-15",
    adminCount: 2,
    blacklistedAddresses: 1,
  },
  {
    id: "2",
    name: "Marketing Budget",
    network: "Base",
    balance: "3.2 ETH",
    accessType: "NFT Gated",
    maxWithdrawal: "0.5 ETH",
    cooldownPeriod: "7 days",
    status: "active",
    createdAt: "2023-06-22",
    adminCount: 1,
    blacklistedAddresses: 0,
  },
  {
    id: "3",
    name: "Developer Fund",
    network: "Optimism",
    balance: "5.0 ETH",
    accessType: "Whitelist",
    maxWithdrawal: "1.0 ETH",
    cooldownPeriod: "3 days",
    status: "active",
    createdAt: "2023-07-10",
    adminCount: 3,
    blacklistedAddresses: 2,
  },
  {
    id: "4",
    name: "Community Rewards",
    network: "Arbitrum",
    balance: "2.5 ETH",
    accessType: "NFT Gated",
    maxWithdrawal: "0.2 ETH",
    cooldownPeriod: "2 days",
    status: "inactive",
    createdAt: "2023-08-05",
    adminCount: 1,
    blacklistedAddresses: 0,
  },
]

export function AdminJarManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [networkFilter, setNetworkFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Filter jars based on search and filters
  const filteredJars = mockJars.filter((jar) => {
    const matchesSearch = jar.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesNetwork = networkFilter === "all" || jar.network === networkFilter
    const matchesStatus = statusFilter === "all" || jar.status === statusFilter

    return matchesSearch && matchesNetwork && matchesStatus
  })

  return (
    <div className="space-y-6">
      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Jar Management</CardTitle>
          <CardDescription className="text-[#a89a8c]">Manage all cookie jars across different networks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#a89a8c]" />
              <Input
                placeholder="Search jars by name..."
                className="pl-10 bg-[#3c2a14] border-none text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[180px] bg-[#3c2a14] border-none text-white">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent className="bg-[#3c2a14] border-[#4a3520] text-white">
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="Sepolia">Sepolia</SelectItem>
                <SelectItem value="Base">Base</SelectItem>
                <SelectItem value="Optimism">Optimism</SelectItem>
                <SelectItem value="Arbitrum">Arbitrum</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-[#3c2a14] border-none text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#3c2a14] border-[#4a3520] text-white">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-[#4a3520] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#3c2a14]">
                <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                  <TableHead className="text-[#ff8e14]">Jar Name</TableHead>
                  <TableHead className="text-[#ff8e14]">Network</TableHead>
                  <TableHead className="text-[#ff8e14]">Balance</TableHead>
                  <TableHead className="text-[#ff8e14]">Access Type</TableHead>
                  <TableHead className="text-[#ff8e14]">Status</TableHead>
                  <TableHead className="text-[#ff8e14]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJars.map((jar) => (
                  <TableRow key={jar.id} className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                    <TableCell className="font-medium text-white">{jar.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-[#ff5e14] text-white border-none">{jar.network}</Badge>
                    </TableCell>
                    <TableCell className="text-[#ff5e14] font-medium">{jar.balance}</TableCell>
                    <TableCell className="text-[#a89a8c]">{jar.accessType}</TableCell>
                    <TableCell>
                      <Badge className={jar.status === "active" ? "bg-green-600 text-white" : "bg-gray-600 text-white"}>
                        {jar.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-[#a89a8c] hover:text-white hover:bg-[#3c2a14]"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#231811] text-white border-[#4a3520]">
                            <DialogHeader>
                              <DialogTitle className="text-[#ff8e14]">Edit Jar: {jar.name}</DialogTitle>
                              <DialogDescription className="text-[#a89a8c]">
                                Make changes to the jar settings here.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="jar-name" className="text-white">
                                  Name
                                </Label>
                                <Input
                                  id="jar-name"
                                  defaultValue={jar.name}
                                  className="col-span-3 bg-[#3c2a14] border-none text-white"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="max-withdrawal" className="text-white">
                                  Max Withdrawal
                                </Label>
                                <Input
                                  id="max-withdrawal"
                                  defaultValue={jar.maxWithdrawal.split(" ")[0]}
                                  className="col-span-3 bg-[#3c2a14] border-none text-white"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cooldown" className="text-white">
                                  Cooldown Period
                                </Label>
                                <Select
                                  defaultValue={
                                    jar.cooldownPeriod === "1 day"
                                      ? "86400"
                                      : jar.cooldownPeriod === "2 days"
                                        ? "172800"
                                        : jar.cooldownPeriod === "3 days"
                                          ? "259200"
                                          : jar.cooldownPeriod === "7 days"
                                            ? "604800"
                                            : "86400"
                                  }
                                >
                                  <SelectTrigger
                                    id="cooldown"
                                    className="col-span-3 bg-[#3c2a14] border-none text-white"
                                  >
                                    <SelectValue placeholder="Select cooldown" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#3c2a14] border-[#4a3520] text-white">
                                    <SelectItem value="3600">1 hour</SelectItem>
                                    <SelectItem value="86400">1 day</SelectItem>
                                    <SelectItem value="172800">2 days</SelectItem>
                                    <SelectItem value="259200">3 days</SelectItem>
                                    <SelectItem value="604800">7 days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-white">
                                  Status
                                </Label>
                                <Select defaultValue={jar.status}>
                                  <SelectTrigger id="status" className="col-span-3 bg-[#3c2a14] border-none text-white">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#3c2a14] border-[#4a3520] text-white">
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-[#a89a8c] hover:text-white hover:bg-[#3c2a14]"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#231811] text-white border-[#4a3520]">
                            <DialogHeader>
                              <DialogTitle className="text-[#ff8e14]">Manage Access: {jar.name}</DialogTitle>
                              <DialogDescription className="text-[#a89a8c]">
                                Manage whitelist, blacklist, and admin access.
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="whitelist">
                              <TabsList className="bg-[#3c2a14]">
                                <TabsTrigger
                                  value="whitelist"
                                  className="data-[state=active]:bg-[#ff5e14] data-[state=active]:text-white"
                                >
                                  Whitelist
                                </TabsTrigger>
                                <TabsTrigger
                                  value="blacklist"
                                  className="data-[state=active]:bg-[#ff5e14] data-[state=active]:text-white"
                                >
                                  Blacklist
                                </TabsTrigger>
                                <TabsTrigger
                                  value="admins"
                                  className="data-[state=active]:bg-[#ff5e14] data-[state=active]:text-white"
                                >
                                  Admins
                                </TabsTrigger>
                                {jar.accessType === "NFT Gated" && (
                                  <TabsTrigger
                                    value="nft"
                                    className="data-[state=active]:bg-[#ff5e14] data-[state=active]:text-white"
                                  >
                                    NFT Gates
                                  </TabsTrigger>
                                )}
                              </TabsList>
                              <TabsContent value="whitelist" className="border-none pt-4">
                                <div className="flex gap-2 mb-4">
                                  <Input
                                    placeholder="Add address to whitelist"
                                    className="bg-[#3c2a14] border-none text-white"
                                  />
                                  <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Add</Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-[#4a3520] rounded-md">
                                  <Table>
                                    <TableHeader className="bg-[#3c2a14]">
                                      <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                                        <TableHead className="text-[#ff8e14]">Address</TableHead>
                                        <TableHead className="text-[#ff8e14] text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      <TableRow className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                                        <TableCell className="font-medium text-[#a89a8c]">0x1234...5678</TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-400 hover:bg-[#3c2a14]"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                      <TableRow className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                                        <TableCell className="font-medium text-[#a89a8c]">0xabcd...ef01</TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-400 hover:bg-[#3c2a14]"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </TabsContent>
                              <TabsContent value="blacklist" className="border-none pt-4">
                                <div className="flex gap-2 mb-4">
                                  <Input
                                    placeholder="Add address to blacklist"
                                    className="bg-[#3c2a14] border-none text-white"
                                  />
                                  <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Add</Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-[#4a3520] rounded-md">
                                  <Table>
                                    <TableHeader className="bg-[#3c2a14]">
                                      <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                                        <TableHead className="text-[#ff8e14]">Address</TableHead>
                                        <TableHead className="text-[#ff8e14] text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {jar.blacklistedAddresses > 0 ? (
                                        <TableRow className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                                          <TableCell className="font-medium text-[#a89a8c]">0x7890...1234</TableCell>
                                          <TableCell className="text-right">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-green-500 hover:text-green-400 hover:bg-[#3c2a14]"
                                            >
                                              <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        <TableRow>
                                          <TableCell colSpan={2} className="text-center text-[#a89a8c]">
                                            No blacklisted addresses
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TabsContent>
                              <TabsContent value="admins" className="border-none pt-4">
                                <div className="flex gap-2 mb-4">
                                  <Input
                                    placeholder="Add admin address"
                                    className="bg-[#3c2a14] border-none text-white"
                                  />
                                  <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Add</Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-[#4a3520] rounded-md">
                                  <Table>
                                    <TableHeader className="bg-[#3c2a14]">
                                      <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                                        <TableHead className="text-[#ff8e14]">Address</TableHead>
                                        <TableHead className="text-[#ff8e14] text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      <TableRow className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                                        <TableCell className="font-medium text-[#a89a8c]">
                                          0x603f...02A6 (You)
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button variant="ghost" size="icon" disabled className="text-gray-500">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                      {jar.adminCount > 1 && (
                                        <TableRow className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                                          <TableCell className="font-medium text-[#a89a8c]">0x4567...8901</TableCell>
                                          <TableCell className="text-right">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-red-500 hover:text-red-400 hover:bg-[#3c2a14]"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TabsContent>
                              {jar.accessType === "NFT Gated" && (
                                <TabsContent value="nft" className="border-none pt-4">
                                  <div className="flex gap-2 mb-4">
                                    <Input
                                      placeholder="NFT Contract Address"
                                      className="bg-[#3c2a14] border-none text-white"
                                    />
                                    <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Add</Button>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto border border-[#4a3520] rounded-md">
                                    <Table>
                                      <TableHeader className="bg-[#3c2a14]">
                                        <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                                          <TableHead className="text-[#ff8e14]">Contract</TableHead>
                                          <TableHead className="text-[#ff8e14]">Type</TableHead>
                                          <TableHead className="text-[#ff8e14] text-right">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        <TableRow className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                                          <TableCell className="font-medium text-[#a89a8c]">0xdef0...1234</TableCell>
                                          <TableCell className="text-[#a89a8c]">ERC721</TableCell>
                                          <TableCell className="text-right">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-red-500 hover:text-red-400 hover:bg-[#3c2a14]"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </div>
                                  <p className="text-[#a89a8c] text-sm mt-2">
                                    Note: You can add up to 5 NFT collections for access control.
                                  </p>
                                </TabsContent>
                              )}
                            </Tabs>
                            <DialogFooter>
                              <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-400 hover:bg-[#3c2a14]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#231811] text-white border-[#4a3520]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[#ff8e14]">Delete Jar</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#a89a8c]">
                                Are you sure you want to delete this jar? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-[#3c2a14] text-white hover:bg-[#4a3520] border-none">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredJars.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#a89a8c]">
                      No jars found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-[#a89a8c]">
            Showing {filteredJars.length} of {mockJars.length} jars
          </div>
          <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Emergency Withdraw All</Button>
        </CardFooter>
      </Card>

      <Card className="bg-[#231811] border-none">
        (
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">Jar Statistics</CardTitle>
          <CardDescription className="text-[#a89a8c]">Overview of all jars across networks</CardDescription>
        </CardHeader>
        )
        <CardContent>
          (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Total Jars</p>
                  <h3 className="text-3xl font-bold text-white">{mockJars.length}</h3>
                </div>
                <Cookie className="h-10 w-10 text-[#ff5e14]" />
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Total Balance</p>
                  <h3 className="text-3xl font-bold text-white">12.2 ETH</h3>
                </div>
                <DollarSign className="h-10 w-10 text-[#ff5e14]" />
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Active Jars</p>
                  <h3 className="text-3xl font-bold text-white">3</h3>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Blacklisted Addresses</p>
                  <h3 className="text-3xl font-bold text-white">3</h3>
                </div>
                <Ban className="h-10 w-10 text-red-500" />
              </div>
            </div>
          </div>
          , )
        </CardContent>
      </Card>
    </div>
  )
}

