"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEther, isAddress, decodeEventLog } from "viem"
import { useQueryClient } from "@tanstack/react-query"
import { contractAddresses, isV2Chain } from "@/config/supported-networks"
import { cookieJarFactoryAbi } from "@/generated"
import { cookieJarFactoryV1Abi } from "@/lib/abis/cookie-jar-v1-abi"
import { cookieJarFactoryV2Abi } from "@/lib/abis/cookie-jar-v2-abi"
import { useToast } from "@/hooks/useToast"

// Constants
const ETH_ADDRESS = "0x0000000000000000000000000000000000000003"

export interface ProtocolConfig {
  accessType: 'Allowlist' | 'NFT' | 'POAP' | 'Unlock' | 'Hypercert' | 'Hats'
  nftAddresses?: string[]
  nftTypes?: number[]
  poapEventId?: number
  poapContractAddress?: `0x${string}`
  unlockAddress?: `0x${string}`
  hypercertAddress?: `0x${string}`
  hypercertMinBalance?: number
  hypercertMaxBalance?: number
  hatsId?: number
  hatsAddress?: `0x${string}`
}

// Enums
export enum AccessType {
  Allowlist = 0,
  NFTGated = 1,
  POAP = 2,
  Unlock = 3,
  Hypercert = 4,
  Hats = 5,
}

export enum WithdrawalTypeOptions {
  Fixed = 0,
  Variable = 1,
}

export enum NFTType {
  None = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

export const useJarCreation = () => {
  const router = useRouter()
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // Form state
  const [selectedNetwork, setSelectedNetwork] = useState<string>("baseSepolia")
  const [jarOwnerAddress, setJarOwnerAddress] = useState<`0x${string}`>("0x0000000000000000000000000000000000000000")
  const [supportedCurrency, setSupportedCurrency] = useState<`0x${string}`>(ETH_ADDRESS)
  const [accessType, setAccessType] = useState<AccessType>(AccessType.Allowlist)
  const [withdrawalOption, setWithdrawalOption] = useState<WithdrawalTypeOptions>(WithdrawalTypeOptions.Fixed)
  const [fixedAmount, setFixedAmount] = useState("0")
  const [maxWithdrawal, setMaxWithdrawal] = useState("0")
  const [withdrawalInterval, setWithdrawalInterval] = useState("0")
  const [strictPurpose, setStrictPurpose] = useState(true)
  const [emergencyWithdrawalEnabled, setEmergencyWithdrawalEnabled] = useState(true)
  const [oneTimeWithdrawal, setOneTimeWithdrawal] = useState(false)
  const [metadata, setMetadata] = useState("")
  
  // New metadata fields
  const [jarName, setJarName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [externalLink, setExternalLink] = useState("")
  const [customFee, setCustomFee] = useState("")
  const [enableCustomFee, setEnableCustomFee] = useState(false)
  
  // Currency selection state
  const [showCustomCurrency, setShowCustomCurrency] = useState(false)
  const [customCurrencyAddress, setCustomCurrencyAddress] = useState("")
  
  // NFT management state
  const [nftAddresses, setNftAddresses] = useState<string[]>([])
  const [nftTypes, setNftTypes] = useState<number[]>([])
  
  // Protocol configuration state
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig>({ accessType: 'Allowlist' })
  
  // Form validation state
  const [isFormError, setIsFormError] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  
  // Transaction state
  const [isCreating, setIsCreating] = useState(false)
  const [newJarPreview, setNewJarPreview] = useState<{
    address: string
    name: string
    currency: string
  } | null>(null)
  
  // Contract interaction
  const { writeContract, data: hash, error: createError, isPending } = useWriteContract()
  const { isLoading: isWaitingForTx, isSuccess: txConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })
  
  // Get factory address
  const factoryAddress = contractAddresses.cookieJarFactory[chainId] as `0x${string}` | undefined
  const isV2Contract = isV2Chain(chainId)
  
  // Helper functions
  const parseAmount = (amount: string) => {
    try {
      return parseEther(amount || "0")
    } catch {
      return parseEther("0")
    }
  }
  
  const handleCheckboxChange = (setter: (value: boolean) => void) => (checked: boolean | "indeterminate") => {
    setter(checked === true)
  }
  
  // Validation functions
  const validateStep1 = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!jarName.trim()) {
      errors.push("Jar name is required")
    }
    
    if (jarOwnerAddress && !isAddress(jarOwnerAddress)) {
      errors.push("Jar owner address must be a valid Ethereum address")
    }
    
    if (!isAddress(supportedCurrency)) {
      if (showCustomCurrency && customCurrencyAddress) {
        if (!isAddress(customCurrencyAddress)) {
          errors.push("Custom currency must be a valid contract address")
        }
      } else if (supportedCurrency !== ETH_ADDRESS) {
        errors.push("Valid currency address is required")
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [jarName, jarOwnerAddress, supportedCurrency, showCustomCurrency, customCurrencyAddress])
  
  const validateStep2 = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (withdrawalOption === WithdrawalTypeOptions.Fixed) {
      if (!fixedAmount || parseFloat(fixedAmount) <= 0) {
        errors.push("Fixed withdrawal amount must be greater than 0")
      }
    } else {
      if (!maxWithdrawal || parseFloat(maxWithdrawal) <= 0) {
        errors.push("Maximum withdrawal amount must be greater than 0")
      }
    }
    
    if (!withdrawalInterval || parseInt(withdrawalInterval) <= 0) {
      errors.push("Withdrawal interval must be greater than 0 days")
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [withdrawalOption, fixedAmount, maxWithdrawal, withdrawalInterval])
  
  const validateStep3 = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (accessType === AccessType.NFTGated) {
      if (nftAddresses.length === 0) {
        errors.push("At least one NFT address is required for NFT-gated access")
      }
      
      nftAddresses.forEach((addr, index) => {
        if (!isAddress(addr)) {
          errors.push(`NFT address ${index + 1} is not a valid Ethereum address`)
        }
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [accessType, nftAddresses])
  
  const validateStep4 = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (enableCustomFee) {
      if (!customFee || parseFloat(customFee) < 0 || parseFloat(customFee) > 100) {
        errors.push("Custom fee must be between 0 and 100 percent")
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [enableCustomFee, customFee])
  
  const validateAll = useCallback((): { isValid: boolean; errors: string[] } => {
    const step1 = validateStep1()
    const step2 = validateStep2()
    const step3 = validateStep3()
    const step4 = validateStep4()
    
    const allErrors = [
      ...step1.errors,
      ...step2.errors,
      ...step3.errors,
      ...step4.errors
    ]
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    }
  }, [validateStep1, validateStep2, validateStep3, validateStep4])
  
  // Protocol configuration handler
  const handleProtocolConfigChange = (config: ProtocolConfig) => {
    setProtocolConfig(config)
    switch (config.accessType) {
      case 'Allowlist':
        setAccessType(AccessType.Allowlist)
        break
      case 'NFT':
        setAccessType(AccessType.NFTGated)
        if (config.nftAddresses) {
          setNftAddresses(config.nftAddresses)
        }
        if (config.nftTypes) {
          setNftTypes(config.nftTypes.map(t => t as NFTType))
        }
        break
      case 'POAP':
        setAccessType(AccessType.POAP)
        break
      case 'Unlock':
        setAccessType(AccessType.Unlock)
        break
      case 'Hypercert':
        setAccessType(AccessType.Hypercert)
        break
      case 'Hats':
        setAccessType(AccessType.Hats)
        break
    }
  }
  
  // Handle NFT addition
  const handleAddNFT = (address: string, type: number) => {
    setNftAddresses(prev => [...prev, address])
    setNftTypes(prev => [...prev, type as NFTType])
  }
  
  // Main form submission
  const confirmSubmit = useCallback(() => {
    const { isValid, errors } = validateAll()
    
    if (!isValid) {
      setFormErrors(errors)
      setIsFormError(true)
      return
    }
    
    setFormErrors([])
    setIsFormError(false)
    
    // Only use NFT addresses if access type is TokenGated
    const effectiveNftAddresses = accessType === AccessType.NFTGated ? nftAddresses || [] : []
    const effectiveNftTypes = accessType === AccessType.NFTGated ? nftTypes || [] : []
    
    // Create metadata based on contract version
    const finalMetadata = isV2Contract 
      ? JSON.stringify({
          version: "2.0",
          name: jarName,
          description: metadata,
          image: imageUrl,
          external_url: externalLink
        })
      : (jarName || metadata || "Cookie Jar")
    
    try {
      if (!factoryAddress) {
        throw new Error(`No contract address found for the current network (Chain ID: ${chainId}). Please switch to a supported network.`)
      }
      
      if (isV2Contract) {
        // V2 Contract - Use struct-based approach
        const feeBps = enableCustomFee && customFee !== "" ? Math.round(parseFloat(customFee) * 100) : 0
        
        // Create parameter structs for V2
        const params = {
          cookieJarOwner: jarOwnerAddress,
          supportedCurrency: supportedCurrency,
          accessType: accessType,
          withdrawalOption: withdrawalOption,
          fixedAmount: parseAmount(fixedAmount),
          maxWithdrawal: parseAmount(maxWithdrawal),
          withdrawalInterval: BigInt(withdrawalInterval || "0"),
          strictPurpose: strictPurpose,
          emergencyWithdrawalEnabled: emergencyWithdrawalEnabled,
          oneTimeWithdrawal: oneTimeWithdrawal,
          metadata: finalMetadata,
          customFeePercentage: BigInt(feeBps),
          maxWithdrawalPerPeriod: BigInt(0) // Default to unlimited
        }
        
        const accessConfig = {
          nftAddresses: effectiveNftAddresses as readonly `0x${string}`[],
          nftTypes: effectiveNftTypes as readonly number[],
          allowlist: [] as readonly `0x${string}`[], // Will be populated by admin later
          poapReq: {
            eventId: BigInt(0),
            poapContract: "0x0000000000000000000000000000000000000000" as `0x${string}`
          },
          unlockReq: {
            lockAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`
          },
          hypercertReq: {
            tokenContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            tokenId: BigInt(0),
            minBalance: BigInt(1)
          },
          hatsReq: {
            hatId: BigInt(0),
            hatsContract: "0x0000000000000000000000000000000000000000" as `0x${string}`
          }
        }
        
        writeContract({
          address: factoryAddress,
          abi: cookieJarFactoryV2Abi,
          functionName: 'createCookieJar',
          args: [params, accessConfig],
        })
        
      } else {
        // V1 Contract - Use legacy approach
        writeContract({
          address: factoryAddress,
          abi: cookieJarFactoryV1Abi,
          functionName: 'createCookieJar',
          args: [
            jarOwnerAddress,
            supportedCurrency,
            accessType,
            effectiveNftAddresses as readonly `0x${string}`[],
            effectiveNftTypes,
            withdrawalOption,
            parseAmount(fixedAmount),
            parseAmount(maxWithdrawal),
            BigInt(withdrawalInterval || "0"),
            strictPurpose,
            emergencyWithdrawalEnabled,
            oneTimeWithdrawal,
            [] as readonly `0x${string}`[], // Empty allowlist for now
            finalMetadata,
          ],
        })
      }
      
      setIsCreating(true)
    } catch (error) {
      console.error("Error creating jar:", error)
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }, [validateAll, accessType, nftAddresses, nftTypes, isV2Contract, jarName, metadata, imageUrl, externalLink, factoryAddress, chainId, enableCustomFee, customFee, writeContract, jarOwnerAddress, supportedCurrency, withdrawalOption, fixedAmount, maxWithdrawal, withdrawalInterval, strictPurpose, emergencyWithdrawalEnabled, oneTimeWithdrawal, toast])
  
  // Reset form function
  const resetForm = useCallback(() => {
    setJarName("")
    setJarOwnerAddress("0x0000000000000000000000000000000000000000")
    setSupportedCurrency(ETH_ADDRESS)
    setAccessType(AccessType.Allowlist)
    setWithdrawalOption(WithdrawalTypeOptions.Fixed)
    setFixedAmount("0")
    setMaxWithdrawal("0")
    setWithdrawalInterval("0")
    setStrictPurpose(true)
    setEmergencyWithdrawalEnabled(true)
    setOneTimeWithdrawal(false)
    setMetadata("")
    setImageUrl("")
    setExternalLink("")
    setCustomFee("")
    setEnableCustomFee(false)
    setShowCustomCurrency(false)
    setCustomCurrencyAddress("")
    setNftAddresses([])
    setNftTypes([])
    setProtocolConfig({ accessType: 'Allowlist' })
  }, [])
  
  // Currency options for the supported network
  const getCurrencyOptions = () => {
    const options = [
      { value: ETH_ADDRESS, label: "ETH (Native)", description: "Use native Ethereum" }
    ]
    
    // Add chain-specific ERC20 tokens
    if (chainId === 31337) { // Local development
      options.push({
        value: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        label: "DEMO Token", 
        description: "Local development token"
      })
    } else if (chainId === 84532) { // Base Sepolia
      options.push({
        value: "0x4200000000000000000000000000000000000006",
        label: "WETH",
        description: "Wrapped ETH on Base Sepolia"
      })
    }
    
    // Add custom option
    options.push({
      value: "CUSTOM",
      label: "Custom ERC-20",
      description: "Enter your own ERC-20 token address"
    })
    
    return options
  }
  
  // Handle currency selection change
  const handleCurrencyChange = (value: string) => {
    if (value === "CUSTOM") {
      setShowCustomCurrency(true)
    } else {
      setShowCustomCurrency(false)
      setSupportedCurrency(value as `0x${string}`)
      setCustomCurrencyAddress("")
    }
  }
  
  // Basic ERC-20 validation
  const validateERC20Address = async (address: string): Promise<boolean> => {
    if (!isAddress(address)) return false
    if (address.toLowerCase() === ETH_ADDRESS.toLowerCase()) return true
    
    try {
      return isAddress(address)
    } catch (error) {
      console.error('ERC-20 validation error:', error)
      return false
    }
  }
  
  // Handle custom currency address
  const handleCustomCurrencySubmit = async () => {
    if (customCurrencyAddress && isAddress(customCurrencyAddress)) {
      const isValidERC20 = await validateERC20Address(customCurrencyAddress)
      
      if (isValidERC20) {
        setSupportedCurrency(customCurrencyAddress as `0x${string}`)
        toast({
          title: "Custom currency set",
          description: "ERC-20 token address has been set successfully"
        })
      } else {
        toast({
          title: "Invalid ERC-20 address",
          description: "The address doesn't appear to be a valid ERC-20 contract. Please verify the address.",
          variant: "destructive"
        })
      }
    } else {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive"
      })
    }
  }
  
  // Development helper
  const prepopulateRandomData = () => {
    if (process.env.NODE_ENV !== 'development') return
    
    const randomNames = ['Cookie Fund', 'Dev Grants', 'Community Pool', 'Test Jar', 'Demo Fund', 'Alpha Pool']
    const randomDescriptions = [
      'A fund for supporting cookie development',
      'Grants for innovative projects',
      'Community-driven funding pool',
      'Testing new jar functionality',
      'Demonstration of jar capabilities',
      'Early access funding'
    ]
    const randomImages = [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=3'
    ]
    const randomLinks = [
      'https://example.com/project1',
      'https://github.com/test/repo',
      'https://docs.example.com'
    ]
    
    setJarName(randomNames[Math.floor(Math.random() * randomNames.length)])
    setMetadata(randomDescriptions[Math.floor(Math.random() * randomDescriptions.length)])
    setImageUrl(randomImages[Math.floor(Math.random() * randomImages.length)])
    setExternalLink(randomLinks[Math.floor(Math.random() * randomLinks.length)])
    
    if (Math.random() > 0.5) {
      setEnableCustomFee(true)
      setCustomFee((Math.random() * 1.9 + 0.1).toFixed(2))
    }
    
    if (Math.random() > 0.7) {
      setSupportedCurrency("0x036CbD53842c5426634e7929541eC2318f3dCF7e")
    }
    
    setFixedAmount((Math.random() * 0.5).toFixed(3))
    setMaxWithdrawal((Math.random() * 2).toFixed(3))
    setWithdrawalInterval(String(Math.floor(Math.random() * 30 + 1)))
  }
  
  // Trigger confetti animation
  const triggerConfetti = async () => {
    try {
      const confettiModule = await import('canvas-confetti')
      const confetti = confettiModule.default
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (error) {
      console.log('Confetti animation failed:', error)
    }
  }
  
  // Effects
  useEffect(() => {
    if (txConfirmed && receipt) {
      console.log("🎉 Transaction confirmed:", receipt)
      
      // Invalidate cache to show new jar immediately
      queryClient.invalidateQueries({ 
        queryKey: ['cookie-jar-factory', chainId, factoryAddress] 
      })
      
      toast({
        title: "Cookie Jar Created! 🎉",
        description: "Your new jar has been deployed successfully. Visit /jars to see it in the list!",
      })
      
      triggerConfetti()
      
      try {
        let jarAddress: string | null = null
        
        if (receipt.logs && receipt.logs.length > 0) {
          for (const log of receipt.logs) {
            try {
              const decodedLog = decodeEventLog({
                abi: isV2Contract ? cookieJarFactoryAbi : cookieJarFactoryV1Abi,
                data: log.data,
                topics: log.topics,
                eventName: 'CookieJarCreated'
              })
              
              if (decodedLog.eventName === 'CookieJarCreated') {
                jarAddress = (decodedLog.args as any)?.cookieJarAddress
                console.log("✅ Decoded CookieJarCreated event - jar address:", jarAddress)
                break
              }
            } catch (decodeError) {
              console.log("📝 Log is not CookieJarCreated event, checking next log")
              continue
            }
          }
        }
        
        if (jarAddress && isAddress(jarAddress)) {
          console.log("🎯 Successfully extracted jar address:", jarAddress)
          
          setNewJarPreview({
            address: jarAddress,
            name: jarName || 'New Cookie Jar',
            currency: supportedCurrency
          })
          
          setTimeout(() => {
            router.push(`/jar/${jarAddress}`)
          }, 1000)
          
          setIsCreating(false)
          resetForm()
          return
        }
        
        console.warn("⚠️ Could not extract jar address from event, redirecting to jars page")
        setTimeout(() => {
          router.push("/jars")
        }, 500)
        
      } catch (error) {
        console.error("❌ Error extracting jar address:", error)
        setTimeout(() => {
          router.push("/jars")
        }, 500)
      }
      
      setIsCreating(false)
      resetForm()
    }
  }, [txConfirmed, receipt, router, jarName, supportedCurrency, isV2Contract, toast, resetForm, queryClient, chainId, factoryAddress])
  
  useEffect(() => {
    if (createError) {
      console.error("Transaction error:", createError)
      
      toast({
        title: "Transaction Failed",
        description: createError.message || "Failed to create cookie jar",
        variant: "destructive",
      })
      
      setIsCreating(false)
      setIsFormError(true)
    }
  }, [createError, toast])
  
  useEffect(() => {
    if (isConnected && address) {
      setJarOwnerAddress(address)
    }
  }, [isConnected, address])
  
  useEffect(() => {
    if (!isV2Contract) {
      setAccessType(AccessType.Allowlist)
      setEnableCustomFee(false)
      setCustomFee("")
    }
  }, [isV2Contract])
  
  return {
    // Form state
    selectedNetwork, setSelectedNetwork,
    jarOwnerAddress, setJarOwnerAddress,
    supportedCurrency, setSupportedCurrency,
    accessType, setAccessType,
    withdrawalOption, setWithdrawalOption,
    fixedAmount, setFixedAmount,
    maxWithdrawal, setMaxWithdrawal,
    withdrawalInterval, setWithdrawalInterval,
    strictPurpose, setStrictPurpose,
    emergencyWithdrawalEnabled, setEmergencyWithdrawalEnabled,
    oneTimeWithdrawal, setOneTimeWithdrawal,
    metadata, setMetadata,
    jarName, setJarName,
    imageUrl, setImageUrl,
    externalLink, setExternalLink,
    customFee, setCustomFee,
    enableCustomFee, setEnableCustomFee,
    showCustomCurrency, setShowCustomCurrency,
    customCurrencyAddress, setCustomCurrencyAddress,
    nftAddresses, setNftAddresses,
    nftTypes, setNftTypes,
    protocolConfig, setProtocolConfig,
    isFormError, setIsFormError,
    formErrors, setFormErrors,
    newJarPreview, setNewJarPreview,
    
    // Transaction state
    isCreating: isPending,
    isWaitingForTx,
    txConfirmed,
    receipt,
    createError,
    
    // Actions
    confirmSubmit,
    resetForm,
    handleCheckboxChange,
    handleProtocolConfigChange,
    handleAddNFT,
    handleCurrencyChange,
    handleCustomCurrencySubmit,
    prepopulateRandomData,
    
    // Validation
    validateStep1,
    validateStep2,
    validateStep3,
    validateStep4,
    validateAll,
    
    // Utilities
    getCurrencyOptions,
    parseAmount,
    
    // Constants
    ETH_ADDRESS,
    factoryAddress,
    isV2Contract
  }
}
