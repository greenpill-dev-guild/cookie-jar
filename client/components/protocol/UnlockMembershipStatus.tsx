import React, { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { useUnlockLocks } from '@/hooks/protocol/useUnlockLocks'

interface UnlockMembershipStatusProps {
  lockAddress: string
  className?: string
}

export const UnlockMembershipStatus: React.FC<UnlockMembershipStatusProps> = ({
  lockAddress,
  className = ''
}) => {
  const { address: userAddress } = useAccount()

  const {
    lockInfo,
    userKeys,
    hasValidKey,
    isLoading,
    isLoadingKeys,
    error,
    validateLockAddress,
    checkUserKeyValidity,
    refetch
  } = useUnlockLocks({
    lockAddress,
    fetchUserKeys: true,
    checkValidity: true
  })

  // Auto-validate on mount if we have a lock address
  useEffect(() => {
    if (lockAddress && !lockInfo && !isLoading) {
      validateLockAddress(lockAddress)
    }
  }, [lockAddress, lockInfo, isLoading, validateLockAddress])

  const handleRefresh = async () => {
    await Promise.all([
      validateLockAddress(lockAddress),
      userAddress && checkUserKeyValidity(lockAddress)
    ])
    refetch()
  }

  if (!userAddress) {
    return (
      <Card className={`border-amber-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Key className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-[#3c2a14]">Connect Wallet</p>
              <p className="text-sm text-[#8b7355]">
                Connect your wallet to check membership status
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-[#3c2a14]">Membership Check Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || isLoadingKeys) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
            </div>
            <div>
              <p className="font-medium text-[#3c2a14]">Checking Membership</p>
              <p className="text-sm text-[#8b7355]">
                Verifying your Unlock Protocol membership status...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!lockInfo) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <Key className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-[#3c2a14]">No Lock Information</p>
              <p className="text-sm text-[#8b7355]">
                Unable to load lock information
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-l-4 ${hasValidKey ? 'border-l-green-500 border-green-200' : 'border-l-amber-500 border-amber-200'} ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Membership Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasValidKey ? 'bg-green-100' : 'bg-amber-100'}`}>
                <Key className={`h-5 w-5 ${hasValidKey ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[#3c2a14]">Unlock Membership Status</p>
                  <Badge variant={hasValidKey ? "default" : "secondary"}>
                    {hasValidKey ? "✓ Active" : "✗ Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-[#8b7355]">
                  {hasValidKey 
                    ? "You have a valid membership key" 
                    : "No valid membership key found"
                  }
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Lock Information */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#8b7355] font-medium">Lock Name</p>
                <p className="text-[#3c2a14]">{lockInfo.name || 'Unknown Lock'}</p>
              </div>
              {lockInfo.keyPrice && (
                <div>
                  <p className="text-[#8b7355] font-medium">Key Price</p>
                  <p className="text-[#3c2a14]">
                    {lockInfo.keyPrice} {lockInfo.currencySymbol || 'ETH'}
                  </p>
                </div>
              )}
              {lockInfo.expirationDuration && (
                <div>
                  <p className="text-[#8b7355] font-medium">Key Duration</p>
                  <p className="text-[#3c2a14]">
                    {Math.floor(lockInfo.expirationDuration / (24 * 60 * 60))} days
                  </p>
                </div>
              )}
              <div>
                <p className="text-[#8b7355] font-medium">Contract</p>
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono text-[#3c2a14] bg-gray-100 px-2 py-1 rounded">
                    {lockAddress.slice(0, 8)}...{lockAddress.slice(-6)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`https://etherscan.io/address/${lockAddress}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* User Keys */}
          {userKeys.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-[#8b7355] font-medium mb-2">Your Keys</p>
              <div className="space-y-2">
                {userKeys.map((key, index) => (
                  <div key={key.keyId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-mono text-[#3c2a14]">Key #{key.keyId}</p>
                      <p className="text-xs text-[#8b7355]">
                        {key.isValid 
                          ? `Expires: ${new Date(key.expiration * 1000).toLocaleDateString()}`
                          : 'Expired'
                        }
                      </p>
                    </div>
                    <Badge variant={key.isValid ? "default" : "destructive"} className="text-xs">
                      {key.isValid ? "Valid" : "Expired"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Keys Message */}
          {hasValidKey === false && userKeys.length === 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No Membership Found</p>
                  <p className="text-xs text-amber-700">
                    You don't have a valid key for this lock. Purchase or obtain a membership key to access this jar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {hasValidKey && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Membership Verified</p>
                  <p className="text-xs text-green-700">
                    You have valid access to withdraw from this jar using your Unlock Protocol membership.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
