'use client'

import { useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Copy, Check, ExternalLink, LogOut, Wallet, Eye, Search, Edit } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { shortenAddress } from '@/lib/utils/utils'
import { getExplorerAddressUrl } from '@/lib/utils/network-utils'
import { useChainId } from 'wagmi'

interface ConnectedMobileViewProps {
  address: string
  onDisconnect: () => void
}

function ConnectedMobileView({ address, onDisconnect }: ConnectedMobileViewProps) {
  const [copied, setCopied] = useState(false)
  const chainId = useChainId()
  
  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Wallet Card */}
      <Card className="cj-card-primary rounded-xl p-6 shadow-lg border-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--cj-dark-brown))]">Wallet Connected</h3>
              <p className="text-sm text-[hsl(var(--cj-medium-brown))]">Ready to interact with Cookie Jars</p>
            </div>
          </div>
        </div>
        
        {/* Address */}
        <div className="bg-[hsl(var(--cj-warm-white))] border border-[hsl(var(--border))] rounded-lg p-4 mb-4">
          <div className="flex-between-safe">
            <div className="address-text-mobile text-[hsl(var(--cj-dark-brown))] flex-1">
              {shortenAddress(address, 12)}
            </div>
            <button
              onClick={copyAddress}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-[hsl(var(--cj-warm-white))] transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-[hsl(var(--cj-medium-brown))]" />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => window.open(getExplorerAddressUrl(address, chainId), '_blank')}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
          >
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </Button>
          
          <Button
            onClick={onDisconnect}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </Button>
        </div>
      </Card>
    </div>
  )
}

function DisconnectedMobileView() {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="cj-card-primary rounded-xl p-6 shadow-lg text-center border-none">
        <div className="w-16 h-16 bg-[hsl(var(--cj-warm-white))] border border-[hsl(var(--border))] rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-[hsl(var(--cj-brand-orange))]" />
        </div>
        <h3 className="text-xl font-semibold text-[hsl(var(--cj-dark-brown))] mb-2">Connect Your Wallet</h3>
        <p className="text-[hsl(var(--cj-medium-brown))] mb-6">
          Connect your wallet to create Cookie Jars and interact with the platform
        </p>
        
        <div className="w-full">
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, mounted }) => {
              if (!mounted) return <div className="w-full h-12 bg-[hsl(var(--cj-warm-white))] rounded-lg animate-pulse" />

              if (!account) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="w-full cj-btn-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Connect Wallet
                  </button>
                )
              }

              return null // This shouldn't show since we handle connected state separately
            }}
          </ConnectButton.Custom>
        </div>
      </Card>

      {/* Features without wallet */}
      <Card className="cj-card-primary rounded-xl p-6 shadow-lg border-none">
        <h4 className="font-semibold text-[hsl(var(--cj-dark-brown))] mb-4">What you can do without connecting:</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[hsl(var(--cj-medium-brown))]">
            <Eye className="w-5 h-5 text-green-500" />
            <span>Browse all Cookie Jars</span>
          </div>
          <div className="flex items-center gap-3 text-[hsl(var(--cj-medium-brown))]">
            <Search className="w-5 h-5 text-green-500" />
            <span>View jar details and configurations</span>
          </div>
          <div className="flex items-center gap-3 text-[hsl(var(--cj-medium-brown))]">
            <Edit className="w-5 h-5 text-green-500" />
            <span>Fill out the jar creation form</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function MobileProfile() {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()
  
  return (
    <div className="space-y-6">
        {/* Simple Header */}
        <div className="text-center mobile-safe-text">
          <h1 className="content-title text-[hsl(var(--cj-dark-brown))] mb-2">Profile</h1>
          <p className="content-subtitle text-[hsl(var(--cj-medium-brown))]">Manage your wallet connection</p>
        </div>

        {isConnected && address ? (
          <ConnectedMobileView address={address} onDisconnect={disconnect} />
        ) : (
          <DisconnectedMobileView />
        )}
    </div>
  )
}
