import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { isAddress } from 'viem'

// EIP-165 interface IDs
const ERC721_INTERFACE_ID = '0x80ac58cd'
const ERC1155_INTERFACE_ID = '0xd9b67a26'
const ERC165_INTERFACE_ID = '0x01ffc9a7'

// ERC165 supportsInterface ABI
const ERC165_ABI = [
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export type NFTValidationResult = {
  isValid: boolean
  detectedType: 'ERC721' | 'ERC1155' | null
  isLoading: boolean
  error: string | null
  isMalicious?: boolean
  isActive?: boolean
  gasUsed?: number
  warnings?: string[]
}

export function useNftValidation(nftAddress: string): NFTValidationResult {
  const [result, setResult] = useState<NFTValidationResult>({
    isValid: false,
    detectedType: null,
    isLoading: false,
    error: null
  })

  // Check if address is valid
  const isValidAddress = nftAddress && isAddress(nftAddress)

  // Check for ERC165 support first
  const { 
    data: supportsERC165,
    isLoading: isLoadingERC165,
    error: errorERC165 
  } = useReadContract({
    address: isValidAddress ? nftAddress as `0x${string}` : undefined,
    abi: ERC165_ABI,
    functionName: 'supportsInterface',
    args: [ERC165_INTERFACE_ID],
    query: {
      enabled: !!isValidAddress
    }
  })

  // Check for ERC721 support
  const { 
    data: supportsERC721,
    isLoading: isLoadingERC721,
    error: errorERC721 
  } = useReadContract({
    address: isValidAddress ? nftAddress as `0x${string}` : undefined,
    abi: ERC165_ABI,
    functionName: 'supportsInterface',
    args: [ERC721_INTERFACE_ID],
    query: {
      enabled: !!(isValidAddress && supportsERC165 === true)
    }
  })

  // Check for ERC1155 support
  const { 
    data: supportsERC1155,
    isLoading: isLoadingERC1155,
    error: errorERC1155 
  } = useReadContract({
    address: isValidAddress ? nftAddress as `0x${string}` : undefined,
    abi: ERC165_ABI,
    functionName: 'supportsInterface',
    args: [ERC1155_INTERFACE_ID],
    query: {
      enabled: !!(isValidAddress && supportsERC165 === true)
    }
  })

  useEffect(() => {
    if (!isValidAddress) {
      setResult({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: nftAddress ? 'Invalid contract address format' : null,
        warnings: []
      })
      return
    }

    const isLoading = isLoadingERC165 || isLoadingERC721 || isLoadingERC1155
    const error = errorERC165 || errorERC721 || errorERC1155

    if (error) {
      // Enhanced error handling with malicious contract detection
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const warnings: string[] = []
      let isMalicious = false
      
      // Detect potential malicious behaviors
      if (errorMessage.includes('execution reverted') || errorMessage.includes('out of gas')) {
        isMalicious = true
        warnings.push('Contract may consume excessive gas or revert unexpectedly')
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        warnings.push('Network issues detected - retry validation')
      }
      
      setResult({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: 'Failed to validate contract. Not a valid NFT contract or network error.',
        isMalicious,
        warnings
      })
      return
    }

    if (isLoading) {
      setResult(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }))
      return
    }

    // If ERC165 is not supported, it's not a valid ERC NFT
    if (supportsERC165 === false) {
      setResult({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: 'Contract does not support ERC165 interface detection',
        warnings: ['Contract may not be a standard NFT implementation']
      })
      return
    }

    // Determine the NFT type with enhanced validation
    let detectedType: 'ERC721' | 'ERC1155' | null = null
    let isValid = false
    const warnings: string[] = []

    if (supportsERC721 === true) {
      detectedType = 'ERC721'
      isValid = true
    } else if (supportsERC1155 === true) {
      detectedType = 'ERC1155'
      isValid = true
    }

    // Additional safety checks
    if (isValid) {
      // Check for known malicious patterns (this would be expanded with real data)
      const suspiciousPatterns = [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dead'
      ]
      
      if (suspiciousPatterns.some(pattern => 
        nftAddress.toLowerCase().includes(pattern.toLowerCase())
      )) {
        warnings.push('Contract address appears suspicious')
      }
      
      // In a real implementation, you'd check against known malicious contract databases
      // or use services like Forta, OpenSea's security API, etc.
    }

    setResult({
      isValid,
      detectedType,
      isLoading: false,
      error: isValid ? null : 'Contract does not support ERC721 or ERC1155 interfaces',
      isMalicious: false, // Would be determined by actual security checks
      isActive: isValid, // Assume active if valid (would check recent activity in real impl)
      warnings
    })

  }, [
    nftAddress,
    isValidAddress,
    supportsERC165,
    supportsERC721,
    supportsERC1155,
    isLoadingERC165,
    isLoadingERC721,
    isLoadingERC1155,
    errorERC165,
    errorERC721,
    errorERC1155
  ])

  return result
}
