import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ImageIcon, 
  Shield, 
  TrendingUp,
  Info,
  ExternalLink,
  Trash2,
  Settings
} from 'lucide-react'
import { useNftValidation } from '@/hooks/useNftValidation'
import { AlchemyNFTProvider, type EnhancedNFT } from '@/lib/nft-providers/AlchemyProvider'
import { getAlchemyApiKey } from '@/lib/nft-providers/config'
import { useQuery } from '@tanstack/react-query'
import { isAddress } from 'viem'

// Input validation constants
const VALIDATION_CONSTANTS = {
  MAX_ADDRESS_LENGTH: 42,
  MIN_ADDRESS_LENGTH: 42,
  MAX_COLLECTION_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_IMAGE_URL_LENGTH: 500,
  MAX_QUANTITY: 1000000, // 1M max quantity
  MIN_QUANTITY: 1,
  MAX_GATES_PER_JAR: 20,
  DEBOUNCE_DELAY: 500,
  MAX_API_CALLS_PER_MINUTE: 30,
  MALICIOUS_PATTERNS: [
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<script/i,
    /eval\(/i,
    /expression\(/i
  ]
} as const

// Input sanitization utilities
const sanitizeInput = {
  address: (input: string): string => {
    return input
      .trim()
      .toLowerCase()
      .slice(0, VALIDATION_CONSTANTS.MAX_ADDRESS_LENGTH)
  },
  
  string: (input: string | undefined, maxLength: number): string => {
    if (!input) return ''
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
  },
  
  url: (input: string | undefined): string => {
    if (!input) return ''
    
    // Check for malicious patterns
    for (const pattern of VALIDATION_CONSTANTS.MALICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        console.warn('Malicious URL pattern detected, sanitizing:', input)
        return ''
      }
    }
    
    return input.slice(0, VALIDATION_CONSTANTS.MAX_IMAGE_URL_LENGTH)
  },
  
  quantity: (input: number): number => {
    const num = Math.floor(Math.abs(input))
    return Math.min(Math.max(num, VALIDATION_CONSTANTS.MIN_QUANTITY), VALIDATION_CONSTANTS.MAX_QUANTITY)
  }
}

// Rate limiting hook
const useRateLimit = (maxCalls: number, windowMs: number) => {
  const callsRef = useRef<number[]>([])
  
  const isAllowed = useCallback(() => {
    const now = Date.now()
    const cutoff = now - windowMs
    
    // Remove old calls outside the window
    callsRef.current = callsRef.current.filter(time => time > cutoff)
    
    // Check if we're under the limit
    if (callsRef.current.length < maxCalls) {
      callsRef.current.push(now)
      return true
    }
    
    return false
  }, [maxCalls, windowMs])
  
  return { isAllowed }
}

enum NFTType {
  None = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

export interface EnhancedNFTGate {
  address: string
  type: NFTType
  name?: string
  symbol?: string
  image?: string
  verified?: boolean
  floorPrice?: number
  totalSupply?: number
  // Quantity-based gating (ERC1155)
  minQuantity?: number
  maxQuantity?: number
  enableQuantityGating?: boolean
  // Analytics
  enableAnalytics?: boolean
  // Trait-based requirements (future)
  requiredTraits?: Array<{
    trait_type: string
    value: string | number
    operator?: 'equals' | 'greater_than' | 'less_than' | 'contains'
  }>
  enableTraitGating?: boolean
}

interface EnhancedNFTGateInputProps {
  onAddNFT: (gate: EnhancedNFTGate) => void
  existingGates?: EnhancedNFTGate[]
  className?: string
}

interface CollectionPreview {
  name?: string
  symbol?: string
  description?: string
  image?: string
  verified?: boolean
  floorPrice?: number
  totalSupply?: number
  contractType?: 'ERC721' | 'ERC1155'
  isActive?: boolean
  externalUrl?: string
  warnings?: string[]
}

const NFTCard: React.FC<{ 
  preview: CollectionPreview
  type: 'ERC721' | 'ERC1155' 
}> = ({ preview, type }) => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {preview.image ? (
            <img 
              src={preview.image} 
              alt={preview.name}
              className="w-8 h-8 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <div>
            <CardTitle className="text-sm">{preview.name || 'Unknown Collection'}</CardTitle>
            {preview.symbol && (
              <p className="text-xs text-gray-500">{preview.symbol}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Badge variant={type === 'ERC721' ? 'default' : 'secondary'} className="text-xs">
            {type}
          </Badge>
          {preview.verified && (
            <span title="Verified Collection">
              <Shield className="h-3 w-3 text-green-500" />
            </span>
          )}
        </div>
      </div>
    </CardHeader>
    
    <CardContent className="pt-0">
      <div className="space-y-2">
        {preview.description && (
          <p className="text-xs text-gray-600 line-clamp-2">{preview.description}</p>
        )}
        
        <div className="flex justify-between items-center text-xs">
          {preview.floorPrice && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{preview.floorPrice} ETH</span>
            </div>
          )}
          
          {preview.totalSupply && (
            <div className="text-gray-500">
              Supply: {preview.totalSupply.toLocaleString()}
            </div>
          )}
        </div>
        
        {preview.externalUrl && (
          <a 
            href={preview.externalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3" />
            View Collection
          </a>
        )}
      </div>
    </CardContent>
  </Card>
)

export const EnhancedNFTGateInput: React.FC<EnhancedNFTGateInputProps> = ({ 
  onAddNFT, 
  existingGates = [],
  className = '' 
}) => {
  const [nftAddress, setNftAddress] = useState('')
  const [selectedType, setSelectedType] = useState<NFTType>(NFTType.ERC721)
  const [debouncedAddress, setDebouncedAddress] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [inputErrors, setInputErrors] = useState<string[]>([])
  
  // Advanced configuration state
  const [enableQuantityGating, setEnableQuantityGating] = useState(false)
  const [minQuantity, setMinQuantity] = useState(1)
  const [maxQuantity, setMaxQuantity] = useState(10)
  const [enableAnalytics, setEnableAnalytics] = useState(true)
  const [enableTraitGating, setEnableTraitGating] = useState(false)

  // Rate limiting for API calls
  const { isAllowed: canMakeApiCall } = useRateLimit(
    VALIDATION_CONSTANTS.MAX_API_CALLS_PER_MINUTE,
    60 * 1000 // 1 minute window
  )
  
  // Enhanced input validation
  const validateInputs = useCallback(() => {
    const errors: string[] = []
    
    // Address validation
    if (nftAddress) {
      const sanitizedAddress = sanitizeInput.address(nftAddress)
      if (sanitizedAddress.length < VALIDATION_CONSTANTS.MIN_ADDRESS_LENGTH) {
        errors.push('Address must be 42 characters long')
      }
      if (!isAddress(sanitizedAddress)) {
        errors.push('Invalid Ethereum address format')
      }
      // Check for common mistake patterns
      if (nftAddress.includes(' ')) {
        errors.push('Address cannot contain spaces')
      }
      if (nftAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
        errors.push('Cannot use zero address')
      }
    }
    
    // Quantity validation
    if (enableQuantityGating) {
      if (minQuantity < VALIDATION_CONSTANTS.MIN_QUANTITY) {
        errors.push(`Minimum quantity must be at least ${VALIDATION_CONSTANTS.MIN_QUANTITY}`)
      }
      if (maxQuantity > VALIDATION_CONSTANTS.MAX_QUANTITY) {
        errors.push(`Maximum quantity cannot exceed ${VALIDATION_CONSTANTS.MAX_QUANTITY}`)
      }
      if (minQuantity >= maxQuantity) {
        errors.push('Minimum quantity must be less than maximum quantity')
      }
    }
    
    // Check for too many gates
    if (existingGates.length >= VALIDATION_CONSTANTS.MAX_GATES_PER_JAR) {
      errors.push(`Cannot add more than ${VALIDATION_CONSTANTS.MAX_GATES_PER_JAR} NFT gates per jar`)
    }
    
    setInputErrors(errors)
    return errors.length === 0
  }, [nftAddress, enableQuantityGating, minQuantity, maxQuantity, existingGates.length])
  
  // Enhanced debounced address with validation and sanitization
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nftAddress.trim()) {
        const sanitized = sanitizeInput.address(nftAddress)
        if (validateInputs()) {
          setDebouncedAddress(sanitized)
        } else {
          setDebouncedAddress('')
        }
      } else {
        setDebouncedAddress('')
        setInputErrors([])
      }
    }, VALIDATION_CONSTANTS.DEBOUNCE_DELAY)
    return () => clearTimeout(timer)
  }, [nftAddress, validateInputs])

  // Enhanced validation with rate limiting
  const { isValid, detectedType, isLoading, error } = useNftValidation(
    canMakeApiCall() ? debouncedAddress : ''
  )

  // Enhanced collection preview fetching with error boundaries
  const { data: collectionPreview, isLoading: isLoadingPreview, error: previewError } = useQuery({
    queryKey: ['nft-collection-preview', debouncedAddress, canMakeApiCall],
    queryFn: async (): Promise<CollectionPreview | null> => {
      if (!debouncedAddress || !isAddress(debouncedAddress) || !canMakeApiCall()) return null
      
      try {
        const apiKey = getAlchemyApiKey('mainnet')
        if (!apiKey) {
          console.warn('No Alchemy API key available for NFT validation')
          return null
        }
        
        const provider = new AlchemyNFTProvider(apiKey)
        
        // Enhanced validation with malicious contract detection
        const validation = await provider.validateContract(debouncedAddress)
        
        if (!validation.isValid) {
          if (validation.isMalicious) {
            console.warn('Potentially malicious contract detected:', debouncedAddress)
          }
          return null
        }
        
        // Safe metadata fetching with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000) // 10s timeout
        })
        
        const metadata = await Promise.race([
          provider.getNFTMetadata(debouncedAddress, '1'),
          timeoutPromise
        ])
        
        // Sanitize all returned data
        return {
          name: sanitizeInput.string(metadata.collection || metadata.name, VALIDATION_CONSTANTS.MAX_COLLECTION_NAME_LENGTH),
          description: sanitizeInput.string(metadata.description, VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH),
          image: sanitizeInput.url(metadata.image),
          contractType: metadata.tokenType,
          verified: !validation.isMalicious && (validation.warnings?.length ?? 0) === 0,
          isActive: true,
          warnings: validation.warnings
        }
      } catch (error) {
        console.error('Failed to fetch collection preview:', error)
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait before trying again.')
        }
        
        return null
      }
    },
    enabled: !!(debouncedAddress && isAddress(debouncedAddress) && isValid && canMakeApiCall()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry rate limit errors
      if (error instanceof Error && error.message.includes('rate limit')) {
        return false
      }
      return failureCount < 2 // Only retry twice
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000) // Exponential backoff
  })

  // Check if user-selected type matches detected type
  const typeMatches = !detectedType || (
    (detectedType === 'ERC721' && selectedType === NFTType.ERC721) ||
    (detectedType === 'ERC1155' && selectedType === NFTType.ERC1155)
  )

  // Check for duplicates
  const isDuplicate = existingGates.some(gate => 
    gate.address.toLowerCase() === nftAddress.toLowerCase()
  )

  const canAdd = nftAddress && isValid && typeMatches && !isLoading && !isDuplicate

  // Auto-populate type if detected type is different
  useEffect(() => {
    if (detectedType && !typeMatches) {
      const newType = detectedType === 'ERC721' ? NFTType.ERC721 : NFTType.ERC1155
      setSelectedType(newType)
    }
  }, [detectedType, typeMatches])

  // Reset quantity gating when type changes to ERC721
  useEffect(() => {
    if (selectedType === NFTType.ERC721) {
      setEnableQuantityGating(false)
    }
  }, [selectedType])

  const handleAddNFT = useCallback(() => {
    // Final validation check before adding
    if (!canAdd || !validateInputs() || inputErrors.length > 0) {
      console.warn('Cannot add NFT gate: validation failed', { inputErrors, canAdd })
      return
    }

    // Sanitize all inputs before creating the gate
    const sanitizedAddress = sanitizeInput.address(nftAddress)
    const sanitizedMinQuantity = sanitizeInput.quantity(minQuantity)
    const sanitizedMaxQuantity = sanitizeInput.quantity(maxQuantity)
    
    const gate: EnhancedNFTGate = {
      address: sanitizedAddress,
      type: selectedType,
      name: sanitizeInput.string(collectionPreview?.name, VALIDATION_CONSTANTS.MAX_COLLECTION_NAME_LENGTH),
      image: sanitizeInput.url(collectionPreview?.image),
      verified: collectionPreview?.verified && !collectionPreview?.warnings?.length,
      floorPrice: collectionPreview?.floorPrice ? sanitizeInput.quantity(collectionPreview.floorPrice) : undefined,
      totalSupply: collectionPreview?.totalSupply,
      enableAnalytics,
    }

    // Add quantity-based gating for ERC1155 with enhanced validation
    if (selectedType === NFTType.ERC1155 && enableQuantityGating) {
      if (sanitizedMinQuantity < sanitizedMaxQuantity) {
        gate.enableQuantityGating = true
        gate.minQuantity = sanitizedMinQuantity
        gate.maxQuantity = sanitizedMaxQuantity
      } else {
        console.warn('Invalid quantity range, skipping quantity gating')
      }
    }

    // Add trait-based requirements (placeholder for future implementation)
    if (enableTraitGating) {
      gate.enableTraitGating = true
      gate.requiredTraits = [] // Will be populated when trait gating is implemented
    }

    // Log for security monitoring
    console.info('Adding NFT gate:', {
      address: sanitizedAddress,
      type: selectedType === NFTType.ERC721 ? 'ERC721' : 'ERC1155',
      hasQuantityGating: gate.enableQuantityGating,
      hasTraitGating: gate.enableTraitGating,
      verified: gate.verified
    })

    onAddNFT(gate)
    
    // Reset form with cleaned state
    setNftAddress('')
    setSelectedType(NFTType.ERC721)
    setShowAdvanced(false)
    setEnableQuantityGating(false)
    setMinQuantity(1)
    setMaxQuantity(10)
    setEnableTraitGating(false)
    setEnableAnalytics(true)
    setInputErrors([])
  }, [canAdd, validateInputs, inputErrors, nftAddress, selectedType, collectionPreview, enableAnalytics, enableQuantityGating, minQuantity, maxQuantity, enableTraitGating, onAddNFT])

  const getValidationIcon = () => {
    if (!debouncedAddress) return null
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (isDuplicate) return <AlertCircle className="h-4 w-4 text-orange-500" />
    if (isValid && typeMatches) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (error || !typeMatches) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  const getValidationMessage = () => {
    // Show input validation errors first
    if (inputErrors.length > 0) {
      return inputErrors.join(', ')
    }
    
    // Show rate limit warning
    if (!canMakeApiCall()) {
      return 'Rate limit reached. Please wait before trying again.'
    }
    
    if (!debouncedAddress) return null
    if (isLoading) return 'Validating contract...'
    if (isDuplicate) return 'This NFT contract is already added'
    if (error) return error
    if (previewError) {
      const errorMsg = previewError instanceof Error ? previewError.message : 'Failed to load preview'
      return `Preview error: ${errorMsg}`
    }
    if (isValid && !typeMatches) {
      return `Contract is ${detectedType} but type is set to ${selectedType === NFTType.ERC721 ? 'ERC721' : 'ERC1155'}`
    }
    if (isValid && typeMatches) {
      const warnings = collectionPreview?.warnings
      const warningText = warnings?.length ? ` (⚠️ ${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''
      return `✓ Valid ${detectedType} contract${collectionPreview?.verified ? ' (verified)' : ''}${warningText}`
    }
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[#3c2a14] text-base font-semibold">
            Enhanced NFT Gate Configuration
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-[#ff5e14]"
          >
            <Settings className="h-4 w-4 mr-1" />
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </Button>
        </div>

        {/* NFT Address Input */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <Label className="text-sm text-[#3c2a14]">NFT Contract Address</Label>
            <div className="relative">
              <Input
                placeholder="0x... (paste NFT contract address)"
                className="bg-white border-gray-300 placeholder:text-[#8b7355] text-[#3c2a14] pr-8"
                value={nftAddress}
                onChange={(e) => {
                  const input = e.target.value.trim()
                  // Basic sanitization on input - full sanitization happens on debounce
                  const sanitized = input.slice(0, VALIDATION_CONSTANTS.MAX_ADDRESS_LENGTH)
                  setNftAddress(sanitized)
                }}
                maxLength={VALIDATION_CONSTANTS.MAX_ADDRESS_LENGTH}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-3">
            <Label className="text-sm text-[#3c2a14]">NFT Type</Label>
            <Select
              value={selectedType.toString()}
              onValueChange={(value) => setSelectedType(Number(value) as NFTType)}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ERC721</SelectItem>
                <SelectItem value="2">ERC1155</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="md:col-span-3">
            <Label className="text-sm text-[#3c2a14] opacity-0">Add</Label>
            <Button
              type="button"
              onClick={handleAddNFT}
              disabled={!canAdd}
              className="w-full bg-[#ff5e14] hover:bg-[#e5531b] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add NFT Gate
            </Button>
          </div>
        </div>

        {/* Validation Message */}
        {debouncedAddress && (
          <div className={`text-xs px-3 py-2 rounded ${
            isValid && typeMatches && !isDuplicate
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : (error || !typeMatches || isDuplicate)
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            <div className="flex items-center gap-1">
              {getValidationIcon()}
              {getValidationMessage()}
            </div>
          </div>
        )}

        {/* Collection Preview */}
        {collectionPreview && isValid && typeMatches && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-[#3c2a14]">Collection Preview</span>
            </div>
            <NFTCard preview={collectionPreview} type={detectedType || 'ERC721'} />
          </div>
        )}

        {/* Advanced Configuration */}
        {showAdvanced && (
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Advanced Gate Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quantity-based Gating (ERC1155 only) */}
              {selectedType === NFTType.ERC1155 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableQuantity"
                      checked={enableQuantityGating}
                      onCheckedChange={(checked) => setEnableQuantityGating(checked === true)}
                    />
                    <Label htmlFor="enableQuantity" className="text-sm font-medium">
                      Enable Quantity-Based Gating
                    </Label>
                  </div>
                  
                  {enableQuantityGating && (
                    <div className="ml-6 space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <Label className="text-sm">Minimum Quantity Required</Label>
                        <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[minQuantity]}
                          onValueChange={(value) => setMinQuantity(sanitizeInput.quantity(value[0]))}
                          max={Math.min(100, VALIDATION_CONSTANTS.MAX_QUANTITY)}
                          min={VALIDATION_CONSTANTS.MIN_QUANTITY}
                          step={1}
                          className="flex-1"
                        />
                          <span className="text-sm font-mono w-12">{minQuantity}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Maximum Quantity (Optional)</Label>
                        <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[maxQuantity]}
                          onValueChange={(value) => setMaxQuantity(sanitizeInput.quantity(value[0]))}
                          max={Math.min(1000, VALIDATION_CONSTANTS.MAX_QUANTITY)}
                          min={minQuantity + 1}
                          step={1}
                          className="flex-1"
                        />
                          <span className="text-sm font-mono w-12">{maxQuantity}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Users must own between {minQuantity} and {maxQuantity} tokens
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Trait-Based Gating (Future Feature) */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableTraits"
                    checked={enableTraitGating}
                    onCheckedChange={(checked) => setEnableTraitGating(checked === true)}
                    disabled={true}
                  />
                  <Label htmlFor="enableTraits" className="text-sm font-medium text-gray-400">
                    Enable Trait-Based Requirements
                    <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                  </Label>
                </div>
                
                {enableTraitGating && (
                  <div className="ml-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      🚧 Trait-based gating will allow you to require specific NFT traits (e.g., rare attributes, specific backgrounds, etc.)
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Analytics */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableAnalytics"
                  checked={enableAnalytics}
                  onCheckedChange={(checked) => setEnableAnalytics(checked === true)}
                />
                <Label htmlFor="enableAnalytics" className="text-sm">
                  Enable withdrawal analytics for this gate
                </Label>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading state for preview */}
      {isLoadingPreview && debouncedAddress && (
        <div className="flex items-center justify-center p-4 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading collection preview...
        </div>
      )}
    </div>
  )
}

/**
 * Display component for configured NFT gates
 */
export const EnhancedNFTGatesList: React.FC<{
  gates: EnhancedNFTGate[]
  onRemove: (index: number) => void
  className?: string
}> = ({ gates, onRemove, className = '' }) => {
  if (gates.length === 0) return null

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-[#3c2a14] text-base font-semibold">
        Configured NFT Gates ({gates.length})
      </Label>
      
      {gates.map((gate, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {gate.image && (
                  <img 
                    src={gate.image} 
                    alt={gate.name}
                    className="w-10 h-10 rounded object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-[#3c2a14] truncate">
                      {gate.name || 'Unknown Collection'}
                    </h4>
                    <Badge variant={gate.type === NFTType.ERC721 ? 'default' : 'secondary'} className="text-xs">
                      {gate.type === NFTType.ERC721 ? 'ERC721' : 'ERC1155'}
                    </Badge>
                    {gate.verified && <Shield className="h-3 w-3 text-green-500" />}
                  </div>
                  
                  <p className="text-xs text-gray-500 truncate mb-2">{gate.address}</p>
                  
                  <div className="flex items-center gap-4 text-xs">
                    {gate.enableQuantityGating && gate.minQuantity && (
                      <span className="text-blue-600">
                        Qty: {gate.minQuantity}{gate.maxQuantity ? `-${gate.maxQuantity}` : '+'}
                      </span>
                    )}
                    {gate.enableTraitGating && (
                      <span className="text-purple-600">Trait Gating</span>
                    )}
                    {gate.enableAnalytics && (
                      <span className="text-green-600">Analytics</span>
                    )}
                    {gate.floorPrice && (
                      <span className="text-gray-600">Floor: {gate.floorPrice} ETH</span>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
