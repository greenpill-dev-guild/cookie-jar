import { Monitor, Shield, Smartphone, Users } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResponsive } from '@/hooks/app/useResponsive';
import { cn } from '@/lib/app/utils';
import { NFTSelector } from './NFTSelector';
import { HatsConfig } from './protocols/HatsConfig';
import { HypercertConfig } from './protocols/HypercertConfig';
// Import protocol configs
import { POAPConfig } from './protocols/POAPConfig';
import { UnlockConfig } from './protocols/UnlockConfig';

export type AccessMethod =
  | 'Allowlist'
  | 'NFT'
  | 'POAP'
  | 'Hats'
  | 'Hypercert'
  | 'Unlock';

export interface ProtocolConfig {
  method: AccessMethod;
  // Method-specific config data
  [key: string]: any;
}

export interface ProtocolSelectorProps {
  onConfigChange: (config: ProtocolConfig) => void;
  initialConfig?: Partial<ProtocolConfig>;
  className?: string;
  forceMobile?: boolean;
  forceDesktop?: boolean;
  showViewToggle?: boolean;
}

const ACCESS_METHODS = [
  {
    id: 'Allowlist' as AccessMethod,
    name: 'Allowlist',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-blue-500',
    badge: <Badge className="bg-blue-100 text-blue-800">Simple</Badge>,
    learnMoreUrl: 'https://docs.cookiejar.wtf/access-types/allowlist',
  },
  {
    id: 'NFT' as AccessMethod,
    name: 'NFT Collection',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-purple-500',
    badge: <Badge className="bg-purple-100 text-purple-800">Flexible</Badge>,
    learnMoreUrl: 'https://docs.cookiejar.wtf/access-types/nft-gated',
  },
  {
    id: 'POAP' as AccessMethod,
    name: 'POAP',
    icon: <span className="text-lg">🎖️</span>,
    color: 'bg-purple-500',
    badge: <Badge className="bg-purple-100 text-purple-800">Event</Badge>,
    learnMoreUrl: 'https://poap.xyz/',
  },
  {
    id: 'Hats' as AccessMethod,
    name: 'Hats Protocol',
    icon: <span className="text-lg">🎩</span>,
    color: 'bg-yellow-500',
    badge: <Badge className="bg-yellow-100 text-yellow-800">Roles</Badge>,
    learnMoreUrl: 'https://www.hatsprotocol.xyz/',
  },
  {
    id: 'Hypercert' as AccessMethod,
    name: 'Hypercerts',
    icon: <span className="text-lg">🏆</span>,
    color: 'bg-green-500',
    badge: <Badge className="bg-green-100 text-green-800">Impact</Badge>,
    learnMoreUrl: 'https://hypercerts.org/',
  },
  {
    id: 'Unlock' as AccessMethod,
    name: 'Unlock Protocol',
    icon: <span className="text-lg">🔓</span>,
    color: 'bg-blue-500',
    badge: <Badge className="bg-blue-100 text-blue-800">Subscription</Badge>,
    learnMoreUrl: 'https://unlock-protocol.com/',
  },
];

export const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
  onConfigChange,
  initialConfig,
  className,
  forceMobile = false,
  forceDesktop = false,
  showViewToggle = true,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<AccessMethod>(
    initialConfig?.method || 'Allowlist'
  );
  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>(
    'auto'
  );
  const [expandedConfig, setExpandedConfig] = useState<string | null>(
    initialConfig?.method || null
  );

  const { isMobile } = useResponsive();

  // Determine actual view mode
  const actualViewMode =
    forceMobile || (viewMode === 'auto' && isMobile) || viewMode === 'mobile'
      ? 'mobile'
      : 'desktop';

  const handleMethodSelect = useCallback(
    (method: AccessMethod) => {
      setSelectedMethod(method);
      setExpandedConfig(method);
      onConfigChange({ method, ...initialConfig });
    },
    [onConfigChange, initialConfig]
  );

  const handleConfigUpdate = useCallback(
    (config: any) => {
      onConfigChange({
        method: selectedMethod,
        ...config,
      });
    },
    [selectedMethod, onConfigChange]
  );

  // Configuration Panel Component
  const ConfigurationPanel: React.FC<{
    method: AccessMethod;
    config?: Partial<ProtocolConfig>;
    onConfigChange: (config: ProtocolConfig) => void;
  }> = ({ method, config, onConfigChange }) => {
    switch (method) {
      case 'POAP':
        return (
          <div data-testid="poap-config">
            <p>POAP Configuration</p>
            <input
              data-testid="poap-event-id-input"
              placeholder="POAP Event ID"
              value={config?.eventId || ''}
              onChange={(e) =>
                onConfigChange({ method, eventId: e.target.value })
              }
            />
          </div>
        );
      case 'Unlock':
        return (
          <div data-testid="unlock-config">
            <p>Unlock Protocol Configuration</p>
            <input
              data-testid="unlock-lock-address-input"
              placeholder="Lock Address"
              value={config?.lockAddress || ''}
              onChange={(e) =>
                onConfigChange({ method, lockAddress: e.target.value })
              }
            />
          </div>
        );
      case 'Hats':
        return (
          <div data-testid="hats-config">
            <p>Hats Protocol Configuration</p>
            <input
              data-testid="hats-id-input"
              placeholder="Hat ID"
              value={config?.hatId || ''}
              onChange={(e) =>
                onConfigChange({ method, hatId: e.target.value })
              }
            />
          </div>
        );
      case 'Hypercert':
        return (
          <div data-testid="hypercert-config">
            <p>Hypercert Configuration</p>
            <input
              data-testid="hypercert-id-input"
              placeholder="Hypercert ID"
              value={config?.tokenId || ''}
              onChange={(e) =>
                onConfigChange({ method, tokenId: e.target.value })
              }
            />
          </div>
        );
      case 'NFT':
        return (
          <div data-testid="nft-config">
            <NFTSelector
              onSelect={(nft) => onConfigChange({ method, nftGate: nft })}
            />
          </div>
        );
      default:
        return (
          <div data-testid="allowlist-config">
            <p>Allowlist Configuration</p>
          </div>
        );
    }
  };

  if (actualViewMode === 'mobile') {
    return (
      <div className={cn('space-y-4', className)}>
        {showViewToggle && !forceMobile && (
          <div className="flex justify-end">
            <Tabs
              value={viewMode}
              onValueChange={(value) =>
                setViewMode(value as 'auto' | 'mobile' | 'desktop')
              }
              className="w-fit"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="auto" className="text-xs">
                  Auto
                </TabsTrigger>
                <TabsTrigger value="mobile" className="text-xs">
                  <Smartphone className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="desktop" className="text-xs">
                  <Monitor className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Mobile: Compact Selection Grid */}
        <div>
          <h3 className="font-medium text-sm mb-3">Choose Access Method</h3>
          <div className="grid grid-cols-3 gap-2">
            {ACCESS_METHODS.map((method) => (
              <Button
                key={method.id}
                variant={selectedMethod === method.id ? 'default' : 'outline'}
                onClick={() => handleMethodSelect(method.id)}
                className={cn(
                  'flex flex-col items-center gap-1 h-16 p-2 text-xs transition-all',
                  selectedMethod === method.id &&
                    'bg-[#ff5e14] border-[#ff5e14] text-white hover:bg-[#e5531b]'
                )}
              >
                <span className="text-base">{method.icon}</span>
                <span className="text-[10px] leading-tight text-center">
                  {method.name}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile: Configuration Accordion */}
        {selectedMethod && (
          <Accordion
            type="single"
            collapsible
            value={expandedConfig || ''}
            onValueChange={setExpandedConfig}
          >
            <AccordionItem value={selectedMethod}>
              <Card
                className="border-l-4"
                style={{
                  borderLeftColor:
                    ACCESS_METHODS.find(
                      (m) => m.id === selectedMethod
                    )?.color.replace('bg-', '#') || '#666',
                }}
              >
                <AccordionTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-6 h-6 rounded flex items-center justify-center text-white text-sm',
                            ACCESS_METHODS.find((m) => m.id === selectedMethod)
                              ?.color
                          )}
                        >
                          {
                            ACCESS_METHODS.find((m) => m.id === selectedMethod)
                              ?.icon
                          }
                        </div>
                        <div className="text-left flex-1">
                          <h4 className="font-medium text-[#3c2a14] text-sm">
                            Configure{' '}
                            {
                              ACCESS_METHODS.find(
                                (m) => m.id === selectedMethod
                              )?.name
                            }
                          </h4>
                          <p className="text-xs text-[#8b7355]">
                            Set up access requirements
                          </p>
                        </div>
                        <a
                          href={
                            ACCESS_METHODS.find((m) => m.id === selectedMethod)
                              ?.learnMoreUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#ff5e14] hover:text-[#e5531b] underline"
                        >
                          Learn More
                        </a>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>

                <AccordionContent>
                  <CardContent className="pt-0 border-t">
                    <div className="pt-4">
                      <ConfigurationPanel
                        method={selectedMethod}
                        config={initialConfig}
                        onConfigChange={handleConfigUpdate}
                      />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with optional view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#3c2a14]">
            Access Control Method
          </h2>
          <p className="text-sm text-[#8b7355] mt-1">
            Choose how users will prove eligibility to access this jar
          </p>
        </div>
        {showViewToggle && !forceDesktop && (
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              setViewMode(value as 'auto' | 'mobile' | 'desktop')
            }
            className="w-fit"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="auto" className="text-xs">
                Auto
              </TabsTrigger>
              <TabsTrigger value="mobile" className="text-xs">
                <Smartphone className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="desktop" className="text-xs">
                <Monitor className="h-3 w-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Method Selection Grid */}
      <div
        data-testid="method-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {ACCESS_METHODS.map((method) => (
          <Card
            key={method.id}
            data-testid={`method-${method.id.toLowerCase()}`}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-lg',
              selectedMethod === method.id
                ? 'ring-2 ring-[#ff5e14] bg-orange-50'
                : 'hover:shadow-md'
            )}
            onClick={() => handleMethodSelect(method.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={cn('p-2 rounded-lg text-white', method.color)}>
                  {method.icon}
                </div>
                {method.badge}
              </div>
              <CardTitle className="text-lg font-semibold mt-2 text-[#3c2a14]">
                {method.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <p className="text-sm text-[#8b7355]">Click to configure</p>
                <a
                  href={method.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#ff5e14] hover:text-[#e5531b] underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Learn More
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Panel */}
      <div data-testid="config-panel">
        <h3>Configuration for {selectedMethod}</h3>
        <ConfigurationPanel
          method={selectedMethod}
          config={initialConfig}
          onConfigChange={handleConfigUpdate}
        />
      </div>

      {/* Configuration Summary */}
      <div data-testid="config-summary">
        <h3>Configuration Summary</h3>
        <p data-testid="selected-method">Method: {selectedMethod}</p>
      </div>
    </div>
  );
};

// Configuration Panel Component
const _ConfigurationPanel: React.FC<{
  method: AccessMethod;
  config?: any;
  onConfigChange: (config: any) => void;
}> = ({ method, config, onConfigChange }) => {
  switch (method) {
    case 'Allowlist':
      return (
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#3c2a14]">
              Allowlist Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#8b7355]">
              No additional configuration needed for Allowlist. Access is
              determined by a separate allowlist management system.
            </p>
          </CardContent>
        </Card>
      );

    case 'NFT':
      return (
        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#3c2a14]">
              NFT Collection Gate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NFTSelector
              onSelect={(nft) => onConfigChange({ nftGates: [nft] })}
              selectedNFT={config?.nftGates?.[0]}
              userCollectionOnly={false}
              maxHeight="300px"
              cardSize="sm"
            />
          </CardContent>
        </Card>
      );

    case 'POAP':
      return (
        <POAPConfig onConfigChange={onConfigChange} initialConfig={config} />
      );

    case 'Hats':
      return (
        <HatsConfig onConfigChange={onConfigChange} initialConfig={config} />
      );

    case 'Hypercert':
      return (
        <HypercertConfig
          onConfigChange={onConfigChange}
          initialConfig={config}
        />
      );

    case 'Unlock':
      return (
        <UnlockConfig onConfigChange={onConfigChange} initialConfig={config} />
      );

    default:
      return null;
  }
};

export default ProtocolSelector;
