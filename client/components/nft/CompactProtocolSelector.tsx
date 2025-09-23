import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/app/utils';

const PROTOCOLS = [
  {
    id: 'NFT',
    name: 'NFT',
    icon: '🖼️',
    description: 'Standard NFT collections (ERC721/ERC1155)',
    learnMoreUrl: 'https://ethereum.org/en/nft/',
    color: 'bg-purple-500',
  },
  {
    id: 'POAP',
    name: 'POAP',
    icon: '🏅',
    description: 'Proof of Attendance Protocol badges',
    learnMoreUrl: 'https://poap.xyz/',
    color: 'bg-yellow-500',
  },
  {
    id: 'HATS',
    name: 'Hats',
    icon: '👑',
    description: 'Organizational roles and permissions',
    learnMoreUrl: 'https://www.hatsprotocol.xyz/',
    color: 'bg-indigo-500',
  },
  {
    id: 'UNLOCK',
    name: 'Unlock',
    icon: '🗝️',
    description: 'Membership and subscription NFTs',
    learnMoreUrl: 'https://unlock-protocol.com/',
    color: 'bg-green-500',
  },
  {
    id: 'HYPERCERT',
    name: 'Hypercerts',
    icon: '🌱',
    description: 'Impact certificates for verified work',
    learnMoreUrl: 'https://hypercerts.org/',
    color: 'bg-emerald-500',
  },
] as const;

export interface CompactProtocolConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  learnMoreUrl: string;
  color: string;
}

interface CompactProtocolSelectorProps {
  selectedProtocols: string[];
  onProtocolToggle: (protocolId: string) => void;
  className?: string;
  mobile?: boolean;
  disabled?: boolean;
  maxSelections?: number;
}

export function CompactProtocolSelector({
  selectedProtocols,
  onProtocolToggle,
  className,
  mobile = false,
  disabled = false,
  maxSelections,
}: CompactProtocolSelectorProps) {
  const handleProtocolClick = (protocolId: string) => {
    if (disabled) return;
    
    // Check max selections when adding
    if (!selectedProtocols.includes(protocolId) && maxSelections) {
      if (selectedProtocols.length >= maxSelections) {
        return; // Don't add if at max
      }
    }
    
    onProtocolToggle(protocolId);
  };

  if (mobile) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {PROTOCOLS.map((protocol) => {
          const isSelected = selectedProtocols.includes(protocol.id);
          const canToggle = !disabled && (!maxSelections || isSelected || selectedProtocols.length < maxSelections);
          
          return (
            <TooltipProvider key={protocol.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleProtocolClick(protocol.id)}
                    disabled={!canToggle}
                    className={cn(
                      "flex items-center gap-1 h-8 text-xs transition-all",
                      isSelected && "bg-[#ff5e14] border-[#ff5e14] text-white hover:bg-[#e5531b]",
                      !canToggle && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span>{protocol.icon}</span>
                    <span className="hidden sm:inline">{protocol.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{protocol.name}</span>
                      <a
                        href={protocol.learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {protocol.description}
                    </p>
                    {maxSelections && (
                      <p className="text-xs text-muted-foreground">
                        {selectedProtocols.length}/{maxSelections} selected
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3", className)}>
      {PROTOCOLS.map((protocol) => {
        const isSelected = selectedProtocols.includes(protocol.id);
        const canToggle = !disabled && (!maxSelections || isSelected || selectedProtocols.length < maxSelections);
        
        return (
          <TooltipProvider key={protocol.id}>
            <div
              className={cn(
                "relative p-3 border rounded-lg cursor-pointer transition-all",
                isSelected 
                  ? "border-[#ff5e14] bg-orange-50" 
                  : "border-gray-200 hover:border-gray-300",
                !canToggle && "opacity-50 cursor-not-allowed",
                canToggle && "hover:shadow-sm"
              )}
              onClick={() => canToggle && handleProtocolClick(protocol.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", protocol.color)}>
                  <span>{protocol.icon}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={protocol.learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Learn more about {protocol.name}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <h3 className="font-medium text-sm text-[#3c2a14] mb-1">{protocol.name}</h3>
              <p className="text-xs text-[#8b7355] line-clamp-2">
                {protocol.description}
              </p>
              
              {isSelected && (
                <Badge className="absolute top-2 right-8 bg-[#ff5e14] text-white text-xs">
                  Selected
                </Badge>
              )}

              {/* Max selections indicator */}
              {maxSelections && selectedProtocols.length > 0 && (
                <div className="absolute bottom-2 right-2">
                  <span className="text-xs text-[#8b7355]">
                    {selectedProtocols.length}/{maxSelections}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>
        );
      })}

      {/* Selection summary for desktop */}
      {maxSelections && selectedProtocols.length > 0 && (
        <div className="col-span-full">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-[#3c2a14]">
                {selectedProtocols.length} protocol{selectedProtocols.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedProtocols.map(protocolId => {
                const protocol = PROTOCOLS.find(p => p.id === protocolId);
                return protocol ? (
                  <Badge key={protocolId} variant="secondary" className="text-xs">
                    {protocol.icon} {protocol.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export protocol constants for use elsewhere
export { PROTOCOLS };
