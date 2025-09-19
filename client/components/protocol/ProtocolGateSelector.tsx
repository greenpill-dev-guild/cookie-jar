import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Image as ImageIcon, 
  Award, 
  Key, 
  Crown, 
  Shield,
  CheckCircle2
} from 'lucide-react'
import { NFTGateInput } from '@/components/forms/NFTGateInput'
import { POAPGateConfig } from './POAPGateConfig'
import { UnlockGateConfig } from './UnlockGateConfig'
import { HypercertGateConfig } from './HypercertGateConfig'
import { HatsGateConfig } from './HatsGateConfig'

export type AccessType = 'Allowlist' | 'NFT' | 'POAP' | 'Unlock' | 'Hypercert' | 'Hats'

interface ProtocolConfig {
  accessType: AccessType
  // NFT specific
  nftAddresses?: string[]
  nftTypes?: number[]
  // POAP specific
  eventId?: string
  eventName?: string
  // Unlock specific
  lockAddress?: string
  lockInfo?: any
  // Hypercert specific
  tokenContract?: string
  tokenId?: string
  minBalance?: string
  hypercertInfo?: any
  // Hats specific
  hatId?: string
  hatsContract?: string
  hatInfo?: any
}

const gateMethods = [
  {
    id: 'Allowlist' as AccessType,
    name: 'Allowlist',
    description: 'Pre-approved addresses can access funds',
    icon: <Users className="h-6 w-6" />,
    badge: 'Simple',
    color: 'bg-blue-500',
    pros: ['Direct control', 'Gas efficient', 'Simple to manage'],
    cons: ['Manual management', 'Not scalable', 'Requires updates'],
    bestFor: ['Small teams', 'Known participants', 'High control needs']
  },
  {
    id: 'NFT' as AccessType,
    name: 'NFT Collection',
    description: 'NFT holders from specific collections can access',
    icon: <ImageIcon className="h-6 w-6" />,
    badge: 'Popular',
    color: 'bg-purple-500',
    pros: ['Scalable', 'Tradeable access', 'Automated'],
    cons: ['Gas for validation', 'NFT dependency', 'Market volatility'],
    bestFor: ['NFT communities', 'Token-gated access', 'Tradeable membership']
  },
  {
    id: 'POAP' as AccessType,
    name: 'POAP Badge',
    description: 'Event attendees with specific POAP can access',
    icon: <Award className="h-6 w-6" />,
    badge: 'Event-based',
    color: 'bg-yellow-500',
    pros: ['Event-based', 'Non-transferable', 'Proof of attendance'],
    cons: ['Event limitation', 'POAP dependency', 'Limited validation'],
    bestFor: ['Event perks', 'Attendee rewards', 'Non-transferable access']
  },
  {
    id: 'Unlock' as AccessType,
    name: 'Unlock Membership',
    description: 'Active membership key holders can access',
    icon: <Key className="h-6 w-6" />,
    badge: 'Subscription',
    color: 'bg-green-500',
    pros: ['Subscription model', 'Expiration handling', 'Revenue generation'],
    cons: ['Complexity', 'Unlock dependency', 'Key management'],
    bestFor: ['Paid memberships', 'Subscription access', 'Revenue models']
  },
  {
    id: 'Hypercert' as AccessType,
    name: 'Impact Certificate',
    description: 'Hypercert holders with verified impact can access',
    icon: <Award className="h-6 w-6" />,
    badge: 'Impact',
    color: 'bg-emerald-500',
    pros: ['Impact-based', 'Verifiable work', 'Fractional ownership'],
    cons: ['New protocol', 'Limited adoption', 'Complex validation'],
    bestFor: ['Impact projects', 'Contributor rewards', 'Work verification']
  },
  {
    id: 'Hats' as AccessType,
    name: 'Organizational Role',
    description: 'Role-based access via Hats Protocol',
    icon: <Crown className="h-6 w-6" />,
    badge: 'Governance',
    color: 'bg-indigo-500',
    pros: ['Role-based', 'Hierarchical', 'Dynamic permissions'],
    cons: ['Protocol complexity', 'Role dependency', 'Learning curve'],
    bestFor: ['DAOs', 'Hierarchical orgs', 'Role-based access']
  }
]

interface ProtocolGateSelectorProps {
  onConfigChange: (config: ProtocolConfig) => void
  initialConfig?: ProtocolConfig
  className?: string
}

export const ProtocolGateSelector: React.FC<ProtocolGateSelectorProps> = ({
  onConfigChange,
  initialConfig,
  className = ''
}) => {
  const [selectedMethod, setSelectedMethod] = useState<AccessType>(initialConfig?.accessType || 'Allowlist')
  const [config, setConfig] = useState<ProtocolConfig>(initialConfig || { accessType: 'Allowlist' })

  const handleMethodSelect = (method: AccessType) => {
    setSelectedMethod(method)
    const newConfig: ProtocolConfig = { accessType: method }
    setConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleNFTAdd = (address: string, type: number) => {
    const newConfig = {
      ...config,
      accessType: 'NFT' as AccessType,
      nftAddresses: [...(config.nftAddresses || []), address],
      nftTypes: [...(config.nftTypes || []), type]
    }
    setConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleProtocolConfigChange = (protocolConfig: any) => {
    const newConfig = { ...config, ...protocolConfig }
    setConfig(newConfig)
    onConfigChange(newConfig)
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="protocol-gate-selector">
      <div>
        <h2>Access Control Method</h2>
        <p>
          Choose how users will prove eligibility to access this jar
        </p>
      </div>

      {/* Method Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4" data-testid="method-grid">
        {gateMethods.map((method) => (
          <Card
            key={method.id}
            data-testid={`method-${method.id.toLowerCase()}`}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMethod === method.id
                ? 'ring-2 ring-[#ff5e14] bg-orange-50 selected'
                : 'hover:shadow-md'
            }`}
            onClick={() => handleMethodSelect(method.id)}
            style={{
              cursor: 'pointer',
              padding: '16px',
              margin: '8px',
              borderRadius: '8px',
              border: selectedMethod === method.id ? '2px solid orange' : '1px solid gray'
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg text-white ${method.color}`}>
                  {method.icon}
                </div>
                <div data-testid={`${method.id.toLowerCase()}-badge`}>
                  {method.badge}
                </div>
              </div>
              <h3 data-testid={`${method.id.toLowerCase()}-name`} className="text-base flex items-center gap-2">
                {method.name}
                {selectedMethod === method.id && (
                  <CheckCircle2 className="h-4 w-4 text-[#ff5e14]" />
                )}
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              <p data-testid={`${method.id.toLowerCase()}-description`} className="text-sm text-[#8b7355] mb-3">{method.description}</p>
              
              <div className="space-y-2 hidden md:block">
                <div data-testid={`${method.id.toLowerCase()}-pros`}>
                  <p className="text-sm font-medium">Pros:</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    {method.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>
                
                <div data-testid={`${method.id.toLowerCase()}-cons`}>
                  <p className="text-sm font-medium">Considerations:</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    {method.cons.map((con, i) => (
                      <li key={i}>{con}</li>
                    ))}
                  </ul>
                </div>
                
                <div data-testid={`${method.id.toLowerCase()}-best-for`}>
                  <p className="text-sm font-medium">Best for:</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    {method.bestFor.map((use, i) => (
                      <li key={i}>{use}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Panel */}
      {selectedMethod !== 'Allowlist' && (
        <div data-testid="config-panel">
          <h3>Configuration for {selectedMethod}</h3>
          <div>
            {selectedMethod === 'NFT' && (
              <div data-testid="nft-config">
                <p>NFT Collection Configuration</p>
                <input data-testid="nft-address-input" placeholder="NFT Contract Address" />
              </div>
            )}
            
            {selectedMethod === 'POAP' && (
              <div data-testid="poap-config">
                <p>POAP Event Configuration</p>
                <input data-testid="poap-event-id-input" placeholder="POAP Event ID" />
              </div>
            )}
            
            {selectedMethod === 'Unlock' && (
              <div data-testid="unlock-config">
                <UnlockGateConfig 
                  onConfigChange={handleProtocolConfigChange}
                  initialConfig={config.lockAddress ? { lockAddress: config.lockAddress, lockInfo: config.lockInfo } : undefined}
                />
              </div>
            )}
            
            {selectedMethod === 'Hypercert' && (
              <div data-testid="hypercert-config">
                <p>Hypercert Configuration</p>
                <input data-testid="hypercert-contract-input" placeholder="Hypercert Contract Address" />
              </div>
            )}
            
            {selectedMethod === 'Hats' && (
              <div data-testid="hats-config">
                <p>Hats Protocol Configuration</p>
                <input data-testid="hats-hat-id-input" placeholder="Hat ID" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allowlist Notice */}
      {selectedMethod === 'Allowlist' && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-[#3c2a14]">Allowlist Configuration</p>
                <p className="text-sm text-[#8b7355]">
                  You can add allowlisted addresses after creating the jar using the admin controls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Summary */}
      <div data-testid="config-summary" className="bg-[#f8f5f0] p-4 rounded-lg">
        <h3>Configuration Summary</h3>
        <p data-testid="selected-method">
          Method: {gateMethods.find(m => m.id === selectedMethod)?.name}
        </p>
            
      </div>
    </div>
  )
}
