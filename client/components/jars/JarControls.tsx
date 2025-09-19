"use client"

import { RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChainDisplay } from "./ChainDisplay"
import { getNetworkName } from "@/lib/network-utils"

interface JarControlsProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterOption: string
  setFilterOption: (option: string) => void
  chainId: number
  isRefreshing: boolean
  onRefresh: () => void
  totalJars: number
  filteredCount: number
  isConnected: boolean
}

export function JarControls({
  searchTerm,
  setSearchTerm,
  filterOption,
  setFilterOption,
  chainId,
  isRefreshing,
  onRefresh,
  totalJars,
  filteredCount,
  isConnected
}: JarControlsProps) {
  return (
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
          onClick={onRefresh}
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
          <span className="flex-shrink-0">Total: <strong className="text-[hsl(var(--cj-dark-brown))]">{totalJars}</strong></span>
          {searchTerm && (
            <span className="flex-shrink-0">Filtered: <strong className="text-[hsl(var(--cj-dark-brown))]">{filteredCount}</strong></span>
          )}
        </div>
        <div className="content-caption flex-shrink-0">
          {isConnected ? 'Connected' : 'Browse Mode'}
        </div>
      </div>
    </div>
  )
}
