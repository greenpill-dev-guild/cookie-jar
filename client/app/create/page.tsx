"use client"

import { DialogFooter } from "@/components/ui/dialog"

import React from "react"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cookieJarFactoryAbi } from "@/generated"
import { useWaitForTransactionReceipt, useAccount, useChainId, useWriteContract } from "wagmi"
import { contractAddresses, isV2Chain } from "@/config/supported-networks"
import { cookieJarFactoryV1Abi } from "@/lib/abis/cookie-jar-v1-abi"
import { parseEther, isAddress, decodeEventLog } from "viem"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react"
import { PlusCircle, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoadingOverlay } from "@/components/design/loading-overlay"
import { AlertCircle } from "lucide-react"
import { MemoizedCustomConnectButton } from "@/components/wallet/custom-connect-button"
import { useToast } from "@/hooks/design/use-toast"
import { ErrorBoundary } from "@/components/design/error-boundary"
import { ProtocolGateSelector } from "@/components/protocol/ProtocolGateSelector"
import { NFTGateInput } from "@/components/forms/NFTGateInput"
import { shortenAddress } from "@/lib/utils/utils"

// Constants
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

interface ProtocolConfig {
  accessType: 'Allowlist' | 'NFT' | 'POAP' | 'Unlock' | 'Hypercert' | 'Hats'
  // NFT specific
  nftAddresses?: string[]
  nftTypes?: number[]
  // POAP configuration
  poapEventId?: number
  poapContractAddress?: `0x${string}`
  // Unlock Protocol configuration
  unlockAddress?: `0x${string}`
  // Hypercerts configuration
  hypercertAddress?: `0x${string}`
  hypercertMinBalance?: number
  hypercertMaxBalance?: number
  // Hats Protocol configuration
  hatsId?: number
  hatsAddress?: `0x${string}`
}

// Enums matching the contract - expanded for multi-protocol support
enum AccessType {
  Allowlist = 0,
  NFTGated = 1,
  POAP = 2,
  Unlock = 3,
  Hypercert = 4,
  Hats = 5,
}

enum WithdrawalTypeOptions {
  Fixed = 0,
  Variable = 1,
}

enum NFTType {
  None = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

export default function CreateCookieJarForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(1)

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
  
  // NFT management state (for MVP, these remain empty arrays)
  const [nftAddresses, setNftAddresses] = useState<string[]>([])
  const [nftTypes, setNftTypes] = useState<number[]>([])
  
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  
  // Dynamic total steps - v1 chains skip access control step
  const isV2Contract = isV2Chain(chainId)
  const totalSteps = isV2Contract ? 4 : 3 // Skip access control for v1

  // Development helper function to prepopulate form with random data
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
    
    // Random custom fee between 0.1% and 2%
    if (Math.random() > 0.5) {
      setEnableCustomFee(true)
      setCustomFee((Math.random() * 1.9 + 0.1).toFixed(2))
    }
    
    // Random currency selection
    if (Math.random() > 0.7) {
      setSupportedCurrency("0x036CbD53842c5426634e7929541eC2318f3dCF7e") // Demo ERC20
    }
    
    // Random amounts
    setFixedAmount((Math.random() * 0.5).toFixed(3))
    setMaxWithdrawal((Math.random() * 2).toFixed(3))
    setWithdrawalInterval(String(Math.floor(Math.random() * 30 + 1))) // 1-30 days
  }

  // Protocol configuration state
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig>({ accessType: 'Allowlist' })

  // NFT-specific state (moved to line 108-109)

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
  const { writeContract, data: hash, error: createError, isPending: isWritePending } = useWriteContract()
  const { isLoading: isWaitingForTx, isSuccess: txConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  // Get supported factory address for current chain
  const factoryAddress = contractAddresses.cookieJarFactory[chainId] as `0x${string}` | undefined

  // Ensure v1 chains always use Allowlist access type and disable custom fees
  useEffect(() => {
    if (!isV2Contract) {
      setAccessType(AccessType.Allowlist)
      setEnableCustomFee(false) // v1 doesn't support custom fees
      setCustomFee("") // Clear any existing custom fee
    }
  }, [isV2Contract])

  // Handle the multi-step form navigation with v1/v2 logic
  const nextStep = () => {
    if (currentStep < totalSteps) {
      let nextStepNumber = currentStep + 1
      
      // For v1 chains, skip step 3 (access control) - jump from step 2 to step 4
      if (!isV2Contract && currentStep === 2) {
        nextStepNumber = 4 // Skip access control step
      }
      
      setCurrentStep(nextStepNumber)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      let prevStepNumber = currentStep - 1
      
      // For v1 chains, skip step 3 (access control) - jump from step 4 to step 2
      if (!isV2Contract && currentStep === 4) {
        prevStepNumber = 2 // Skip access control step
      }
      
      setCurrentStep(prevStepNumber)
    }
  }

  // Helper to parse amounts with proper scaling
  const parseAmount = (amount: string) => {
    try {
      return parseEther(amount || "0")
    } catch {
      return parseEther("0")
    }
  }

  // Helper to handle checkbox state changes
  const handleCheckboxChange = (setter: (value: boolean) => void) => (checked: boolean | "indeterminate") => {
    setter(checked === true)
  }

  // Handle protocol configuration changes
  const handleProtocolConfigChange = (config: ProtocolConfig) => {
    setProtocolConfig(config)
    // Map protocol access type to enum
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

  // Handle NFT addition from NFTGateInput
  const handleAddNFT = (address: string, type: number) => {
    setNftAddresses(prev => [...prev, address])
    setNftTypes(prev => [...prev, type as NFTType])
  }

  // Validation functions for each step
  const validateStep1 = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!jarName.trim()) {
      errors.push("Jar name is required")
    }
    
    // Allow empty jar owner address - it will be set to connected wallet or user can paste one
    if (jarOwnerAddress && !isAddress(jarOwnerAddress)) {
      errors.push("Jar owner address must be a valid Ethereum address")
    }
    
    if (!isAddress(supportedCurrency)) {
      // For custom ERC-20, add basic validation but don't block progression
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
  }

  const validateStep2 = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Validate withdrawal amounts
    if (withdrawalOption === WithdrawalTypeOptions.Fixed) {
      if (!fixedAmount || parseFloat(fixedAmount) <= 0) {
        errors.push("Fixed withdrawal amount must be greater than 0")
      }
    } else {
      if (!maxWithdrawal || parseFloat(maxWithdrawal) <= 0) {
        errors.push("Maximum withdrawal amount must be greater than 0")
      }
    }
    
    // Validate withdrawal interval
    if (!withdrawalInterval || parseInt(withdrawalInterval) <= 0) {
      errors.push("Withdrawal interval must be greater than 0 days")
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const validateStep3 = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Validate access control settings
    if (accessType === AccessType.NFTGated) {
      if (nftAddresses.length === 0) {
        errors.push("At least one NFT address is required for NFT-gated access")
      }
      
      // Validate each NFT address
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
  }

  const validateStep4 = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Validate custom fee if enabled
    if (enableCustomFee) {
      if (!customFee || parseFloat(customFee) < 0 || parseFloat(customFee) > 100) {
        errors.push("Custom fee must be between 0 and 100 percent")
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validate all steps
  const validateAll = (): { isValid: boolean; errors: string[] } => {
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
  }

  const confirmSubmit = () => {
    // Validate all steps before submitting
    const { isValid, errors } = validateAll();
    
    if (!isValid) {
      setFormErrors(errors);
      setIsFormError(true);
      return;
    }
    
    setFormErrors([]);
    setIsFormError(false);

    startTransition(() => {
      // Only use NFT addresses if access type is TokenGated  
      const effectiveNftAddresses = accessType === AccessType.NFTGated
        ? nftAddresses || []
        : []

      const effectiveNftTypes = accessType === AccessType.NFTGated
        ? nftTypes || []
        : []

      // Create metadata based on contract version
      const finalMetadata = isV2Contract 
        ? JSON.stringify({
            version: "2.0",
            name: jarName,
            description: metadata,
            image: imageUrl,
            external_url: externalLink
          })
        : (jarName || metadata || "Cookie Jar") // v1 uses simple string metadata

      try {
        // Check if we have a valid factory address for this chain
        if (!factoryAddress) {
          throw new Error(`No contract address found for the current network (Chain ID: ${chainId}). Please switch to a supported network.`)
        }

        // Select correct ABI based on contract version
        const factoryAbi = isV2Contract ? cookieJarFactoryAbi : cookieJarFactoryV1Abi
        
        // Determine which function to call based on custom fee
        const useCustomFee = enableCustomFee && customFee !== "" && isV2Contract // Custom fee only available on v2
        const feeBps = useCustomFee ? Math.round(parseFloat(customFee) * 100) : 0

        if (useCustomFee) {
          // v2 only - custom fee function
          writeContract({
            address: factoryAddress,
            abi: factoryAbi,
            functionName: 'createCookieJarWithFee',
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
              [] as readonly `0x${string}`[], // Adding empty whitelist array TODO integrate w/ FE so users can pass an initial whitelist on jar creation
              finalMetadata,
              BigInt(feeBps),
            ],
          })
        } else {
          // Standard createCookieJar (both v1 and v2)
          writeContract({
            address: factoryAddress,
            abi: factoryAbi,
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
              [] as readonly `0x${string}`[], // Adding empty whitelist array TODO integrate w/ FE so users can pass an initial whitelist on jar creation
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
    })
  }

  // Reset form function
  const resetForm = () => {
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
    setJarName("")
    setImageUrl("")
    setExternalLink("")
    setCustomFee("")
    setEnableCustomFee(false)
    setShowCustomCurrency(false)
    setCustomCurrencyAddress("")
    setNftAddresses([])
    setNftTypes([])
    setProtocolConfig({ accessType: 'Allowlist' })
    setCurrentStep(1)
  }

  // Trigger confetti animation - dynamic import to avoid build issues
  const triggerConfetti = async () => {
    try {
      // @ts-ignore - Dynamic import for confetti, types not critical
      const confettiModule = await import('canvas-confetti')
      const confetti = confettiModule.default
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (error) {
      console.log('Confetti animation failed:', error)
      // Gracefully fail - confetti is not critical
    }
  }

  // Update the useEffect for transaction confirmation to extract jar address and redirect
  useEffect(() => {
    if (txConfirmed && receipt) {
      console.log("🎉 Transaction confirmed:", receipt)

      // Show success toast and confetti
      toast({
        title: "Cookie Jar Created! 🎉",
        description: "Your new jar has been deployed successfully. Visit /jars to see it in the list!",
      })

      // Trigger confetti animation
      triggerConfetti()

      // 🚀 FIX: Properly decode CookieJarCreated event to extract jar address
      try {
        let jarAddress: string | null = null
        
        if (receipt.logs && receipt.logs.length > 0) {
          // Find the CookieJarCreated event log
          for (const log of receipt.logs) {
            try {
              const decodedLog = decodeEventLog({
                abi: isV2Contract ? cookieJarFactoryAbi : cookieJarFactoryV1Abi,
                data: log.data,
                topics: log.topics,
                eventName: 'CookieJarCreated'
              })
              
              if (decodedLog.eventName === 'CookieJarCreated') {
                // Extract jar address from event args
                jarAddress = (decodedLog.args as any)?.cookieJarAddress
                console.log("✅ Decoded CookieJarCreated event - jar address:", jarAddress)
                break
              }
            } catch (decodeError) {
              // This log is not a CookieJarCreated event, continue to next log
              console.log("📝 Log is not CookieJarCreated event, checking next log")
              continue
            }
          }
        }

        if (jarAddress && isAddress(jarAddress)) {
          console.log("🎯 Successfully extracted jar address:", jarAddress)

          // 🚀 Show preview card immediately
          setNewJarPreview({
            address: jarAddress,
            name: jarName || 'New Cookie Jar',
            currency: supportedCurrency
          })
          
          // 🚀 Faster redirect (reduced from 2000ms to 1000ms)
          setTimeout(() => {
            router.push(`/jar/${jarAddress}`)
          }, 1000)

          setIsCreating(false)
          resetForm()
          return
        }

        // If we couldn't decode the event or find the address, fall back to the jars listing page
        console.warn("⚠️ Could not extract jar address from event, redirecting to jars page")
        console.log("Receipt logs:", receipt.logs)

        // Fallback to jars listing (faster)
        setTimeout(() => {
          router.push("/jars")
        }, 500)

      } catch (error) {
        console.error("❌ Error extracting jar address:", error)

        // Fallback to jars listing (faster)
        setTimeout(() => {
          router.push("/jars")
        }, 500)
      }

      // Reset form after successful creation
      setIsCreating(false)
      resetForm()
    }
  }, [txConfirmed, receipt, router, jarName, supportedCurrency])


  // Update the useEffect for create errors to show the error message
  useEffect(() => {
    if (createError) {
      console.error("Transaction error:", createError)
      
      // Show error toast
      toast({
        title: "Transaction Failed",
        description: createError.message || "Failed to create cookie jar",
        variant: "destructive",
      })
      
      setIsCreating(false)
      setIsFormError(true)
    }
  }, [createError])

  // Auto-populate owner address when connected
  useEffect(() => {
    if (isConnected && address) {
      setJarOwnerAddress(address)
    }
  }, [isConnected, address])

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
      // Don't update supportedCurrency yet, wait for user input
    } else {
      setShowCustomCurrency(false)
      setSupportedCurrency(value as `0x${string}`)
      setCustomCurrencyAddress("")
    }
  }

  // Basic ERC-20 validation (simple check for now)
  const validateERC20Address = async (address: string): Promise<boolean> => {
    if (!isAddress(address)) return false
    
    // For native ETH, always valid
    if (address.toLowerCase() === ETH_ADDRESS.toLowerCase()) return true
    
    try {
      // Basic validation - check if it's a contract address
      // In a full implementation, we'd check if it implements ERC-20 interface
      // For now, just validate it's a proper address format
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

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prepopulateRandomData}
                  className="text-xs"
                >
                  🎲 Fill with Random Data (Dev Only)
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="jarName">Jar Name *</Label>
                <Input
                  id="jarName"
                  value={jarName}
                  onChange={(e) => setJarName(e.target.value)}
                  placeholder="e.g., Community Fund, Dev Grants"
                />
              </div>

              <div>
                <Label htmlFor="jarOwner">Jar Owner Address *</Label>
                <div className="relative">
                  <Input
                    id="jarOwner"
                    value={jarOwnerAddress}
                    onChange={(e) => setJarOwnerAddress(e.target.value as `0x${string}`)}
                    placeholder="0x... (defaults to your connected wallet)"
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 text-gray-500 hover:text-[#ff5e14]"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        if (text && isAddress(text)) {
                          setJarOwnerAddress(text as `0x${string}`)
                          toast({
                            title: "Address pasted",
                            description: "Wallet address has been pasted successfully"
                          })
                        } else {
                          toast({
                            title: "Invalid address",
                            description: "The clipboard doesn't contain a valid Ethereum address",
                            variant: "destructive"
                          })
                        }
                      } catch (err) {
                        toast({
                          title: "Paste failed",
                          description: "Could not read from clipboard. Please paste manually.",
                          variant: "destructive"
                        })
                      }
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {isConnected && address 
                    ? `Currently set to your connected wallet: ${shortenAddress(address, 10)}`
                    : "The address that will own and manage this jar"
                  }
                </p>
              </div>

              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={showCustomCurrency ? "CUSTOM" : supportedCurrency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrencyOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {showCustomCurrency && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="customCurrency">ERC-20 Token Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="customCurrency"
                        value={customCurrencyAddress}
                        onChange={(e) => setCustomCurrencyAddress(e.target.value)}
                        placeholder="0x... (ERC-20 contract address)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCustomCurrencySubmit}
                        disabled={!customCurrencyAddress || !isAddress(customCurrencyAddress)}
                        className="px-4"
                      >
                        Set
                      </Button>
                    </div>
                    {customCurrencyAddress && !isAddress(customCurrencyAddress) && (
                      <p className="text-sm text-red-600">
                        Please enter a valid Ethereum address
                      </p>
                    )}
                    {supportedCurrency && supportedCurrency !== ETH_ADDRESS && isAddress(supportedCurrency) && (
                      <p className="text-sm text-green-600">
                        ✓ Custom ERC-20 set: {shortenAddress(supportedCurrency, 10)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder="Describe what this jar is for..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="externalLink">External Link</Label>
                <Input
                  id="externalLink"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Withdrawal Settings</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="withdrawalType">Withdrawal Type *</Label>
                <Select
                  value={withdrawalOption.toString()}
                  onValueChange={(value) => setWithdrawalOption(parseInt(value) as WithdrawalTypeOptions)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select withdrawal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Fixed - Same amount each time</SelectItem>
                    <SelectItem value="1">Variable - User chooses amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {withdrawalOption === WithdrawalTypeOptions.Fixed && (
                <div>
                  <Label htmlFor="fixedAmount">Fixed Withdrawal Amount *</Label>
                  <Input
                    id="fixedAmount"
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    placeholder="0.1"
                    step="0.001"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Amount users can withdraw each time
                  </p>
                </div>
              )}

              {withdrawalOption === WithdrawalTypeOptions.Variable && (
                <div>
                  <Label htmlFor="maxWithdrawal">Maximum Withdrawal Amount *</Label>
                  <Input
                    id="maxWithdrawal"
                    type="number"
                    value={maxWithdrawal}
                    onChange={(e) => setMaxWithdrawal(e.target.value)}
                    placeholder="1.0"
                    step="0.001"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum amount users can withdraw at once
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="withdrawalInterval">Withdrawal Interval (days) *</Label>
                <Input
                  id="withdrawalInterval"
                  type="number"
                  value={withdrawalInterval}
                  onChange={(e) => setWithdrawalInterval(e.target.value)}
                  placeholder="7"
                  min="1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Time between allowed withdrawals (e.g., 7 = weekly, 30 = monthly)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="strictPurpose"
                    checked={strictPurpose}
                    onCheckedChange={handleCheckboxChange(setStrictPurpose)}
                  />
                  <Label htmlFor="strictPurpose" className="text-sm">
                    Require purpose description (minimum 20 characters)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergencyWithdrawal"
                    checked={emergencyWithdrawalEnabled}
                    onCheckedChange={handleCheckboxChange(setEmergencyWithdrawalEnabled)}
                  />
                  <Label htmlFor="emergencyWithdrawal" className="text-sm">
                    Enable emergency withdrawal
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="oneTimeWithdrawal"
                    checked={oneTimeWithdrawal}
                    onCheckedChange={handleCheckboxChange(setOneTimeWithdrawal)}
                  />
                  <Label htmlFor="oneTimeWithdrawal" className="text-sm">
                    One-time withdrawal only (users can only claim once)
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        // Skip access control step for v1 chains (they only support allowlist)
        if (!isV2Contract) {
          return null
        }
        
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Access Control</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                🚀 <strong>v2 Contract Feature:</strong> Enhanced access control with support for NFT gates, POAP verification, and protocol integrations.
              </p>
            </div>
            
            <ProtocolGateSelector
              onConfigChange={handleProtocolConfigChange}
              initialConfig={protocolConfig}
            />

            {accessType === AccessType.NFTGated && (
              <div className="mt-6">
                <NFTGateInput onAddNFT={handleAddNFT} />
                
                {nftAddresses.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Added NFT Contracts:</Label>
                    {nftAddresses.map((address, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{address}</span>
                        <span className="text-xs text-muted-foreground">
                          {nftTypes[index] === NFTType.ERC721 ? 'ERC721' : 'ERC1155'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNftAddresses(prev => prev.filter((_, i) => i !== index))
                            setNftTypes(prev => prev.filter((_, i) => i !== index))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Final Settings & Review</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableCustomFee"
                  checked={enableCustomFee}
                  disabled={!isV2Contract}
                  onCheckedChange={handleCheckboxChange(setEnableCustomFee)}
                />
                <Label htmlFor="enableCustomFee" className={`text-sm ${!isV2Contract ? 'text-gray-400' : ''}`}>
                  Set custom deposit fee percentage
                  {!isV2Contract && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      v2 only
                    </span>
                  )}
                </Label>
              </div>

              {enableCustomFee && (
                <div>
                  <Label htmlFor="customFee">Custom Fee Percentage</Label>
                  <Input
                    id="customFee"
                    type="number"
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    placeholder="2.5"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Percentage fee charged on deposits (0-100%)
                  </p>
                </div>
              )}
            </div>

            {/* Configuration Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Configuration Summary</h4>
              <div className="text-sm space-y-1">
                <div><strong>Name:</strong> {jarName || "Not set"}</div>
                <div><strong>Owner:</strong> {jarOwnerAddress}</div>
                <div><strong>Currency:</strong> {supportedCurrency === ETH_ADDRESS ? "ETH" : supportedCurrency}</div>
                <div><strong>Access Type:</strong> {AccessType[accessType]}</div>
                <div><strong>Withdrawal:</strong> {WithdrawalTypeOptions[withdrawalOption]} 
                  {withdrawalOption === WithdrawalTypeOptions.Fixed 
                    ? ` (${fixedAmount} per withdrawal)` 
                    : ` (max ${maxWithdrawal} per withdrawal)`}
                </div>
                <div><strong>Interval:</strong> {withdrawalInterval} day{parseInt(withdrawalInterval) === 1 ? '' : 's'}</div>
                <div><strong>Strict Purpose:</strong> {strictPurpose ? "Yes" : "No"}</div>
                <div><strong>Emergency Withdrawal:</strong> {emergencyWithdrawalEnabled ? "Enabled" : "Disabled"}</div>
                <div><strong>One-time Only:</strong> {oneTimeWithdrawal ? "Yes" : "No"}</div>
                {enableCustomFee && <div><strong>Custom Fee:</strong> {customFee}%</div>}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Check if current step is valid
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return validateStep1().isValid
      case 2:
        return validateStep2().isValid
      case 3:
        // Skip validation for step 3 on v1 chains
        return isV2Contract ? validateStep3().isValid : true
      case 4:
        return validateStep4().isValid
      default:
        return false
    }
  }

  // Wallet connection modal state
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState(false)

  // Auto-retry jar creation when wallet connects
  useEffect(() => {
    if (isConnected && address && pendingSubmission && showWalletModal) {
      setShowWalletModal(false)
      setPendingSubmission(false)
      // Retry the submission
      setTimeout(() => {
        confirmSubmit()
      }, 100) // Small delay to ensure modal closes first
    }
  }, [isConnected, address, pendingSubmission, showWalletModal])

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--cj-dark-brown))]">Create Cookie Jar</h1>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isV2Contract 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {isV2Contract ? '🚀 v2 Contract' : '📦 v1 Contract'}
                </div>
              </div>
              <p className="text-[hsl(var(--cj-medium-brown))]">
                Set up your new cookie jar
                {!isV2Contract && (
                  <span className="ml-2 text-sm text-orange-600">
                    • Allowlist access only
                  </span>
                )}
              </p>
            </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[hsl(var(--cj-medium-brown))]">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-[hsl(var(--cj-medium-brown))]">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-[hsl(var(--cj-brand-orange))] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">
                {currentStep === 1 && "Basic Configuration"}
                {currentStep === 2 && "Withdrawal Settings"}
                {currentStep === 3 && isV2Contract && "Access Control"}
                {currentStep === 4 && "Final Settings & Review"}
                {!isV2Contract && currentStep === 4 && (
                  <div className="flex items-center gap-2">
                    Final Settings & Review
                    <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      v1 - Allowlist Only
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {renderStepContent()}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 md:flex-row md:justify-between">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="w-full md:w-auto flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}

              <div className={`w-full md:w-auto ${currentStep === 1 ? 'md:ml-auto' : ''}}`}>
                {currentStep < totalSteps ? (
                  <Button
                    onClick={nextStep}
                    disabled={!isCurrentStepValid()}
                    className="w-full md:w-auto cj-btn-primary flex items-center justify-center gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={confirmSubmit}
                    disabled={(!isCurrentStepValid() && isConnected) || isCreating || isWaitingForTx}
                    className="w-full md:w-auto cj-btn-primary flex items-center justify-center gap-2"
                  >
                    {isCreating || isWaitingForTx ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : !isConnected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Connect Wallet to Create
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Create Jar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* New Jar Preview Card */}
          {newJarPreview && (
            <Card className="mt-4 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-600" size={24} />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">
                      🎉 {newJarPreview.name} created successfully!
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      <strong>Address:</strong> {newJarPreview.address.slice(0, 8)}...{newJarPreview.address.slice(-6)}
                    </p>
                    <p className="text-sm text-green-600">
                      <strong>Currency:</strong> {newJarPreview.currency === ETH_ADDRESS ? 'ETH' : 'ERC20'}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Redirecting to your new jar...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {isFormError && formErrors.length > 0 && (
            <Card className="mt-4 border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-2">Please fix the following errors:</h3>
                    <ul className="list-disc list-inside space-y-1 text-red-700">
                      {formErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Wallet Connection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-[hsl(var(--cj-dark-brown))]">Connect Your Wallet</CardTitle>
                <p className="text-[hsl(var(--cj-medium-brown))]">
                  You're all set! Now connect your wallet to create this Cookie Jar on the blockchain.
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <MemoizedCustomConnectButton className="w-full" />
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWalletModal(false)
                    setPendingSubmission(false)
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading Overlay */}
        {(isCreating || isWaitingForTx) && (
          <LoadingOverlay 
            isOpen={isCreating || isWaitingForTx}
            message={
              isWaitingForTx 
                ? "Waiting for transaction confirmation..." 
                : "Creating your cookie jar..."
            }
          />
        )}
    </ErrorBoundary>
  )
}