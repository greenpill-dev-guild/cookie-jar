"use client"
import { useCookieJarFactory } from "@/hooks/use-cookie-jar-factory"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, ChevronLeft, ChevronRight, Globe2, Image as ImageIcon, Loader2, RotateCcw } from "lucide-react"
import { JarGridSkeleton } from "@/components/loading/jar-skeleton"
import { useRouter } from "next/navigation"
import { useChainId, useAccount, useReadContracts } from "wagmi"
import { getNetworkName } from "@/lib/utils/network-utils"
import { getNativeCurrency } from '@/config/supported-networks'
import { useState, useEffect, useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { keccak256, toUtf8Bytes } from "ethers"
import { ethers } from "ethers"
import { Users, ShieldAlert, Crown, Check } from "lucide-react"
import { getAccessTypeName } from "@/lib/access-type-utils"
import { useReadCookieJarHasRole } from "@/generated"
import { useAllowlistStatus } from "@/hooks/use-allowlist-status"
import { ETH_ADDRESS } from "@/lib/utils/token-utils"
import { erc20Abi } from "viem"
import Image from "next/image"

interface JarContentProps {
  userAddress?: string;
}

// Constants for roles
const JAR_OWNER_ROLE = keccak256(toUtf8Bytes("JAR_OWNER")) as `0x${string}`

// Component to show user status for a specific jar
function JarStatusBadge({ jarAddress }: { jarAddress: string }) {
  const { address: userAddress } = useAccount()
  const { isAllowlisted } = useAllowlistStatus(jarAddress)
  const { data: hasJarOwnerRole } = useReadCookieJarHasRole({
    address: jarAddress as `0x${string}`,
    args: userAddress ? [JAR_OWNER_ROLE, userAddress as `0x${string}`] : undefined,
  })
  
  const isAdmin = hasJarOwnerRole === true
  
  // Flexible container that prevents layout shift while handling overflow
  return (
    <div className="flex justify-end min-w-0 flex-shrink-0">
      {isAdmin ? (
        <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800 text-xs flex items-center gap-1 truncate">
          <Crown className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Admin</span>
        </Badge>
      ) : isAllowlisted ? (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800 text-xs flex items-center gap-1 truncate max-w-[80px]">
          <Check className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Allowlisted</span>
        </Badge>
      ) : null}
    </div>
  )
}

// Component for jar image with fallback
function JarImage({ metadata, jarName }: { metadata?: string, jarName: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata)
        if (parsed.image) {
          setImageUrl(parsed.image)
          setImageError(false)
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }, [metadata])
  
  if (!imageUrl || imageError) {
    return (
      <div className="w-full h-40 bg-[hsl(var(--cj-warm-white))] flex items-center justify-center relative overflow-hidden m-0">
        <div className="absolute inset-0">
          <Image
            src="/images/cookie-jar.png"
            alt="Cookie Jar Placeholder"
            fill
            className="object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 text-center text-[hsl(var(--cj-brand-orange))]">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-80" />
          <span className="text-sm font-medium">Cookie Jar</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-40 bg-[hsl(var(--cj-warm-white))] overflow-hidden m-0">
      <Image
        src={imageUrl}
        alt={jarName}
        fill
        className="object-cover transition-transform duration-200 group-hover:scale-105"
        onError={() => setImageError(true)}
      />
    </div>
  )
}

// Simple chain display component (for now, focus on getting working state back)
function ChainDisplay({ chainId }: { chainId: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--cj-warm-white))] border border-[hsl(var(--border))] rounded-lg">
      <Globe2 className="h-4 w-4 text-[hsl(var(--cj-medium-brown))]" />
      <span className="text-sm font-medium text-[hsl(var(--cj-dark-brown))]">
        {getNetworkName(chainId)}
      </span>
    </div>
  )
}

// 🚀 Hook to fetch multiple token symbols efficiently
function useMultipleTokenSymbols(currencies: string[]) {
  const { data: symbolsData } = useReadContracts({
    contracts: currencies.map(currency => ({
      address: currency as `0x${string}`,
      abi: erc20Abi,
      functionName: "symbol",
    })),
    query: {
      enabled: currencies.length > 0,
      staleTime: 60000, // Cache for 1 minute
      gcTime: 300000,   // Keep in cache for 5 minutes
    },
  })

  // Create a mapping of currency address to symbol
  const symbolsMap: Record<string, string> = {}
  currencies.forEach((currency, index) => {
    const result = symbolsData?.[index]
    symbolsMap[currency.toLowerCase()] = result?.status === 'success' ? result.result as string : "TOKEN"
  })

  return symbolsMap
}

export function JarContentLazy({ userAddress }: JarContentProps) {
  const router = useRouter()
  const chainId = useChainId()
  const { isConnected } = useAccount()
  
  // Use the enhanced hook with progress tracking
  const { 
    cookieJarsData, 
    isLoading, 
    error, 
    refresh, 
    fetchProgress, 
    failedJars, 
    retryFailedJars 
  } = useCookieJarFactory()
  const nativeCurrency = getNativeCurrency(chainId)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const jarsPerPage = 9
  const [filterOption, setFilterOption] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 🚀 FIX: Get unique ERC20 currency addresses from all jars (exclude ETH)
  const uniqueERC20Currencies = useMemo(() => {
    const currencies = new Set<string>()
    cookieJarsData.forEach(jar => {
      if (jar.currency && jar.currency.toLowerCase() !== ETH_ADDRESS.toLowerCase()) {
        currencies.add(jar.currency)
      }
    })
    return Array.from(currencies)
  }, [cookieJarsData])

  // 🚀 FIX: Fetch all unique token symbols
  const tokenSymbols = useMultipleTokenSymbols(uniqueERC20Currencies)

  // Handle jar card click
  const handleJarClick = useCallback((jarAddress: string) => {
    router.push(`/jar/${jarAddress}`)
  }, [router])

  // Enhanced refresh function with loading state
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    console.log('🔄 Manual refresh triggered by user')
    
    try {
      await refresh()
      // Small delay to show the refresh animation
      setTimeout(() => setIsRefreshing(false), 500)
    } catch (error) {
      console.error('❌ Refresh failed:', error)
      setIsRefreshing(false)
    }
  }, [refresh])


  // Filter jars based on search term and filter option
  const filteredJars = useMemo(() => {
    return cookieJarsData.filter(
      (jar) =>
        jar.metadata?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jar.jarAddress.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [cookieJarsData, searchTerm, filterOption])

  // Get jars for the current page
  const currentJars = useMemo(() => {
    const startIndex = (currentPage - 1) * jarsPerPage
    const endIndex = startIndex + jarsPerPage
    return filteredJars.slice(startIndex, endIndex)
  }, [filteredJars, currentPage])

  const totalPages = Math.ceil(filteredJars.length / jarsPerPage)

  // Get formatted currency amount
  const getCurrencyAmount = (jar: any) => {
    if (jar.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
      return ethers.formatEther(jar.currencyHeldByJar || "0")
    } else {
      // For ERC20 tokens, we might need to handle different decimals
      // TODO: Could be enhanced to fetch actual decimals per token
      return ethers.formatUnits(jar.currencyHeldByJar || "0", 18) // Assuming 18 decimals for now
    }
  }

  // 🚀 FIX: Get currency symbol with real ERC20 token symbols
  const getCurrencySymbol = (jar: any) => {
    if (jar.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
      return nativeCurrency.symbol
    } else {
      // Use the fetched token symbols instead of hardcoded "TOKEN"
      return tokenSymbols[jar.currency?.toLowerCase()] || "TOKEN"
    }
  }

  // Get withdrawal amount display
  const getWithdrawalAmountDisplay = (jar: any) => {
    if (jar.withdrawalOption === 0) { // Fixed
      return `Fixed: ${ethers.formatEther(jar.fixedAmount || "0")} ${getCurrencySymbol(jar)}`
    } else { // Variable
      return `Max: ${ethers.formatEther(jar.maxWithdrawal || "0")} ${getCurrencySymbol(jar)}`
    }
  }

  // Parse jar name from metadata
  const getJarName = (jar: any) => {
    if (jar.metadata) {
      try {
        const parsed = JSON.parse(jar.metadata)
        return parsed.name || 'Cookie Jar'
      } catch (e) {
        return jar.metadata || 'Cookie Jar'
      }
    }
    return 'Cookie Jar'
  }

  // Progress indicator during loading
  if (isLoading && fetchProgress) {
    console.log('📊 JarContentLazy: Rendering progress state')
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="animate-spin" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Loading jars... {fetchProgress.completed}/{fetchProgress.total}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(fetchProgress.completed / fetchProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {fetchProgress.successful} successful, {fetchProgress.failed} failed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <JarGridSkeleton />
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    console.log('⏳ JarContentLazy: Rendering loading state')
    return <JarGridSkeleton />
  }

  // Error state
  if (error) {
    console.error('❌ JarContentLazy: Rendering error state:', error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] cj-card-primary rounded-lg p-8">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h3 className="text-xl font-semibold text-[hsl(var(--cj-dark-brown))]">Failed to Load Cookie Jars</h3>
          <p className="text-[hsl(var(--cj-medium-brown))] max-w-md">{error.message}</p>
          <Button onClick={handleRefresh} disabled={isRefreshing} className="mt-4">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (cookieJarsData.length === 0) {
    console.log('📭 JarContentLazy: Rendering empty state')
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] cj-card-primary rounded-lg p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🍪</div>
          <h3 className="text-xl font-semibold text-[hsl(var(--cj-dark-brown))]">No Cookie Jars Found</h3>
          <p className="text-[hsl(var(--cj-medium-brown))] max-w-md">
            There are no cookie jars on {getNetworkName(chainId)} yet. Create the first one to get started!
          </p>
          <Button 
            onClick={() => router.push("/create")}
            className="cj-btn-primary"
          >
            Create First Cookie Jar
          </Button>
        </div>
      </div>
    )
  }


  return (
    <div className="max-w-7xl mx-auto">

        {/* Compact Header with Controls and Stats */}
        <div className="cj-card-primary backdrop-blur-sm rounded-lg p-4 mb-6 shadow-sm">
          {/* Top Row: Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--cj-medium-brown))] h-4 w-4" />
              <Input
                placeholder="Search jars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Chain Display */}
            <div className="w-full lg:w-auto">
              <ChainDisplay chainId={chainId} />
            </div>
            
            {/* Filter */}
            <Select value={filterOption} onValueChange={setFilterOption}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jars</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full lg:w-auto whitespace-nowrap"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Bottom Row: Stats */}
          <div className="flex-between-safe text-responsive-sm text-[hsl(var(--cj-medium-brown))] pt-2 border-t border-border">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap min-w-0">
              <span className="flex-shrink-0">Network: <strong className="text-[hsl(var(--cj-dark-brown))]">{getNetworkName(chainId)}</strong></span>
              <span className="flex-shrink-0">Total: <strong className="text-[hsl(var(--cj-dark-brown))]">{cookieJarsData.length}</strong></span>
              {searchTerm && (
                <span className="flex-shrink-0">Filtered: <strong className="text-[hsl(var(--cj-dark-brown))]">{filteredJars.length}</strong></span>
              )}
            </div>
            <div className="content-caption flex-shrink-0">
              {isConnected ? 'Connected' : 'Browse Mode'}
            </div>
          </div>
        </div>

        {/* Jar Grid */}
        {filteredJars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[hsl(var(--cj-medium-brown))]">No jars match your search criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {currentJars.map((jar) => (
                <Card 
                  key={jar.jarAddress} 
                  className="cj-card-primary hover:shadow-lg transition-all duration-200 cursor-pointer group transform hover:-translate-y-1 overflow-hidden p-0"
                  onClick={() => handleJarClick(jar.jarAddress)}
                >
                  {/* Image Section - Full width, no padding */}
                  <JarImage metadata={jar.metadata} jarName={getJarName(jar)} />
                  
                  <CardHeader className="pb-3 px-6 pt-6">
                    <CardTitle className="content-title text-[hsl(var(--cj-dark-brown))] group-hover:text-[hsl(var(--cj-brand-orange))] transition-colors">
                      {getJarName(jar)}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <CardDescription className="address-text-mobile text-[hsl(var(--cj-medium-brown))] truncate flex-1 min-w-0">
                        {jar.jarAddress.slice(0, 6)}...{jar.jarAddress.slice(-4)}
                      </CardDescription>
                      <div className="flex-shrink-0 ml-auto">
                        <JarStatusBadge jarAddress={jar.jarAddress} />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 px-6 pb-6">
                    <div className="flex-between-safe">
                      <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">Balance:</span>
                      <span className="font-semibold text-[hsl(var(--cj-dark-brown))] text-responsive-sm truncate text-right">
                        {getCurrencyAmount(jar)} {getCurrencySymbol(jar)}
                      </span>
                    </div>
                    
                    <div className="flex-between-safe">
                      <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">Withdrawal:</span>
                      <span className="text-responsive-sm text-[hsl(var(--cj-dark-brown))] truncate text-right">
                        {getWithdrawalAmountDisplay(jar)}
                      </span>
                    </div>

                    <div className="flex-between-safe">
                      <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">Access:</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <Users className="h-3 w-3 flex-shrink-0" />
                        <span className="text-responsive-sm text-[hsl(var(--cj-dark-brown))] truncate">
                          {getAccessTypeName(jar.accessType)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="px-4 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Failed Jars Retry Section */}
        {failedJars.length > 0 && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-800">
                    {failedJars.length} jar(s) failed to load
                  </p>
                  <p className="text-sm text-yellow-600">
                    {failedJars.filter(f => f.canRetry).length} can be retried
                  </p>
                  {failedJars.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-yellow-700 cursor-pointer hover:text-yellow-800">
                        Show error details
                      </summary>
                      <div className="mt-2 space-y-1">
                        {failedJars.map((failure, index) => (
                          <div key={index} className="text-xs text-yellow-700">
                            <strong>{failure.jarAddress.slice(0, 8)}...:</strong> {failure.errorMessage}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retryFailedJars}
                  disabled={failedJars.filter(f => f.canRetry).length === 0}
                  className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                >
                  <RotateCcw size={16} className="mr-2" />
                  Retry Failed
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}