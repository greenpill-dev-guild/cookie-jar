"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useCookieJars, type JarData } from "@/hooks/use-cookie-jars"
import { useJarInteractions } from "@/hooks/use-jar-interactions"
import { useEventListener } from "@/hooks/use-event-listener"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatedButton } from "@/components/animated-button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Clock, Cookie, Download, ExternalLink, Shield, Upload, Loader2 } from "lucide-react"
import { ethers } from "ethers"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export function JarDetails({ id }: { id: string }) {
  const { isConnected, address } = useAccount()
  const { fetchJar } = useCookieJars()
  const { depositETH, withdrawETH, isDepositing, isWithdrawing } = useJarInteractions()
  const { events } = useEventListener(id)

  const [jar, setJar] = useState<JarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const { toast } = useToast()

  // Load jar details
  useEffect(() => {
    const loadJarDetails = async () => {
      setLoading(true)
      const jarData = await fetchJar(id)
      if (jarData) {
        setJar(jarData)
      }
      setLoading(false)
    }

    loadJarDetails()
  }, [id, fetchJar])

  // Update jar when new events come in
  useEffect(() => {
    if (events.length > 0 && jar) {
      // Refresh jar data when events occur
      fetchJar(id).then((jarData) => {
        if (jarData) {
          setJar(jarData)
        }
      })
    }
  }, [events, jar, id, fetchJar])

  // Format time period from seconds to human-readable format
  const formatTimePeriod = (seconds: string) => {
    const sec = Number.parseInt(seconds)
    if (sec < 60) return `${sec} seconds`
    if (sec < 3600) return `${Math.floor(sec / 60)} minutes`
    if (sec < 86400) return `${Math.floor(sec / 3600)} hours`
    return `${Math.floor(sec / 86400)} days`
  }

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Calculate time until next withdrawal
  const getTimeUntilNextWithdrawal = () => {
    if (!jar || !jar.lastWithdrawal) return "Now"

    const cooldownMs = Number.parseInt(jar.cooldownPeriod) * 1000
    const nextWithdrawalTime = jar.lastWithdrawal + cooldownMs
    const now = Date.now()

    if (now >= nextWithdrawalTime) return "Now"

    const remainingMs = nextWithdrawalTime - now
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60))
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

    if (remainingHours > 0) {
      return `${remainingHours}h ${remainingMinutes}m`
    } else {
      return `${remainingMinutes}m`
    }
  }

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to withdraw",
        variant: "destructive",
      })
      return
    }

    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      })
      return
    }

    if (jar?.requirePurpose && (!purpose || purpose.length < 10)) {
      toast({
        title: "Purpose required",
        description: "Please provide a purpose with at least 10 characters",
        variant: "destructive",
      })
      return
    }

    // For ETH withdrawals
    const success = await withdrawETH(id, withdrawAmount, purpose)

    if (success) {
      // Reset form
      setWithdrawAmount("")
      setPurpose("")

      // Jar data will be updated via events
    }
  }

  const handleDeposit = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to deposit",
        variant: "destructive",
      })
      return
    }

    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      })
      return
    }

    // For ETH deposits
    const success = await depositETH(id, depositAmount)

    if (success) {
      // Reset form
      setDepositAmount("")

      // Jar data will be updated via events
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="sticky top-0 z-50 cream-bg py-6 flex items-center gap-4">
          <Link href="/jars" className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="feature-card">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-6 w-full mb-6" />
              <div className="space-y-6">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              </div>
            </div>
            <div className="feature-card">
              <Skeleton className="h-8 w-1/2 mb-6" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
          <div className="space-y-8">
            <div className="feature-card">
              <Skeleton className="h-8 w-1/2 mb-6" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div className="feature-card">
              <Skeleton className="h-8 w-1/2 mb-6" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!jar) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl shadow-xl p-12">
        <Cookie className="h-16 w-16 mx-auto text-primary mb-6" />
        <h3 className="text-3xl font-semibold mb-4">COOKIE JAR NOT FOUND</h3>
        <p className="text-xl text-muted-foreground mb-8">
          The cookie jar you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/jars">
          <AnimatedButton text="BACK TO JARS" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-50 cream-bg py-6 flex items-center gap-4">
        <Link href="/jars" className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Back</span>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">{jar.name}</h1>
          <Badge
            variant={jar.network === "Sepolia" ? "outline" : "default"}
            className="text-lg px-4 py-1 bg-primary/10 text-primary border-none"
          >
            {jar.network}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="feature-card">
            <h2 className="text-2xl font-bold mb-2">JAR DETAILS</h2>
            <p className="text-lg text-muted-foreground mb-6">{jar.description}</p>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-lg text-muted-foreground">Contract Address</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-lg truncate">{jar.address}</p>
                    <a
                      href={`${jar.networkExplorer}/address/${jar.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">View on explorer</span>
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-lg text-muted-foreground">Token</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-lg truncate">
                      {jar.token}{" "}
                      {jar.tokenAddress !== ethers.ZeroAddress &&
                        `(${jar.tokenAddress.substring(0, 6)}...${jar.tokenAddress.substring(38)})`}
                    </p>
                    {jar.tokenAddress !== ethers.ZeroAddress && (
                      <a
                        href={`${jar.networkExplorer}/token/${jar.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View token on explorer</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-lg text-muted-foreground">Access Type</p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <p className="text-lg">{jar.accessType}</p>
                  </div>
                </div>
                <div>
                  <p className="text-lg text-muted-foreground">Cooldown Period</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="text-lg">{formatTimePeriod(jar.cooldownPeriod)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-lg text-muted-foreground">Max Withdrawal</p>
                  <p className="text-xl font-medium text-primary">
                    {jar.maxWithdrawal} {jar.token}
                  </p>
                </div>
                <div>
                  <p className="text-lg text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-medium text-primary">
                    {jar.balance} {jar.token}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-lg text-muted-foreground">Purpose Required</p>
                  <p className="text-lg">{jar.requirePurpose ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-lg text-muted-foreground">Fixed Withdrawal</p>
                  <p className="text-lg">{jar.fixedWithdrawalAmount ? "Yes" : "No"}</p>
                </div>
              </div>

              {jar.admins && jar.admins.length > 0 && (
                <div>
                  <p className="text-lg text-muted-foreground">Admins</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jar.admins.map((admin, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-lg px-4 py-1 bg-primary/10 text-primary border-none"
                      >
                        {admin}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="feature-card">
            <h2 className="text-2xl font-bold mb-6">WITHDRAWAL HISTORY</h2>
            <div className="rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-lg">User</TableHead>
                    <TableHead className="text-lg">Amount</TableHead>
                    <TableHead className="text-lg">Purpose</TableHead>
                    <TableHead className="text-lg">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jar.withdrawalHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-lg">
                        No withdrawals yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    jar.withdrawalHistory.map((withdrawal, index) => (
                      <TableRow key={index} className="hover:bg-accent/20 transition-colors">
                        <TableCell className="font-mono text-lg">
                          {withdrawal.user.substring(0, 6)}...{withdrawal.user.substring(38)}
                        </TableCell>
                        <TableCell className="font-medium text-lg">
                          {withdrawal.amount} {jar.token}
                        </TableCell>
                        <TableCell className="text-lg">{withdrawal.purpose}</TableCell>
                        <TableCell className="text-lg">{formatDate(withdrawal.timestamp)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {!isConnected ? (
            <div className="feature-card">
              <h2 className="text-2xl font-bold mb-2">CONNECT WALLET</h2>
              <p className="text-lg text-muted-foreground mb-6">Connect your wallet to interact with this cookie jar</p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : (
            <>
              <div className="feature-card">
                <h2 className="text-2xl font-bold mb-2">WITHDRAW COOKIES</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  {jar.isEligible
                    ? `You can withdraw up to ${jar.maxWithdrawal} ${jar.token}`
                    : "You are not eligible to withdraw from this jar"}
                </p>

                {jar.isEligible ? (
                  <>
                    <div className="mb-6">
                      <p className="text-lg text-muted-foreground mb-1">Next withdrawal available</p>
                      <p className="text-xl font-medium text-primary">{getTimeUntilNextWithdrawal()}</p>
                    </div>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label htmlFor="withdrawAmount" className="text-lg font-medium block mb-2">
                          Amount
                        </label>
                        <Input
                          id="withdrawAmount"
                          type="number"
                          placeholder={`Max: ${jar.maxWithdrawal}`}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          max={jar.maxWithdrawal}
                          min="0"
                          step="0.01"
                          className="focus:ring-primary text-lg py-6 bg-white"
                        />
                      </div>

                      {jar.requirePurpose && (
                        <div>
                          <label htmlFor="purpose" className="text-lg font-medium block mb-2">
                            Purpose (required)
                          </label>
                          <Textarea
                            id="purpose"
                            placeholder="What will you use these cookies for?"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="focus:ring-primary text-lg min-h-[120px] bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div className="btn-conteiner w-full">
                      <a
                        className={`btn-content w-full justify-center ${!jar.isEligible || isWithdrawing || getTimeUntilNextWithdrawal() !== "Now" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={
                          !jar.isEligible || isWithdrawing || getTimeUntilNextWithdrawal() !== "Now"
                            ? undefined
                            : handleWithdraw
                        }
                      >
                        <span className="btn-title flex items-center">
                          {isWithdrawing ? (
                            <>
                              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                              WITHDRAWING...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-6 w-6" />
                              WITHDRAW
                            </>
                          )}
                        </span>
                        <span className="icon-arrow">
                          <svg
                            width="66px"
                            height="43px"
                            viewBox="0 0 66 43"
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                          >
                            <g id="arrow" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                              <path
                                id="arrow-icon-one"
                                d="M40.1543933,3.89485454 L43.9763149,0.139296592 C44.1708311,-0.0518420739 44.4826329,-0.0518571125 44.6771675,0.139262789 L65.6916134,20.7848311 C66.0855801,21.1718824 66.0911863,21.8050225 65.704135,22.1989893 C65.7000188,22.2031791 65.6958657,22.2073326 65.6916762,22.2114492 L44.677098,42.8607841 C44.4825957,43.0519059 44.1708242,43.0519358 43.9762853,42.8608513 L40.1545186,39.1069479 C39.9575152,38.9134427 39.9546793,38.5968729 40.1481845,38.3998695 C40.1502893,38.3977268 40.1524132,38.395603 40.1545562,38.3934985 L56.9937789,21.8567812 C57.1908028,21.6632968 57.193672,21.3467273 57.0001876,21.1497035 C56.9980647,21.1475418 56.9959223,21.1453995 56.9937605,21.1432767 L40.1545208,4.60825197 C39.9574869,4.41477773 39.9546013,4.09820839 40.1480756,3.90117456 C40.1501626,3.89904911 40.1522686,3.89694235 40.1543933,3.89485454 Z"
                                fill="#FFFFFF"
                              ></path>
                              <path
                                id="arrow-icon-two"
                                d="M20.1543933,3.89485454 L23.9763149,0.139296592 C24.1708311,-0.0518420739 24.4826329,-0.0518571125 24.6771675,0.139262789 L45.6916134,20.7848311 C46.0855801,21.1718824 46.0911863,21.8050225 45.704135,22.1989893 C45.7000188,22.2031791 45.6958657,22.2073326 45.6916762,22.2114492 L24.677098,42.8607841 C24.4825957,43.0519059 24.1708242,43.0519358 23.9762853,42.8608513 L20.1545186,39.1069479 C19.9575152,38.9134427 19.9546793,38.5968729 20.1481845,38.3998695 C20.1502893,38.3977268 20.1524132,38.395603 20.1545562,38.3934985 L36.9937789,21.8567812 C37.1908028,21.6632968 37.193672,21.3467273 37.0001876,21.1497035 C36.9980647,21.1475418 36.9959223,21.1453995 36.9937605,21.1432767 L20.1545208,4.60825197 C19.9574869,4.41477773 19.9546013,4.09820839 20.1480756,3.90117456 C20.1501626,3.89904911 20.1522686,3.89694235 20.1543933,3.89485454 Z"
                                fill="#FFFFFF"
                              ></path>
                              <path
                                id="arrow-icon-three"
                                d="M0.154393339,3.89485454 L3.97631488,0.139296592 C4.17083111,-0.0518420739 4.48263286,-0.0518571125 4.67716753,0.139262789 L25.6916134,20.7848311 C26.0855801,21.1718824 26.0911863,21.8050225 25.704135,22.1989893 C25.7000188,22.2031791 25.6958657,22.2073326 25.6916762,22.2114492 L4.67709797,42.8607841 C4.48259567,43.0519059 4.17082418,43.0519358 3.97628526,42.8608513 L0.154518591,39.1069479 C-0.0424848215,38.9134427 -0.0453206733,38.5968729 0.148184538,38.3998695 C0.150289256,38.3977268 0.152413239,38.395603 0.154556228,38.3934985 L16.9937789,21.8567812 C17.1908028,21.6632968 17.193672,21.3467273 17.0001876,21.1497035 C16.9980647,21.1475418 16.9959223,21.1453995 16.9937605,21.1432767 L0.15452076,4.60825197 C-0.0425130651,4.41477773 -0.0453986756,4.09820839 0.148075568,3.90117456 C0.150162624,3.89904911 0.152268631,3.89694235 0.154393339,3.89485454 Z"
                                fill="#FFFFFF"
                              ></path>
                            </g>
                          </svg>
                        </span>
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-16 w-16 mx-auto text-primary mb-4" />
                    <p className="text-xl text-muted-foreground">You don't have access to withdraw from this jar</p>
                  </div>
                )}
              </div>

              <div className="feature-card">
                <h2 className="text-2xl font-bold mb-2">DEPOSIT COOKIES</h2>
                <p className="text-lg text-muted-foreground mb-6">Add more cookies to this jar</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="depositAmount" className="text-lg font-medium block mb-2">
                      Amount
                    </label>
                    <Input
                      id="depositAmount"
                      type="number"
                      placeholder={`Amount in ${jar.token}`}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="focus:ring-primary text-lg py-6 bg-white"
                    />
                  </div>
                  <p className="text-lg text-muted-foreground">Note: A 1% fee will be applied to your deposit</p>
                </div>

                <div className="btn-conteiner w-full">
                  <a
                    className={`btn-content w-full justify-center ${isDepositing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={isDepositing ? undefined : handleDeposit}
                  >
                    <span className="btn-title flex items-center">
                      {isDepositing ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          DEPOSITING...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-6 w-6" />
                          DEPOSIT
                        </>
                      )}
                    </span>
                    <span className="icon-arrow">
                      <svg
                        width="66px"
                        height="43px"
                        viewBox="0 0 66 43"
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                      >
                        <g id="arrow" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                          <path
                            id="arrow-icon-one"
                            d="M40.1543933,3.89485454 L43.9763149,0.139296592 C44.1708311,-0.0518420739 44.4826329,-0.0518571125 44.6771675,0.139262789 L65.6916134,20.7848311 C66.0855801,21.1718824 66.0911863,21.8050225 65.704135,22.1989893 C65.7000188,22.2031791 65.6958657,22.2073326 65.6916762,22.2114492 L44.677098,42.8607841 C44.4825957,43.0519059 44.1708242,43.0519358 43.9762853,42.8608513 L40.1545186,39.1069479 C39.9575152,38.9134427 39.9546793,38.5968729 40.1481845,38.3998695 C40.1502893,38.3977268 40.1524132,38.395603 40.1545562,38.3934985 L56.9937789,21.8567812 C57.1908028,21.6632968 57.193672,21.3467273 57.0001876,21.1497035 C56.9980647,21.1475418 56.9959223,21.1453995 56.9937605,21.1432767 L40.1545208,4.60825197 C39.9574869,4.41477773 39.9546013,4.09820839 40.1480756,3.90117456 C40.1501626,3.89904911 40.1522686,3.89694235 40.1543933,3.89485454 Z"
                            fill="#FFFFFF"
                          ></path>
                          <path
                            id="arrow-icon-two"
                            d="M20.1543933,3.89485454 L23.9763149,0.139296592 C24.1708311,-0.0518420739 24.4826329,-0.0518571125 24.6771675,0.139262789 L45.6916134,20.7848311 C46.0855801,21.1718824 46.0911863,21.8050225 45.704135,22.1989893 C45.7000188,22.2031791 45.6958657,22.2073326 45.6916762,22.2114492 L24.677098,42.8607841 C24.4825957,43.0519059 24.1708242,43.0519358 23.9762853,42.8608513 L20.1545186,39.1069479 C19.9575152,38.9134427 19.9546793,38.5968729 20.1481845,38.3998695 C20.1502893,38.3977268 20.1524132,38.395603 20.1545562,38.3934985 L36.9937789,21.8567812 C37.1908028,21.6632968 37.193672,21.3467273 37.0001876,21.1497035 C36.9980647,21.1475418 36.9959223,21.1453995 36.9937605,21.1432767 L20.1545208,4.60825197 C19.9574869,4.41477773 19.9546013,4.09820839 20.1480756,3.90117456 C20.1501626,3.89904911 20.1522686,3.89694235 20.1543933,3.89485454 Z"
                            fill="#FFFFFF"
                          ></path>
                          <path
                            id="arrow-icon-three"
                            d="M0.154393339,3.89485454 L3.97631488,0.139296592 C4.17083111,-0.0518420739 4.48263286,-0.0518571125 4.67716753,0.139262789 L25.6916134,20.7848311 C26.0855801,21.1718824 26.0911863,21.8050225 25.704135,22.1989893 C25.7000188,22.2031791 25.6958657,22.2073326 25.6916762,22.2114492 L4.67709797,42.8607841 C4.48259567,43.0519059 4.17082418,43.0519358 3.97628526,42.8608513 L0.154518591,39.1069479 C-0.0424848215,38.9134427 -0.0453206733,38.5968729 0.148184538,38.3998695 C0.150289256,38.3977268 0.152413239,38.395603 0.154556228,38.3934985 L16.9937789,21.8567812 C17.1908028,21.6632968 17.193672,21.3467273 17.0001876,21.1497035 C16.9980647,21.1475418 16.9959223,21.1453995 16.9937605,21.1432767 L0.15452076,4.60825197 C-0.0425130651,4.41477773 -0.0453986756,4.09820839 0.148075568,3.90117456 C0.150162624,3.89904911 0.152268631,3.89694235 0.154393339,3.89485454 Z"
                            fill="#FFFFFF"
                          ></path>
                        </g>
                      </svg>
                    </span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

