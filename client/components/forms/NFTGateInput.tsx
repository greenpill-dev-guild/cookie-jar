import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useNftValidation } from '@/hooks/useNftValidation'

enum NFTType {
  None = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

interface NFTGateInputProps {
  onAddNFT: (address: string, type: number) => void
  className?: string
}

export const NFTGateInput: React.FC<NFTGateInputProps> = ({ onAddNFT, className = '' }) => {
  const [nftAddress, setNftAddress] = useState('')
  const [selectedType, setSelectedType] = useState<number>(NFTType.ERC721)
  const [debouncedAddress, setDebouncedAddress] = useState('')
  
  // Debounce the address input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(nftAddress)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [nftAddress])

  // Use the NFT validation hook
  const { isValid, detectedType, isLoading, error } = useNftValidation(debouncedAddress)

  // Check if user-selected type matches detected type
  const typeMatches = !detectedType || (
    (detectedType === 'ERC721' && selectedType === NFTType.ERC721) ||
    (detectedType === 'ERC1155' && selectedType === NFTType.ERC1155)
  )

  const canAdd = nftAddress && isValid && typeMatches && !isLoading

  const handleAddNFT = () => {
    if (canAdd) {
      onAddNFT(nftAddress, selectedType)
      setNftAddress('')
      setSelectedType(NFTType.ERC721)
    }
  }

  const getValidationIcon = () => {
    if (!debouncedAddress) return null
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (isValid && typeMatches) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (error || !typeMatches) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  const getValidationMessage = () => {
    if (!debouncedAddress) return null
    if (isLoading) return 'Validating contract...'
    if (error) return error
    if (isValid && !typeMatches) {
      return `Contract is ${detectedType} but type is set to ${selectedType === NFTType.ERC721 ? 'ERC721' : 'ERC1155'}`
    }
    if (isValid && typeMatches) {
      return `✓ Valid ${detectedType} contract`
    }
    return null
  }

  // Auto-populate type if detected type is different from selected
  useEffect(() => {
    if (detectedType && !typeMatches) {
      const newType = detectedType === 'ERC721' ? NFTType.ERC721 : NFTType.ERC1155
      setSelectedType(newType)
    }
  }, [detectedType, typeMatches])

  return (
    <div className={`space-y-4 ${className}`}>
      <Label className="text-[#3c2a14] text-base">NFT Addresses & Types</Label>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-sm text-[#3c2a14]">NFT Address</Label>
          <div className="relative">
            <Input
              placeholder="0x..."
              className="bg-white border-gray-300 placeholder:text-[#3c2a14] text-[#3c2a14] pr-8"
              value={nftAddress}
              onChange={(e) => setNftAddress(e.target.value)}
            />
            {/* Validation icon */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {getValidationIcon()}
            </div>
          </div>
          {/* Validation message */}
          {debouncedAddress && (
            <div className={`text-xs mt-1 ${
              isValid && typeMatches 
                ? 'text-green-600' 
                : error || !typeMatches 
                ? 'text-red-600' 
                : 'text-gray-500'
            }`}>
              {getValidationMessage()}
            </div>
          )}
        </div>
        
        <div className="w-32">
          <Label className="text-sm text-[#3c2a14]">NFT Type</Label>
          <Select
            value={selectedType.toString()}
            onValueChange={(value) => setSelectedType(Number(value) as NFTType)}
          >
            <SelectTrigger className="bg-white border-gray-300 placeholder:text-[#3c2a14]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">ERC721</SelectItem>
              <SelectItem value="2">ERC1155</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAddNFT}
          disabled={!canAdd}
          className="border-[#ff5e14] text-[#ff5e14] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
