import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Award, Search, ExternalLink } from 'lucide-react'
import { isAddress } from 'viem'

// Hypercerts SDK integration
interface HypercertInfo {
  contract: string
  tokenId: string
  metadata?: {
    name?: string
    description?: string
    image?: string
    external_url?: string
  }
  totalSupply?: string
  creator?: string
}

interface HypercertGateConfigProps {
  onConfigChange: (config: { 
    tokenContract: string
    tokenId: string
    minBalance: string
    hypercertInfo?: HypercertInfo 
  }) => void
  initialConfig?: { 
    tokenContract: string
    tokenId: string
    minBalance: string
    hypercertInfo?: HypercertInfo 
  }
  className?: string
}

export const HypercertGateConfig: React.FC<HypercertGateConfigProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const [tokenContract, setTokenContract] = useState(initialConfig?.tokenContract || '')
  const [tokenId, setTokenId] = useState(initialConfig?.tokenId || '')
  const [minBalance, setMinBalance] = useState(initialConfig?.minBalance || '1')
  const [hypercertInfo, setHypercertInfo] = useState<HypercertInfo | null>(initialConfig?.hypercertInfo || null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<HypercertInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Validate inputs when they change
  useEffect(() => {
    if (tokenContract && tokenId && isAddress(tokenContract) && !isNaN(Number(tokenId))) {
      validateHypercert(tokenContract, tokenId)
    } else if (tokenContract || tokenId) {
      if (tokenContract && !isAddress(tokenContract)) {
        setValidationError('Invalid contract address format')
      } else if (tokenId && isNaN(Number(tokenId))) {
        setValidationError('Token ID must be a number')
      } else {
        setValidationError(null)
      }
      setHypercertInfo(null)
    } else {
      setValidationError(null)
      setHypercertInfo(null)
    }
  }, [tokenContract, tokenId])

  // Notify parent when configuration changes
  useEffect(() => {
    if (tokenContract && tokenId && minBalance && hypercertInfo && !validationError) {
      onConfigChange({
        tokenContract,
        tokenId,
        minBalance,
        hypercertInfo
      })
    }
  }, [tokenContract, tokenId, minBalance, hypercertInfo, validationError, onConfigChange])

  const validateHypercert = async (contract: string, id: string) => {
    setIsValidating(true)
    setValidationError(null)

    try {
      // Note: This is a mock implementation
      // In a real implementation, you would use the Hypercerts SDK:
      // import { HypercertsSDK } from '@hypercerts-org/sdk'
      // const sdk = new HypercertsSDK()
      // const hypercert = await sdk.getHypercert(contract, id)
      
      // Mock validation
      const mockHypercertInfo: HypercertInfo = {
        contract,
        tokenId: id,
        metadata: {
          name: `Climate Action Certificate #${id}`,
          description: 'Impact certificate for verified climate action',
          image: 'https://example.com/hypercert.png',
          external_url: 'https://hypercerts.org'
        },
        totalSupply: '1000000',
        creator: '0x1234567890123456789012345678901234567890'
      }
      
      setHypercertInfo(mockHypercertInfo)
    } catch (error) {
      setValidationError('Invalid hypercert or contract not found')
      setHypercertInfo(null)
    } finally {
      setIsValidating(false)
    }
  }

  const searchHypercerts = async (query: string) => {
    setIsSearching(true)
    try {
      // Note: This is a mock implementation
      // In a real implementation, you would use the Hypercerts SDK:
      // const sdk = new HypercertsSDK()
      // const results = await sdk.searchHypercerts({ name: query })
      
      // Mock search results
      const mockResults: HypercertInfo[] = [
        {
          contract: '0x1234567890123456789012345678901234567890',
          tokenId: '1',
          metadata: {
            name: `${query} Impact Certificate`,
            description: 'Verified impact in climate action',
            image: 'https://example.com/cert1.png'
          },
          totalSupply: '1000000'
        },
        {
          contract: '0x1234567890123456789012345678901234567890',
          tokenId: '2',
          metadata: {
            name: `${query} Conservation Project`,
            description: 'Forest conservation impact certificate',
            image: 'https://example.com/cert2.png'
          },
          totalSupply: '500000'
        }
      ]
      
      setSearchResults(mockResults)
    } catch (error) {
      console.error('Error searching hypercerts:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleHypercertSelect = (hypercert: HypercertInfo) => {
    setTokenContract(hypercert.contract)
    setTokenId(hypercert.tokenId)
    setHypercertInfo(hypercert)
    setSearchTerm('')
    setSearchResults([])
  }

  const getValidationIcon = () => {
    if (!tokenContract || !tokenId) return null
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (hypercertInfo && !validationError) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (validationError) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <Label className="text-[#3c2a14] text-base font-semibold">Hypercert Configuration</Label>
        <p className="text-sm text-[#8b7355] mt-1">
          Configure which hypercert (impact certificate) holders can access this jar
        </p>
      </div>

      {/* Manual Input */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-[#3c2a14]">Contract Address</Label>
            <Input
              placeholder="0x... (Hypercert contract)"
              className="bg-white border-gray-300 text-[#3c2a14]"
              value={tokenContract}
              onChange={(e) => setTokenContract(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm text-[#3c2a14]">Token ID</Label>
            <div className="relative">
              <Input
                placeholder="Token ID"
                className="bg-white border-gray-300 text-[#3c2a14] pr-8"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm text-[#3c2a14]">Minimum Balance Required</Label>
          <Input
            type="number"
            min="1"
            placeholder="1"
            className="bg-white border-gray-300 text-[#3c2a14] w-32"
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value)}
          />
          <p className="text-xs text-[#8b7355] mt-1">
            Minimum number of hypercert units required (default: 1)
          </p>
        </div>

        {validationError && (
          <p className="text-xs text-red-600">{validationError}</p>
        )}

        {/* Search Interface */}
        <div className="border-t pt-4">
          <Label className="text-sm text-[#3c2a14]">Or Search Hypercerts</Label>
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b7355]" />
              <Input
                placeholder="Search hypercerts by name or project..."
                className="bg-white border-gray-300 text-[#3c2a14] pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => searchTerm && searchHypercerts(searchTerm)}
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
              {searchResults.map((cert) => (
                <Card 
                  key={`${cert.contract}-${cert.tokenId}`}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleHypercertSelect(cert)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[#3c2a14]">{cert.metadata?.name}</h4>
                          <Badge variant="outline">ID: {cert.tokenId}</Badge>
                        </div>
                        <p className="text-sm text-[#8b7355] mt-1">{cert.metadata?.description}</p>
                        {cert.totalSupply && (
                          <p className="text-xs text-[#8b7355] mt-1">
                            Total Supply: {Number(cert.totalSupply).toLocaleString()} units
                          </p>
                        )}
                      </div>
                      {cert.metadata?.image && (
                        <img
                          src={cert.metadata.image}
                          alt={cert.metadata.name}
                          className="w-12 h-12 rounded-lg object-cover ml-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Selected Hypercert Display */}
        {hypercertInfo && (
          <Card className="border-l-4 border-l-[#ff5e14]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-[#ff5e14]" />
                Selected Hypercert
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#8b7355]">Certificate Name</Label>
                  <p className="text-sm font-medium text-[#3c2a14]">
                    {hypercertInfo.metadata?.name || `Hypercert #${hypercertInfo.tokenId}`}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-[#8b7355]">Token ID</Label>
                  <p className="text-sm font-medium text-[#3c2a14]">
                    {hypercertInfo.tokenId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-[#8b7355]">Required Balance</Label>
                  <p className="text-sm font-medium text-[#3c2a14]">
                    {minBalance} unit{Number(minBalance) !== 1 ? 's' : ''}
                  </p>
                </div>
                {hypercertInfo.totalSupply && (
                  <div>
                    <Label className="text-xs text-[#8b7355]">Total Supply</Label>
                    <p className="text-sm font-medium text-[#3c2a14]">
                      {Number(hypercertInfo.totalSupply).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              
              {hypercertInfo.metadata?.description && (
                <div className="mt-4">
                  <Label className="text-xs text-[#8b7355]">Description</Label>
                  <p className="text-sm text-[#3c2a14] mt-1">
                    {hypercertInfo.metadata.description}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8b7355]">Contract Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-[#3c2a14] bg-gray-100 px-2 py-1 rounded">
                      {hypercertInfo.contract.slice(0, 10)}...{hypercertInfo.contract.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`https://etherscan.io/address/${hypercertInfo.contract}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-[#3c2a14] mb-2">How Hypercert Gating Works</h4>
          <ul className="text-xs text-[#8b7355] space-y-1 list-disc list-inside">
            <li>Only holders of the specified hypercert can access the jar</li>
            <li>Hypercerts are divisible ERC-1155 tokens representing verified impact</li>
            <li>Users must hold at least the minimum balance to qualify</li>
            <li>Access is based on current balance at withdrawal time</li>
            <li>Hypercerts can be traded, transferring access rights</li>
          </ul>
          
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-[#8b7355] font-medium">Integration:</p>
            <p className="text-xs text-[#8b7355]">
              The contract verifies ownership by calling balanceOf() on the hypercert contract
              and checking that the user's balance meets the minimum requirement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
