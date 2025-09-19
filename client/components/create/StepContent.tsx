"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2 } from "lucide-react"
import { ProtocolGateSelector } from "@/components/protocol/ProtocolGateSelector"
import { NFTGateInput } from "@/components/forms/NFTGateInput"
import { shortenAddress } from "@/lib/utils/utils"
import { isAddress } from "viem"
import { AccessType, WithdrawalTypeOptions, NFTType } from "@/hooks/useJarCreation"

interface StepContentProps {
  step: number
  formData: any // Using any to avoid complex type imports for now
  isV2Contract: boolean
}

export const StepContent: React.FC<StepContentProps> = ({ step, formData, isV2Contract }) => {
  switch (step) {
    case 1:
      return <BasicConfigStep formData={formData} />
    case 2:
      return <WithdrawalSettingsStep formData={formData} />
    case 3:
      return isV2Contract ? <AccessControlStep formData={formData} /> : null
    case 4:
      return <FinalSettingsStep formData={formData} isV2Contract={isV2Contract} />
    default:
      return null
  }
}

const BasicConfigStep: React.FC<{ formData: any }> = ({ formData }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {process.env.NODE_ENV === 'development' && (
          <Button
            variant="outline"
            size="sm"
            onClick={formData.prepopulateRandomData}
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
            value={formData.jarName}
            onChange={(e) => formData.setJarName(e.target.value)}
            placeholder="e.g., Community Fund, Dev Grants"
          />
        </div>

        <div>
          <Label htmlFor="jarOwner">Jar Owner Address *</Label>
          <div className="relative">
            <Input
              id="jarOwner"
              value={formData.jarOwnerAddress}
              onChange={(e) => formData.setJarOwnerAddress(e.target.value as `0x${string}`)}
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
                    formData.setJarOwnerAddress(text as `0x${string}`)
                    // Could add toast here if needed
                  }
                } catch (err) {
                  console.error('Failed to read clipboard:', err)
                }
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {formData.jarOwnerAddress && formData.jarOwnerAddress !== "0x0000000000000000000000000000000000000000"
              ? `Currently set to: ${shortenAddress(formData.jarOwnerAddress, 10)}`
              : "The address that will own and manage this jar"
            }
          </p>
        </div>

        <div>
          <Label htmlFor="currency">Currency *</Label>
          <Select
            value={formData.showCustomCurrency ? "CUSTOM" : formData.supportedCurrency}
            onValueChange={formData.handleCurrencyChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {formData.getCurrencyOptions().map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {formData.showCustomCurrency && (
            <div className="mt-3 space-y-2">
              <Label htmlFor="customCurrency">ERC-20 Token Address</Label>
              <div className="flex gap-2">
                <Input
                  id="customCurrency"
                  value={formData.customCurrencyAddress}
                  onChange={(e) => formData.setCustomCurrencyAddress(e.target.value)}
                  placeholder="0x... (ERC-20 contract address)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={formData.handleCustomCurrencySubmit}
                  disabled={!formData.customCurrencyAddress || !isAddress(formData.customCurrencyAddress)}
                  className="px-4"
                >
                  Set
                </Button>
              </div>
              {formData.customCurrencyAddress && !isAddress(formData.customCurrencyAddress) && (
                <p className="text-sm text-red-600">
                  Please enter a valid Ethereum address
                </p>
              )}
              {formData.supportedCurrency && formData.supportedCurrency !== formData.ETH_ADDRESS && isAddress(formData.supportedCurrency) && (
                <p className="text-sm text-green-600">
                  ✓ Custom ERC-20 set: {shortenAddress(formData.supportedCurrency, 10)}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.metadata}
            onChange={(e) => formData.setMetadata(e.target.value)}
            placeholder="Describe what this jar is for..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => formData.setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div>
          <Label htmlFor="externalLink">External Link</Label>
          <Input
            id="externalLink"
            value={formData.externalLink}
            onChange={(e) => formData.setExternalLink(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>
    </div>
  )
}

const WithdrawalSettingsStep: React.FC<{ formData: any }> = ({ formData }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Withdrawal Settings</h3>
      
      <div className="grid gap-4">
        <div>
          <Label htmlFor="withdrawalType">Withdrawal Type *</Label>
          <Select
            value={formData.withdrawalOption.toString()}
            onValueChange={(value) => formData.setWithdrawalOption(parseInt(value) as WithdrawalTypeOptions)}
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

        {formData.withdrawalOption === WithdrawalTypeOptions.Fixed && (
          <div>
            <Label htmlFor="fixedAmount">Fixed Withdrawal Amount *</Label>
            <Input
              id="fixedAmount"
              type="number"
              value={formData.fixedAmount}
              onChange={(e) => formData.setFixedAmount(e.target.value)}
              placeholder="0.1"
              step="0.001"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Amount users can withdraw each time
            </p>
          </div>
        )}

        {formData.withdrawalOption === WithdrawalTypeOptions.Variable && (
          <div>
            <Label htmlFor="maxWithdrawal">Maximum Withdrawal Amount *</Label>
            <Input
              id="maxWithdrawal"
              type="number"
              value={formData.maxWithdrawal}
              onChange={(e) => formData.setMaxWithdrawal(e.target.value)}
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
            value={formData.withdrawalInterval}
            onChange={(e) => formData.setWithdrawalInterval(e.target.value)}
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
              checked={formData.strictPurpose}
              onCheckedChange={formData.handleCheckboxChange(formData.setStrictPurpose)}
            />
            <Label htmlFor="strictPurpose" className="text-sm">
              Require purpose description (minimum 20 characters)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="emergencyWithdrawal"
              checked={formData.emergencyWithdrawalEnabled}
              onCheckedChange={formData.handleCheckboxChange(formData.setEmergencyWithdrawalEnabled)}
            />
            <Label htmlFor="emergencyWithdrawal" className="text-sm">
              Enable emergency withdrawal
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="oneTimeWithdrawal"
              checked={formData.oneTimeWithdrawal}
              onCheckedChange={formData.handleCheckboxChange(formData.setOneTimeWithdrawal)}
            />
            <Label htmlFor="oneTimeWithdrawal" className="text-sm">
              One-time withdrawal only (users can only claim once)
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}

const AccessControlStep: React.FC<{ formData: any }> = ({ formData }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Access Control</h3>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          🚀 <strong>v2 Contract Feature:</strong> Enhanced access control with support for NFT gates, POAP verification, and protocol integrations.
        </p>
      </div>
      
      <ProtocolGateSelector
        onConfigChange={formData.handleProtocolConfigChange}
        initialConfig={formData.protocolConfig}
      />

      {formData.accessType === AccessType.NFTGated && (
        <div className="mt-6">
          <NFTGateInput onAddNFT={formData.handleAddNFT} />
          
          {formData.nftAddresses.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>Added NFT Contracts:</Label>
              {formData.nftAddresses.map((address: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{address}</span>
                  <span className="text-xs text-muted-foreground">
                    {formData.nftTypes[index] === NFTType.ERC721 ? 'ERC721' : 'ERC1155'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      formData.setNftAddresses((prev: string[]) => prev.filter((_, i) => i !== index))
                      formData.setNftTypes((prev: number[]) => prev.filter((_, i) => i !== index))
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
}

const FinalSettingsStep: React.FC<{ formData: any; isV2Contract: boolean }> = ({ formData, isV2Contract }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Final Settings & Review</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableCustomFee"
            checked={formData.enableCustomFee}
            disabled={!isV2Contract}
            onCheckedChange={formData.handleCheckboxChange(formData.setEnableCustomFee)}
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

        {formData.enableCustomFee && (
          <div>
            <Label htmlFor="customFee">Custom Fee Percentage</Label>
            <Input
              id="customFee"
              type="number"
              value={formData.customFee}
              onChange={(e) => formData.setCustomFee(e.target.value)}
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
          <div><strong>Name:</strong> {formData.jarName || "Not set"}</div>
          <div><strong>Owner:</strong> {formData.jarOwnerAddress}</div>
          <div><strong>Currency:</strong> {formData.supportedCurrency === formData.ETH_ADDRESS ? "ETH" : formData.supportedCurrency}</div>
          <div><strong>Access Type:</strong> {AccessType[formData.accessType]}</div>
          <div><strong>Withdrawal:</strong> {WithdrawalTypeOptions[formData.withdrawalOption]} 
            {formData.withdrawalOption === WithdrawalTypeOptions.Fixed 
              ? ` (${formData.fixedAmount} per withdrawal)` 
              : ` (max ${formData.maxWithdrawal} per withdrawal)`}
          </div>
          <div><strong>Interval:</strong> {formData.withdrawalInterval} day{parseInt(formData.withdrawalInterval) === 1 ? '' : 's'}</div>
          <div><strong>Strict Purpose:</strong> {formData.strictPurpose ? "Yes" : "No"}</div>
          <div><strong>Emergency Withdrawal:</strong> {formData.emergencyWithdrawalEnabled ? "Enabled" : "Disabled"}</div>
          <div><strong>One-time Only:</strong> {formData.oneTimeWithdrawal ? "Yes" : "No"}</div>
          {formData.enableCustomFee && <div><strong>Custom Fee:</strong> {formData.customFee}%</div>}
        </div>
      </div>
    </div>
  )
}
