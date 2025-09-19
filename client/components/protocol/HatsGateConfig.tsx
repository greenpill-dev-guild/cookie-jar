import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Crown, Search, ExternalLink } from 'lucide-react'
import { useChainId } from 'wagmi'

// Hats Protocol SDK integration
interface HatInfo {
  id: string
  name?: string
  description?: string
  imageUri?: string
  isActive?: boolean
  wearerCount?: number
  maxSupply?: number
  tree?: {
    id: string
    name?: string
  }
}

// Hats contract addresses per network
const HATS_CONTRACTS: Record<number, string> = {
  1: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Ethereum Mainnet
  10: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Optimism
  100: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Gnosis Chain
  8453: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Base
  42161: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Arbitrum
  // Add testnets as needed
  11155111: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Sepolia
  84532: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137', // Base Sepolia
}

interface HatsGateConfigProps {
  onConfigChange: (config: { 
    hatId: string
    hatsContract: string
    hatInfo?: HatInfo 
  }) => void
  initialConfig?: { 
    hatId: string
    hatsContract: string
    hatInfo?: HatInfo 
  }
  className?: string
}

export const HatsGateConfig: React.FC<HatsGateConfigProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const chainId = useChainId()
  const [hatId, setHatId] = useState(initialConfig?.hatId || '')
  const [hatInfo, setHatInfo] = useState<HatInfo | null>(initialConfig?.hatInfo || null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<HatInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [debouncedHatId, setDebouncedHatId] = useState('')

  // Get Hats contract address for current network
  const hatsContract = HATS_CONTRACTS[chainId] || HATS_CONTRACTS[1] // Default to mainnet

  // Debounce hat ID input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHatId(hatId)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [hatId])

  // Validate hat ID when debounced value changes
  useEffect(() => {
    if (debouncedHatId && !isNaN(Number(debouncedHatId)) && Number(debouncedHatId) > 0) {
      validateHatId(debouncedHatId)
    } else if (debouncedHatId) {
      setValidationError('Hat ID must be a positive number')
      setHatInfo(null)
    } else {
      setValidationError(null)
      setHatInfo(null)
    }
  }, [debouncedHatId])

  // Notify parent when configuration changes
  useEffect(() => {
    if (hatId && hatInfo && !validationError && hatsContract) {
      onConfigChange({
        hatId,
        hatsContract,
        hatInfo
      })
    }
  }, [hatId, hatInfo, validationError, hatsContract, onConfigChange])

  const validateHatId = async (id: string) => {
    setIsValidating(true)
    setValidationError(null)

    try {
      // Note: This is a mock implementation
      // In a real implementation, you would use the Hats SDK:
      // import { HatsSubgraphClient } from '@hatsprotocol/sdk-v1-subgraph'
      // const client = new HatsSubgraphClient()
      // const hat = await client.getHat({ hatId: id })
      
      // Mock validation
      const mockHatInfo: HatInfo = {
        id,
        name: `Hat #${id}`,
        description: 'Governance role in the organization',
        imageUri: 'https://example.com/hat.png',
        isActive: true,
        wearerCount: 5,
        maxSupply: 10,
        tree: {
          id: '1',
          name: 'Organization Tree'
        }
      }
      
      setHatInfo(mockHatInfo)
    } catch (error) {
      setValidationError('Hat ID not found or invalid')
      setHatInfo(null)
    } finally {
      setIsValidating(false)
    }
  }

  const searchHats = async (query: string) => {
    setIsSearching(true)
    try {
      // Note: This is a mock implementation
      // In a real implementation, you would use the Hats SDK:
      // const client = new HatsSubgraphClient()
      // const results = await client.getHats({ name_contains: query })
      
      // Mock search results
      const mockResults: HatInfo[] = [
        {
          id: '12345',
          name: `${query} Admin`,
          description: 'Administrative role',
          isActive: true,
          wearerCount: 3,
          maxSupply: 5,
          tree: { id: '1', name: 'Main Tree' }
        },
        {
          id: '12346',
          name: `${query} Member`,
          description: 'General member role',
          isActive: true,
          wearerCount: 15,
          maxSupply: 50,
          tree: { id: '1', name: 'Main Tree' }
        }
      ]
      
      setSearchResults(mockResults)
    } catch (error) {
      console.error('Error searching hats:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleHatSelect = (hat: HatInfo) => {
    setHatId(hat.id)
    setHatInfo(hat)
    setSearchTerm('')
    setSearchResults([])
  }

  const getValidationIcon = () => {
    if (!debouncedHatId) return null
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (hatInfo && !validationError) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (validationError) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <Label className="text-[#3c2a14] text-base font-semibold">Hats Protocol Configuration</Label>
        <p className="text-sm text-[#8b7355] mt-1">
          Configure which hat (role) wearers can access this jar
        </p>
      </div>

      {/* Network Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Hats Contract: {hatsContract ? `${hatsContract.slice(0, 10)}...${hatsContract.slice(-8)}` : 'Not available on this network'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Hat ID Input */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-[#3c2a14]">Hat ID</Label>
          <div className="relative">
            <Input
              placeholder="Enter hat ID (numeric)"
              className="bg-white border-gray-300 text-[#3c2a14] pr-8"
              value={hatId}
              onChange={(e) => setHatId(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {getValidationIcon()}
            </div>
          </div>
          {validationError && (
            <p className="text-xs text-red-600 mt-1">{validationError}</p>
          )}
          {hatInfo && !validationError && (
            <p className="text-xs text-green-600 mt-1">✓ Valid hat found</p>
          )}
          <p className="text-xs text-[#8b7355] mt-1">
            Hat IDs are large numbers that encode the hat's position in the tree structure
          </p>
        </div>

        {/* Hat Search */}
        <div className="border-t pt-4">
          <Label className="text-sm text-[#3c2a14]">Or Search Hats</Label>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b7355]" />
              <Input
                placeholder="Search hats by name or role..."
                className="bg-white border-gray-300 text-[#3c2a14] pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => searchTerm && searchHats(searchTerm)}
              disabled={!searchTerm || isSearching}
              variant="outline"
              className="border-[#ff5e14] text-[#ff5e14]"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-[#3c2a14]">Search Results</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((hat) => (
                <Card 
                  key={hat.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleHatSelect(hat)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-[#ff5e14]" />
                          <h4 className="font-medium text-[#3c2a14]">{hat.name}</h4>
                          <Badge variant={hat.isActive ? "default" : "secondary"}>
                            {hat.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8b7355] mt-1">{hat.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-[#8b7355]">
                            ID: {hat.id}
                          </span>
                          {hat.wearerCount !== undefined && hat.maxSupply && (
                            <span className="text-xs text-[#8b7355]">
                              Wearers: {hat.wearerCount}/{hat.maxSupply}
                            </span>
                          )}
                          {hat.tree?.name && (
                            <span className="text-xs text-[#8b7355]">
                              Tree: {hat.tree.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Selected Hat Display */}
        {hatInfo && (
          <Card className="border-l-4 border-l-[#ff5e14]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#ff5e14]" />
                Selected Hat
                <Badge variant={hatInfo.isActive ? "default" : "secondary"}>
                  {hatInfo.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#8b7355]">Hat Name</Label>
                  <p className="text-sm font-medium text-[#3c2a14]">
                    {hatInfo.name || `Hat #${hatInfo.id}`}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-[#8b7355]">Hat ID</Label>
                  <p className="text-sm font-medium text-[#3c2a14] font-mono">
                    {hatInfo.id}
                  </p>
                </div>
                {hatInfo.wearerCount !== undefined && (
                  <div>
                    <Label className="text-xs text-[#8b7355]">Current Wearers</Label>
                    <p className="text-sm font-medium text-[#3c2a14]">
                      {hatInfo.wearerCount}
                      {hatInfo.maxSupply && ` / ${hatInfo.maxSupply}`}
                    </p>
                  </div>
                )}
                {hatInfo.tree && (
                  <div>
                    <Label className="text-xs text-[#8b7355]">Tree</Label>
                    <p className="text-sm font-medium text-[#3c2a14]">
                      {hatInfo.tree.name || `Tree #${hatInfo.tree.id}`}
                    </p>
                  </div>
                )}
              </div>
              
              {hatInfo.description && (
                <div className="mt-4">
                  <Label className="text-xs text-[#8b7355]">Description</Label>
                  <p className="text-sm text-[#3c2a14] mt-1">
                    {hatInfo.description}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8b7355]">Hats Contract:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-[#3c2a14] bg-gray-100 px-2 py-1 rounded">
                      {hatsContract.slice(0, 10)}...{hatsContract.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`https://etherscan.io/address/${hatsContract}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Resources */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-[#3c2a14] mb-2">Finding Hat IDs</h4>
          <p className="text-xs text-[#8b7355] mb-3">
            Hat IDs are complex numbers that encode the hat's position in the organization tree.
            Use these resources to find the correct ID:
          </p>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => window.open('https://app.hatsprotocol.xyz/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Hats Protocol App (browse organizations)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => window.open('https://subgraph.hatsprotocol.xyz/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Hats Subgraph Explorer
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-[#3c2a14] mb-2">How Hats Protocol Gating Works</h4>
          <ul className="text-xs text-[#8b7355] space-y-1 list-disc list-inside">
            <li>Only wearers of the specified hat (role) can access the jar</li>
            <li>Hats represent roles and responsibilities in an organization</li>
            <li>Hat wearers are checked in real-time for eligibility and good standing</li>
            <li>Access can be revoked by removing the hat from a user</li>
            <li>Hats form hierarchical trees representing organizational structure</li>
          </ul>
          
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-[#8b7355] font-medium">Integration:</p>
            <p className="text-xs text-[#8b7355]">
              The contract verifies eligibility by calling isWearerOfHat() on the Hats Protocol contract,
              which checks both hat ownership and the wearer's good standing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
