"use client"
import { useCookieJarFactory } from "@/hooks/useCookieJarFactory"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Loader2, RotateCcw } from "lucide-react"
import { JarGridSkeleton } from "@/components/loading/jar-skeleton"
import { useRouter } from "next/navigation"
import { useChainId, useAccount } from "wagmi"
import { getNativeCurrency } from '@/config/supported-networks'
import { useState, useMemo, useCallback } from "react"
import { ETH_ADDRESS } from "@/lib/utils/token-utils"
import { JarControls } from "./JarControls"
import { JarGrid } from "./JarGrid"
import { useMultipleTokenSymbols } from "@/hooks/useMultipleTokenSymbols"
import { getNetworkName } from "@/lib/utils/network-utils"

interface JarContentProps {
  userAddress?: string;
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

  // Get unique ERC20 currency addresses from all jars (exclude ETH)
  const uniqueERC20Currencies = useMemo(() => {
    const currencies = new Set<string>()
    cookieJarsData.forEach(jar => {
      if (jar.currency && jar.currency.toLowerCase() !== ETH_ADDRESS.toLowerCase()) {
        currencies.add(jar.currency)
      }
    })
    return Array.from(currencies)
  }, [cookieJarsData])

  // Fetch all unique token symbols
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
            <Loader2 className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
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
      <JarControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterOption={filterOption}
        setFilterOption={setFilterOption}
        chainId={chainId}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        totalJars={cookieJarsData.length}
        filteredCount={filteredJars.length}
        isConnected={isConnected}
      />

      <JarGrid
        jars={currentJars}
        nativeCurrency={nativeCurrency}
        tokenSymbols={tokenSymbols}
        onJarClick={handleJarClick}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

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
