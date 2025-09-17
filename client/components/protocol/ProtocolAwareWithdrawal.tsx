import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Image as ImageIcon, 
  Award, 
  Key, 
  Crown, 
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUpToLine,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { ETH_ADDRESS, useTokenInfo, parseTokenAmount, formatTokenAmount } from '@/lib/utils/token-utils'
import { NFTSelector } from '@/components/forms/NFTSelector'
import type { SelectedNFT } from '@/components/forms/NFTSelector'

interface ProtocolAwareWithdrawalProps {
  /** Jar configuration object */
  config: {
    accessType: string // 'Allowlist' | 'NFTGated' | 'POAP' | 'Unlock' | 'Hypercert' | 'Hats'
    withdrawalOption: string // 'Fixed' | 'Variable'
    currency: string
    fixedAmount?: bigint
    maxWithdrawal?: bigint
    strictPurpose: boolean
    nftGates?: Array<{ address: string; nftType: number }>
    poapRequirement?: { eventId: string }
    unlockRequirement?: { lockAddress: string }
    hypercertRequirement?: { tokenContract: string; tokenId: string; minBalance: string }
    hatsRequirement?: { hatId: string; hatsContract: string }
    isWithdrawPending?: boolean
    contractAddress: string
  }
  /** Withdrawal functions for different access types */
  onWithdraw: {
    allowlist: (amount: bigint, purpose: string) => void
    nft: (amount: bigint, purpose: string, gateAddress: string, tokenId: string) => void
    poap: (amount: bigint, purpose: string, tokenId: string) => void
    unlock: (amount: bigint, purpose: string) => void
    hypercert: (amount: bigint, purpose: string, tokenId: string) => void
    hats: (amount: bigint, purpose: string) => void
  }
  className?: string
}

export const ProtocolAwareWithdrawal: React.FC<ProtocolAwareWithdrawalProps> = ({
  config,
  onWithdraw,
  className = ''
}) => {
  const { address: userAddress } = useAccount()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPurpose, setWithdrawPurpose] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  
  // NFT-specific state
  const [selectedNFT, setSelectedNFT] = useState<SelectedNFT | null>(null)
  const [showManualNFTInput, setShowManualNFTInput] = useState(false)
  const [manualGateAddress, setManualGateAddress] = useState('')
  const [manualTokenId, setManualTokenId] = useState('')
  
  // POAP-specific state
  const [poapTokenId, setPoapTokenId] = useState('')
  
  // Hypercert-specific state  
  const [hypercertTokenId, setHypercertTokenId] = useState('')

  // Get token information  
  const tokenAddress = config.currency && config.currency !== ETH_ADDRESS ? config.currency as `0x${string}` : ETH_ADDRESS as `0x${string}`
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenInfo(tokenAddress)

  // Determine access type icon and info
  const getAccessTypeInfo = () => {
    switch (config.accessType) {
      case 'Allowlist':
        return {
          icon: <Users className="h-5 w-5" />,
          name: 'Allowlist Access',
          description: 'Your address is pre-approved for access',
          color: 'bg-blue-500'
        }
      case 'NFTGated':
        return {
          icon: <ImageIcon className="h-5 w-5" />,
          name: 'NFT Collection Access',
          description: 'Prove ownership of required NFT',
          color: 'bg-purple-500'
        }
      case 'POAP':
        return {
          icon: <Award className="h-5 w-5" />,
          name: 'POAP Event Access',
          description: 'Prove attendance at specific event',
          color: 'bg-yellow-500'
        }
      case 'Unlock':
        return {
          icon: <Key className="h-5 w-5" />,
          name: 'Unlock Membership',
          description: 'Active membership key required',
          color: 'bg-green-500'
        }
      case 'Hypercert':
        return {
          icon: <Award className="h-5 w-5" />,
          name: 'Impact Certificate',
          description: 'Verified impact contribution required',
          color: 'bg-emerald-500'
        }
      case 'Hats':
        return {
          icon: <Crown className="h-5 w-5" />,
          name: 'Organizational Role',
          description: 'Required role/hat in organization',
          color: 'bg-indigo-500'
        }
      default:
        return {
          icon: <Shield className="h-5 w-5" />,
          name: 'Access Required',
          description: 'Unknown access type',
          color: 'bg-gray-500'
        }
    }
  }

  const accessInfo = getAccessTypeInfo()

  // Calculate withdrawal amount in wei/smallest unit
  const getWithdrawalAmount = (): bigint => {
    if (config.withdrawalOption === 'Fixed' && config.fixedAmount) {
      return config.fixedAmount
    }
    
    if (config.withdrawalOption === 'Variable' && withdrawAmount) {
      return parseTokenAmount(withdrawAmount, tokenDecimals)
    }
    
    return BigInt(0)
  }

  // Validate withdrawal inputs
  const validateWithdrawal = (): { isValid: boolean; error?: string } => {
    const amount = getWithdrawalAmount()
    
    if (amount <= 0) {
      return { isValid: false, error: 'Invalid withdrawal amount' }
    }
    
    if (config.strictPurpose && (!withdrawPurpose || withdrawPurpose.length < 10)) {
      return { isValid: false, error: 'Purpose must be at least 10 characters' }
    }
    
    // Access-type specific validation
    switch (config.accessType) {
      case 'NFTGated':
        const gateAddress = selectedNFT?.contractAddress || manualGateAddress
        const tokenId = selectedNFT?.tokenId || manualTokenId
        if (!gateAddress || !tokenId) {
          return { isValid: false, error: 'Please select an NFT or enter contract address and token ID' }
        }
        break
        
      case 'POAP':
        if (!poapTokenId) {
          return { isValid: false, error: 'Please enter your POAP token ID' }
        }
        break
        
      case 'Hypercert':
        if (!hypercertTokenId) {
          return { isValid: false, error: 'Please enter the hypercert token ID' }
        }
        // Verify it matches the requirement
        if (config.hypercertRequirement && hypercertTokenId !== config.hypercertRequirement.tokenId) {
          return { isValid: false, error: `Token ID must be ${config.hypercertRequirement.tokenId}` }
        }
        break
    }
    
    return { isValid: true }
  }

  // Handle withdrawal submission
  const handleWithdraw = () => {
    const validation = validateWithdrawal()
    if (!validation.isValid) {
      setAmountError(validation.error || 'Invalid withdrawal')
      return
    }
    
    const amount = getWithdrawalAmount()
    
    switch (config.accessType) {
      case 'Allowlist':
        onWithdraw.allowlist(amount, withdrawPurpose)
        break
        
      case 'NFTGated':
        const gateAddress = selectedNFT?.contractAddress || manualGateAddress
        const tokenId = selectedNFT?.tokenId || manualTokenId
        onWithdraw.nft(amount, withdrawPurpose, gateAddress, tokenId)
        break
        
      case 'POAP':
        onWithdraw.poap(amount, withdrawPurpose, poapTokenId)
        break
        
      case 'Unlock':
        onWithdraw.unlock(amount, withdrawPurpose)
        break
        
      case 'Hypercert':
        onWithdraw.hypercert(amount, withdrawPurpose, hypercertTokenId)
        break
        
      case 'Hats':
        onWithdraw.hats(amount, withdrawPurpose)
        break
    }
  }

  // Clear validation error when inputs change
  useEffect(() => {
    if (amountError) {
      setAmountError(null)
    }
  }, [withdrawAmount, withdrawPurpose, selectedNFT, manualGateAddress, manualTokenId, poapTokenId, hypercertTokenId])

  const validation = validateWithdrawal()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Access Type Header */}
      <Card className="border-l-4 border-l-[#ff5e14]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white ${accessInfo.color}`}>
              {accessInfo.icon}
            </div>
            <div>
              <span className="text-[#3c2a14]">{accessInfo.name}</span>
              <p className="text-sm text-[#8b7355] font-normal">{accessInfo.description}</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Access Type Specific Configuration */}
      {config.accessType === 'NFTGated' && (
        <div className="space-y-4">
          <Tabs value={showManualNFTInput ? "manual" : "selector"} onValueChange={(value) => setShowManualNFTInput(value === "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="selector" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visual Selector
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Manual Input
              </TabsTrigger>
            </TabsList>

            <TabsContent value="selector" className="space-y-4">
              <NFTSelector
                contractAddresses={config.nftGates?.map(gate => gate.address)}
                onSelect={setSelectedNFT}
                selectedNFT={selectedNFT || undefined}
              />
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-[#3c2a14]">NFT Contract Address</Label>
                  <Input
                    placeholder="0x..."
                    className="bg-white border-gray-300 text-[#3c2a14]"
                    value={manualGateAddress}
                    onChange={(e) => setManualGateAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-[#3c2a14]">Token ID</Label>
                  <Input
                    placeholder="Token ID"
                    className="bg-white border-gray-300 text-[#3c2a14]"
                    value={manualTokenId}
                    onChange={(e) => setManualTokenId(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {config.accessType === 'POAP' && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-[#3c2a14]">Your POAP Token ID</Label>
            <Input
              placeholder="Enter your POAP token ID"
              className="bg-white border-gray-300 text-[#3c2a14]"
              value={poapTokenId}
              onChange={(e) => setPoapTokenId(e.target.value)}
            />
            {config.poapRequirement && (
              <p className="text-xs text-[#8b7355] mt-1">
                Required event: #{config.poapRequirement.eventId}
              </p>
            )}
          </div>
        </div>
      )}

      {config.accessType === 'Unlock' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-[#3c2a14]">Unlock Protocol Membership</p>
                <p className="text-sm text-[#8b7355]">
                  Your membership will be verified automatically when you withdraw
                </p>
                {config.unlockRequirement && (
                  <p className="text-xs text-[#8b7355] font-mono mt-1">
                    Lock: {config.unlockRequirement.lockAddress.slice(0, 10)}...{config.unlockRequirement.lockAddress.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {config.accessType === 'Hypercert' && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-[#3c2a14]">Hypercert Token ID</Label>
            <Input
              placeholder="Enter hypercert token ID"
              className="bg-white border-gray-300 text-[#3c2a14]"
              value={hypercertTokenId}
              onChange={(e) => setHypercertTokenId(e.target.value)}
            />
            {config.hypercertRequirement && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <span className="font-medium">Required:</span> Token #{config.hypercertRequirement.tokenId}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Minimum balance: {config.hypercertRequirement.minBalance} units
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {config.accessType === 'Hats' && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-[#3c2a14]">Hats Protocol Role</p>
                <p className="text-sm text-[#8b7355]">
                  Your role eligibility will be verified automatically when you withdraw
                </p>
                {config.hatsRequirement && (
                  <p className="text-xs text-[#8b7355] mt-1">
                    Required Hat ID: {config.hatsRequirement.hatId}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amount Input (for Variable withdrawals) */}
      {config.withdrawalOption === 'Variable' && (
        <div className="space-y-2">
          <Label className="text-[#3c2a14] font-medium">Withdrawal Amount</Label>
          <Input
            type="number"
            placeholder={`Enter amount (${tokenSymbol})`}
            className={`bg-white border-gray-300 text-[#3c2a14] ${amountError ? 'border-red-500' : ''}`}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            min="0"
            step="any"
            max={config.maxWithdrawal ? formatTokenAmount(config.maxWithdrawal, tokenDecimals, '') : undefined}
          />
          {config.maxWithdrawal && (
            <p className="text-xs text-[#8b7355]">
              Maximum: {formatTokenAmount(config.maxWithdrawal, tokenDecimals, tokenSymbol)}
            </p>
          )}
        </div>
      )}

      {/* Purpose Input (if required) */}
      {config.strictPurpose && (
        <div className="space-y-2">
          <Label className="text-[#3c2a14] font-medium">Withdrawal Purpose</Label>
          <Textarea
            placeholder="Enter the purpose of your withdrawal (min 10 characters)"
            className="bg-white border-gray-300 text-[#3c2a14] min-h-24"
            value={withdrawPurpose}
            onChange={(e) => setWithdrawPurpose(e.target.value)}
          />
          <p className="text-xs text-[#8b7355]">
            {withdrawPurpose.length}/10 characters minimum
          </p>
        </div>
      )}

      {/* Error Display */}
      {amountError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {amountError}
        </div>
      )}

      {/* Withdrawal Summary */}
      <Card className="bg-[#fff8f0] border-[#f0e6d8]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#3c2a14]">Withdrawal Amount</p>
              <p className="text-sm text-[#8b7355]">
                {config.withdrawalOption === 'Fixed'
                  ? `Fixed: ${config.fixedAmount ? formatTokenAmount(config.fixedAmount, tokenDecimals, tokenSymbol) : `0 ${tokenSymbol}`}`
                  : `Variable: ${withdrawAmount || "0"} ${tokenSymbol}`
                }
              </p>
            </div>
            <Badge className={accessInfo.color}>
              {accessInfo.name}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Button */}
      <Button
        onClick={handleWithdraw}
        className="w-full bg-[#ff5e14] hover:bg-[#e54d00] text-white py-6 text-lg"
        disabled={
          !validation.isValid || 
          config.isWithdrawPending ||
          (config.withdrawalOption === 'Variable' && (!withdrawAmount || Number(withdrawAmount) <= 0))
        }
      >
        {config.isWithdrawPending ? (
          <>
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
            Processing...
          </>
        ) : (
          <>
            <ArrowUpToLine className="h-5 w-5 mr-2" />
            Get Cookie
            {config.withdrawalOption === 'Fixed' && config.fixedAmount && (
              <span className="ml-2 text-sm opacity-90">
                ({formatTokenAmount(config.fixedAmount, tokenDecimals, tokenSymbol)})
              </span>
            )}
            {config.withdrawalOption === 'Variable' && withdrawAmount && (
              <span className="ml-2 text-sm opacity-90">
                ({withdrawAmount} {tokenSymbol})
              </span>
            )}
          </>
        )}
      </Button>

      {/* Help Text */}
      <div className="text-xs text-[#8b7355] bg-gray-50 p-3 rounded">
        <p className="font-medium mb-1">How {accessInfo.name} works:</p>
        <ul className="space-y-1 list-disc list-inside">
          {config.accessType === 'Allowlist' && (
            <li>Your address has been pre-approved by the jar admin</li>
          )}
          {config.accessType === 'NFTGated' && (
            <>
              <li>Select an NFT from your collection that's approved for this jar</li>
              <li>We'll verify you still own the NFT when you withdraw</li>
            </>
          )}
          {config.accessType === 'POAP' && (
            <>
              <li>You must own a POAP from the required event</li>
              <li>Enter your POAP token ID to prove ownership</li>
            </>
          )}
          {config.accessType === 'Unlock' && (
            <>
              <li>You must have a valid (non-expired) membership key</li>
              <li>Your membership status is checked automatically</li>
            </>
          )}
          {config.accessType === 'Hypercert' && (
            <>
              <li>You must hold the required hypercert (impact certificate)</li>
              <li>Enter the token ID of your hypercert to verify ownership</li>
            </>
          )}
          {config.accessType === 'Hats' && (
            <>
              <li>You must be wearing the required organizational role (hat)</li>
              <li>Your role status is verified automatically</li>
            </>
          )}
          <li>Click withdraw to claim your cookie using this access method</li>
        </ul>
      </div>
    </div>
  )
}
