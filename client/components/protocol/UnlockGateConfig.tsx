import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Key, ExternalLink } from 'lucide-react'
import { isAddress } from 'viem'
import { useUnlockLocks } from '@/hooks/protocol/useUnlockLocks'
import type { LockInfo } from '@/hooks/protocol/useUnlockLocks'

interface UnlockGateConfigProps {
  onConfigChange: (config: { lockAddress: string; lockInfo?: LockInfo }) => void
  initialConfig?: { lockAddress: string; lockInfo?: LockInfo }
  className?: string
}

export const UnlockGateConfig: React.FC<UnlockGateConfigProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const [lockAddress, setLockAddress] = useState(initialConfig?.lockAddress || '')
  const [debouncedAddress, setDebouncedAddress] = useState('')

  // Debounce address input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(lockAddress)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [lockAddress])

  // Use the real Unlock Protocol hook
  const {
    lockInfo,
    isLoadingLock,
    lockError,
    validateLockAddress,
  } = useUnlockLocks({
    lockAddress: debouncedAddress && isAddress(debouncedAddress) ? debouncedAddress : undefined
  })

  // Validate lock address when debounced address changes
  useEffect(() => {
    if (debouncedAddress && isAddress(debouncedAddress)) {
      validateLockAddress(debouncedAddress)
    }
  }, [debouncedAddress, validateLockAddress])

  // Notify parent when configuration changes
  useEffect(() => {
    if (lockAddress && lockInfo && !lockError) {
      onConfigChange({
        lockAddress,
        lockInfo
      })
    }
  }, [lockAddress, lockInfo, lockError, onConfigChange])

  const getValidationIcon = () => {
    if (!debouncedAddress) return null
    if (isLoadingLock) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (lockInfo && !lockError) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (lockError || (debouncedAddress && !isAddress(debouncedAddress))) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <Label className="text-[#3c2a14] text-base font-semibold">Unlock Protocol Configuration</Label>
        <p className="text-sm text-[#8b7355] mt-1">
          Configure which Unlock Protocol membership grants access to this jar
        </p>
      </div>

      {/* Lock Address Input */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-[#3c2a14]">Lock Contract Address</Label>
          <div className="relative">
            <Input
              placeholder="0x... (Unlock Protocol lock address)"
              className="bg-white border-gray-300 text-[#3c2a14] pr-8"
              value={lockAddress}
              onChange={(e) => setLockAddress(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {getValidationIcon()}
            </div>
          </div>
          {(lockError || (debouncedAddress && !isAddress(debouncedAddress))) && (
            <p className="text-xs text-red-600 mt-1">
              {!isAddress(debouncedAddress) ? 'Invalid contract address format' : lockError}
            </p>
          )}
          {lockInfo && !lockError && (
            <p className="text-xs text-green-600 mt-1">✓ Valid Unlock Protocol lock</p>
          )}
        </div>

        {/* Lock Information Display */}
        {lockInfo && (
          <Card className="border-l-4 border-l-[#ff5e14]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-[#ff5e14]" />
                Lock Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#8b7355]">Lock Name</Label>
                  <p className="text-sm font-medium text-[#3c2a14]">
                    {lockInfo.name || 'Unknown Lock'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-[#8b7355]">Symbol</Label>
                  <p className="text-sm font-medium text-[#3c2a14]">
                    {lockInfo.symbol || 'KEY'}
                  </p>
                </div>
                {lockInfo.keyPrice && (
                  <div>
                    <Label className="text-xs text-[#8b7355]">Key Price</Label>
                    <p className="text-sm font-medium text-[#3c2a14]">
                      {lockInfo.keyPrice} {lockInfo.currencySymbol || 'ETH'}
                    </p>
                  </div>
                )}
                {lockInfo.totalSupply !== undefined && lockInfo.maxNumberOfKeys && (
                  <div>
                    <Label className="text-xs text-[#8b7355]">Keys Issued</Label>
                    <p className="text-sm font-medium text-[#3c2a14]">
                      {lockInfo.totalSupply} / {lockInfo.maxNumberOfKeys}
                    </p>
                  </div>
                )}
                {lockInfo.expirationDuration && (
                  <div className="col-span-2">
                    <Label className="text-xs text-[#8b7355]">Key Duration</Label>
                    <p className="text-sm font-medium text-[#3c2a14]">
                      {Math.floor(lockInfo.expirationDuration / (24 * 60 * 60))} days
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8b7355]">Contract Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-[#3c2a14] bg-gray-100 px-2 py-1 rounded">
                      {lockInfo.address.slice(0, 10)}...{lockInfo.address.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`https://etherscan.io/address/${lockInfo.address}`, '_blank')}
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
          <h4 className="font-medium text-[#3c2a14] mb-2">How Unlock Protocol Gating Works</h4>
          <ul className="text-xs text-[#8b7355] space-y-1 list-disc list-inside">
            <li>Only holders of active (non-expired) keys from the specified lock can access the jar</li>
            <li>Keys can expire based on the lock's duration settings</li>
            <li>Access is automatically revoked when keys expire</li>
            <li>Members can purchase or be granted keys by the lock owner</li>
            <li>Keys are transferable NFTs, so access rights can be traded</li>
          </ul>
          
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-[#8b7355] font-medium">Integration:</p>
            <p className="text-xs text-[#8b7355]">
              The contract verifies membership by calling getHasValidKey() on the lock contract,
              which checks both ownership and expiration status.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
