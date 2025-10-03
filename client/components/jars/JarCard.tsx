"use client";

import {
  Card,
  CardContent,
  2_CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  ImageIcon, 
  Crown,
  Award,
  Key,
  ExternalLink
} from "lucide-react";
import { 
  isNFTAccess, 
  isProtocolAccess, 
  getAccessTypeName,
  ACCESS_TYPES 
} from "@/lib/jar/access-types";
import { JarImage } from "./JarImage";
import Image from "next/image";
import { JarStatusBadge } from "./JarStatusBadge";
import {
  JarData,
  getCurrencyAmount,
  getCurrencySymbol,
  getWithdrawalAmountDisplay,
  getJarName,
} from "@/lib/jar/utils";
import type { NativeCurrency } from "@/config/supported-networks";

// Enhanced NFT gate interface
interface NFTGate {
  address: string;
  name?: string;
  image?: string;
  verified?: boolean;
  tokenType: 'ERC721' | 'ERC1155';
}

// Enhanced jar data with protocol-specific info
interface EnhancedJarData extends JarData {
  // Don't override accessType - it's already defined in JarData as required
  // NFT-specific
  nftGates?: NFTGate[];
  userOwnsRequiredNFT?: boolean;
  // POAP-specific
  poapEventId?: string;
  poapEventName?: string;
  userHasPOAP?: boolean;
  // Hats-specific
  hatId?: string;
  hatName?: string;
  userWearingHat?: boolean;
  // Unlock-specific
  unlockLockAddress?: string;
  unlockLockName?: string;
  userHasValidKey?: boolean;
  // Hypercert-specific
  hypercertContract?: string;
  hypercertTokenId?: string;
  hypercertName?: string;
  userHasHypercert?: boolean;
}

interface JarCardProps {
  jar: EnhancedJarData;
  nativeCurrency: NativeCurrency;
  tokenSymbols: Record<string, string>;
  onClick: (12_jarAddress: string) => void;
  className?: string;
}

// Protocol icons mapping
const getProtocolIcon = (accessType: number) => {
  switch (accessType) {
    case ACCESS_TYPES.NFT_GATED:
      return <ImageIcon className="h-3 w-3" />;
    case ACCESS_TYPES.POAP:
      return <Award className="h-3 w-3" />;
    case ACCESS_TYPES.HATS:
      return <Crown className="h-3 w-3" />;
    case ACCESS_TYPES.UNLOCK:
      return <Key className="h-3 w-3" />;
    case ACCESS_TYPES.HYPERCERT:
      return <Award className="h-3 w-3" />;
    default:
      return <Users className="h-3 w-3" />;
  }
};

// Get user access status
const getUserAccessStatus = (jar: EnhancedJarData) => {
  const accessType = jar.accessType;
  
  switch (accessType) {
    case ACCESS_TYPES.NFT_GATED:
      return {
        hasAccess: jar.userOwnsRequiredNFT ?? false,
        statusText: jar.userOwnsRequiredNFT ? 'You have access' : 'Requires NFT',
        statusColor: jar.userOwnsRequiredNFT ? 'text-green-600' : 'text-amber-600',
      };
    case ACCESS_TYPES.POAP:
      return {
        hasAccess: jar.userHasPOAP ?? false,
        statusText: jar.userHasPOAP ? 'You have POAP' : 'Requires POAP',
        statusColor: jar.userHasPOAP ? 'text-green-600' : 'text-amber-600',
      };
    case ACCESS_TYPES.HATS:
      return {
        hasAccess: jar.userWearingHat ?? false,
        statusText: jar.userWearingHat ? 'You wear hat' : 'Requires hat',
        statusColor: jar.userWearingHat ? 'text-green-600' : 'text-amber-600',
      };
    case ACCESS_TYPES.UNLOCK:
      return {
        hasAccess: jar.userHasValidKey ?? false,
        statusText: jar.userHasValidKey ? 'Valid membership' : 'Requires membership',
        statusColor: jar.userHasValidKey ? 'text-green-600' : 'text-amber-600',
      };
    case ACCESS_TYPES.HYPERCERT:
      return {
        hasAccess: jar.userHasHypercert ?? false,
        statusText: jar.userHasHypercert ? 'You have certificate' : 'Requires certificate',
        statusColor: jar.userHasHypercert ? 'text-green-600' : 'text-amber-600',
      };
    default:
      return {
        hasAccess: null, // Unknown for allowlist
        statusText: 'Allowlist access',
        statusColor: 'text-gray-600',
      };
  }
};

export function JarCard({
  jar,
  nativeCurrency,
  tokenSymbols,
  onClick,
  className,
}: JarCardProps) {
  const jarName = getJarName(jar);
  const accessTypeName = getAccessTypeName(jar.accessType);
  const userAccess = getUserAccessStatus(jar);

  const renderAccessIndicator = () => {
    const accessType = jar.accessType;
    const protocolIcon = getProtocolIcon(accessType);

    if (isNFTAccess(accessType)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                {protocolIcon}
                <span className="text-xs">{accessTypeName}</span>
                {userAccess.hasAccess && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2 max-w-xs">
                <p className="font-medium">NFT Access Required</p>
                {jar.nftGates?.length && (
                  <div className="space-y-1">
                    <p className="text-xs">Required NFTs:</p>
                    {jar.nftGates.slice(0, 3).map((gate, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {gate.image && (
                          <div className="relative w-4 h-4">
                            <Image src={gate.image} alt="" fill sizes="16px" className="rounded object-cover" />
                          </div>
                        )}
                        <span>{gate.name || `${gate.address.slice(0, 6)}...`}</span>
                        {gate.verified && <Shield className="h-3 w-3 text-green-500" />}
                        <Badge variant="outline" className="text-xs px-1">
                          {gate.tokenType}
                        </Badge>
                      </div>
                    ))}
                    {jar.nftGates.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{jar.nftGates.length - 3} more
                      </p>
                    )}
                  </div>
                )}
                <Badge 
                  className={`text-xs ${userAccess.hasAccess ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                >
                  {userAccess.statusText}
                </Badge>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (isProtocolAccess(accessType)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                {protocolIcon}
                <span className="text-xs">{accessTypeName}</span>
                {userAccess.hasAccess && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2 max-w-xs">
                <p className="font-medium">{accessTypeName} Access Required</p>
                
                {/* Protocol-specific details */}
                {accessType === ACCESS_TYPES.POAP && jar.poapEventName && (
                  <p className="text-xs">Event: {jar.poapEventName}</p>
                )}
                {accessType === ACCESS_TYPES.HATS && jar.hatName && (
                  <p className="text-xs">Hat: {jar.hatName}</p>
                )}
                {accessType === ACCESS_TYPES.UNLOCK && jar.unlockLockName && (
                  <p className="text-xs">Lock: {jar.unlockLockName}</p>
                )}
                {accessType === ACCESS_TYPES.HYPERCERT && jar.hypercertName && (
                  <p className="text-xs">Certificate: {jar.hypercertName}</p>
                )}
                
                <Badge 
                  className={`text-xs ${userAccess.hasAccess ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                >
                  {userAccess.statusText}
                </Badge>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {protocolIcon}
        <span className="text-xs">{accessTypeName}</span>
      </div>
    );
  };

  return (
    <Card
      className={`cj-card-primary hover:shadow-lg transition-all duration-200 cursor-pointer group transform hover:-translate-y-1 overflow-hidden p-0 ${className || ''}`}
      onClick={() => onClick(jar.jarAddress)}
    >
      <JarImage metadata={jar.metadata} jarName={jarName} />

      <CardHeader className="pb-3 px-6 pt-6">
        <CardTitle className="content-title text-[hsl(var(--cj-dark-brown))] group-hover:text-[hsl(var(--cj-brand-orange))] transition-colors">
          {jarName}
        </CardTitle>
        
        <div className="flex items-center justify-between mt-1">
          <div className="address-text-mobile text-[hsl(var(--cj-medium-brown))] truncate flex-1 min-w-0">
            {jar.jarAddress.slice(0, 6)}...{jar.jarAddress.slice(-4)}
          </div>
          <div className="flex items-center gap-2">
            {/* Access status indicator */}
            {userAccess.hasAccess !== null && (
              <Badge 
                variant="outline" 
                className={`text-xs px-1.5 py-0.5 ${userAccess.statusColor}`}
              >
                {userAccess.hasAccess ? '✓' : '○'}
              </Badge>
            )}
            <JarStatusBadge jarAddress={jar.jarAddress} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-6 pb-6">
        {/* Balance */}
        <div className="flex-between-safe">
          <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">
            Balance:
          </span>
          <span className="font-semibold text-[hsl(var(--cj-dark-brown))] text-responsive-sm truncate text-right">
            {getCurrencyAmount(jar)} {getCurrencySymbol(jar, nativeCurrency, tokenSymbols)}
          </span>
        </div>

        {/* Withdrawal */}
        <div className="flex-between-safe">
          <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">
            Withdrawal:
          </span>
          <span className="text-responsive-sm text-[hsl(var(--cj-dark-brown))] truncate text-right">
            {getWithdrawalAmountDisplay(jar, nativeCurrency, tokenSymbols)}
          </span>
        </div>

        {/* Access Control */}
        <div className="flex-between-safe">
          <span className="text-responsive-sm text-[hsl(var(--cj-medium-brown))] flex-shrink-0">
            Access:
          </span>
          <div className="flex items-center gap-1 min-w-0">
            {renderAccessIndicator()}
          </div>
        </div>

        {/* NFT Preview for NFT-gated jars */}
        {isNFTAccess(jar.accessType) && jar.nftGates?.length && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <div className="flex -space-x-1">
              {jar.nftGates.slice(0, 3).map((gate, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gray-100 border border-white flex-shrink-0 overflow-hidden"
                >
                  {gate.image ? (
                    <Image src={gate.image} alt="" fill sizes="24px" className="object-cover" />
                  ) : (
                    <ImageIcon className="w-full h-full p-1 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {jar.nftGates.length} collection{jar.nftGates.length !== 1 ? 's' : ''}
            </span>
            {jar.userOwnsRequiredNFT && (
              <Badge className="bg-green-100 text-green-800 text-xs px-2">
                ✓ Eligible
              </Badge>
            )}
          </div>
        )}

        {/* Protocol-specific preview */}
        {isProtocolAccess(jar.accessType) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {getProtocolIcon(jar.accessType)}
            <span className="text-xs text-muted-foreground">
              {accessTypeName} required
            </span>
            {userAccess.hasAccess && (
              <Badge className="bg-green-100 text-green-800 text-xs px-2">
                ✓ Eligible
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
