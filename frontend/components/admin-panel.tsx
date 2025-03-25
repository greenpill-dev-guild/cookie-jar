"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/components/wallet-provider"
import { useAdminActions } from "@/hooks/use-admin-actions"
import { useCookieJars } from "@/hooks/use-cookie-jars"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Ban, Check, Loader2, Search, Shield } from "lucide-react"
import { AnimatedButton } from "@/components/animated-button"
import { ethers } from "ethers"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { networks } from "@/lib/contracts"

export function AdminPanel() {
  const { address, isConnected, chainId } = useWallet()
  const { checkIsFeeCollector, blacklistJar, blacklistOwner, isJarBlacklisted, isOwnerBlacklisted, isLoading } =
    useAdminActions()
  const { jars, fetchJars } = useCookieJars()
  const { toast } = useToast()

  const [isFeeCollector, setIsFeeCollector] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState("base")
  const [jarAddress, setJarAddress] = useState("")
  const [ownerAddress, setOwnerAddress] = useState("")
  const [jarBlacklistStatus, setJarBlacklistStatus] = useState(false)
  const [ownerBlacklistStatus, setOwnerBlacklistStatus] = useState(false)
  const [blacklistedJars, setBlacklistedJars] = useState<string[]>([])
  const [blacklistedOwners, setBlacklistedOwners] = useState<string[]>([])
  const [isCheckingJar, setIsCheckingJar] = useState(false)
  const [isCheckingOwner, setIsCheckingOwner] = useState(false)

  // Check if current user is fee collector
  useEffect(() => {
    const checkFeeCollector = async () => {
      if (isConnected && address) {
        const result = await checkIsFeeCollector(selectedNetwork)
        setIsFeeCollector(result)
      } else {
        setIsFeeCollector(false)
      }
    }

    checkFeeCollector()
  }, [isConnected, address, selectedNetwork, checkIsFeeCollector])

  // Check jar blacklist status when jar address changes
  useEffect(() => {
    const checkJarStatus = async () => {
      if (jarAddress && ethers.isAddress(jarAddress)) {
        setIsCheckingJar(true)
        const status = await isJarBlacklisted(selectedNetwork, jarAddress)
        setJarBlacklistStatus(status)
        setIsCheckingJar(false)
      } else {
        setJarBlacklistStatus(false)
      }
    }

    checkJarStatus()
  }, [jarAddress, selectedNetwork, isJarBlacklisted])

  // Check owner blacklist status when owner address changes
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (ownerAddress && ethers.isAddress(ownerAddress)) {
        setIsCheckingOwner(true)
        const status = await isOwnerBlacklisted(selectedNetwork, ownerAddress)
        setOwnerBlacklistStatus(status)
        setIsCheckingOwner(false)
      } else {
        setOwnerBlacklistStatus(false)
      }
    }

    checkOwnerStatus()
  }, [ownerAddress, selectedNetwork, isOwnerBlacklisted])

  // Handle jar blacklisting
  const handleJarBlacklist = async () => {
    if (!jarAddress || !ethers.isAddress(jarAddress)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid jar address",
        variant: "destructive",
      })
      return
    }

    const success = await blacklistJar(selectedNetwork, jarAddress, !jarBlacklistStatus)
    if (success) {
      setJarBlacklistStatus(!jarBlacklistStatus)

      // Update blacklisted jars list
      if (!jarBlacklistStatus) {
        setBlacklistedJars([...blacklistedJars, jarAddress])
      } else {
        setBlacklistedJars(blacklistedJars.filter((jar) => jar !== jarAddress))
      }

      // Refresh jars list
      fetchJars()
    }
  }

  // Handle owner blacklisting
  const handleOwnerBlacklist = async () => {
    if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid owner address",
        variant: "destructive",
      })
      return
    }

    const success = await blacklistOwner(selectedNetwork, ownerAddress, !ownerBlacklistStatus)
    if (success) {
      setOwnerBlacklistStatus(!ownerBlacklistStatus)

      // Update blacklisted owners list
      if (!ownerBlacklistStatus) {
        setBlacklistedOwners([...blacklistedOwners, ownerAddress])
      } else {
        setBlacklistedOwners(blacklistedOwners.filter((owner) => owner !== ownerAddress))
      }
    }
  }

  // Check if an address is valid
  const isValidAddress = (address: string) => {
    return address && ethers.isAddress(address)
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Connect your wallet to access admin features</CardDescription>
        </CardHeader>
        <CardFooter>
          <AnimatedButton text="CONNECT WALLET" />
        </CardFooter>
      </Card>
    )
  }

  if (!isFeeCollector) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Only the fee collector can access this panel</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-center text-muted-foreground">
            You don't have permission to access the admin panel.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Super Admin Panel</CardTitle>
        <CardDescription>Manage blacklisted jars and owners</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="jars">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="jars">Blacklist Jars</TabsTrigger>
            <TabsTrigger value="owners">Blacklist Owners</TabsTrigger>
          </TabsList>

          <TabsContent value="jars" className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="network" className="text-lg font-medium block mb-2">
                  Network
                </label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger className="focus:ring-primary">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(networks).map((key) => (
                      <SelectItem key={key} value={key}>
                        {networks[key as keyof typeof networks].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="jarAddress" className="text-lg font-medium block mb-2">
                  Jar Address
                </label>
                <div className="flex gap-2">
                  <Input
                    id="jarAddress"
                    placeholder="0x..."
                    value={jarAddress}
                    onChange={(e) => setJarAddress(e.target.value)}
                    className="focus:ring-primary"
                  />
                  <Button variant="outline" size="icon" disabled={isCheckingJar}>
                    {isCheckingJar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {jarAddress && isValidAddress(jarAddress) && (
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-center gap-2">
                    {jarBlacklistStatus ? (
                      <Ban className="h-5 w-5 text-destructive" />
                    ) : (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    <span>{jarBlacklistStatus ? "This jar is blacklisted" : "This jar is not blacklisted"}</span>
                  </div>
                  <Button
                    variant={jarBlacklistStatus ? "outline" : "destructive"}
                    onClick={handleJarBlacklist}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : jarBlacklistStatus ? (
                      "Unblacklist"
                    ) : (
                      "Blacklist"
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Blacklisted Jars</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jar Address</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklistedJars.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No blacklisted jars
                        </TableCell>
                      </TableRow>
                    ) : (
                      blacklistedJars.map((jar, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">
                            {jar.substring(0, 6)}...{jar.substring(38)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{selectedNetwork}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Blacklisted</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setJarAddress(jar)
                                blacklistJar(selectedNetwork, jar, false)
                              }}
                            >
                              Unblacklist
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="owners" className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="network" className="text-lg font-medium block mb-2">
                  Network
                </label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger className="focus:ring-primary">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(networks).map((key) => (
                      <SelectItem key={key} value={key}>
                        {networks[key as keyof typeof networks].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="ownerAddress" className="text-lg font-medium block mb-2">
                  Owner Address
                </label>
                <div className="flex gap-2">
                  <Input
                    id="ownerAddress"
                    placeholder="0x..."
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    className="focus:ring-primary"
                  />
                  <Button variant="outline" size="icon" disabled={isCheckingOwner}>
                    {isCheckingOwner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {ownerAddress && isValidAddress(ownerAddress) && (
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-center gap-2">
                    {ownerBlacklistStatus ? (
                      <Ban className="h-5 w-5 text-destructive" />
                    ) : (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    <span>{ownerBlacklistStatus ? "This owner is blacklisted" : "This owner is not blacklisted"}</span>
                  </div>
                  <Button
                    variant={ownerBlacklistStatus ? "outline" : "destructive"}
                    onClick={handleOwnerBlacklist}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : ownerBlacklistStatus ? (
                      "Unblacklist"
                    ) : (
                      "Blacklist"
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Blacklisted Owners</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner Address</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklistedOwners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No blacklisted owners
                        </TableCell>
                      </TableRow>
                    ) : (
                      blacklistedOwners.map((owner, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">
                            {owner.substring(0, 6)}...{owner.substring(38)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{selectedNetwork}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Blacklisted</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOwnerAddress(owner)
                                blacklistOwner(selectedNetwork, owner, false)
                              }}
                            >
                              Unblacklist
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span>Blacklisting is a powerful action. Use with caution.</span>
        </div>
        <Button variant="outline" onClick={fetchJars}>
          Refresh Data
        </Button>
      </CardFooter>
    </Card>
  )
}

