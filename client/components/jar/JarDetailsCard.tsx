"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Users,
  Coins,
  Copy,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/app/utils";
import { formatJarBalance, copyToClipboard } from "@/lib/display/jar-display";
import type { JarMetadata } from "@/hooks/jar/useJarMetadata";
import type { JarPermissions } from "@/hooks/jar/useJarPermissions";

interface JarConfig {
  accessType?: string;
  withdrawalInterval?: bigint;
  withdrawalOption?: string;
  fixedAmount?: bigint;
  maxWithdrawal?: bigint;
  balance?: bigint;
  currency?: string;
  allowlist?: boolean;
  denylist?: boolean;
  strictPurpose?: boolean;
  emergencyWithdrawalEnabled?: boolean;
}

interface JarDetailsCardProps {
  addressString: string;
  chainId: number;
  metadata: JarMetadata;
  config: JarConfig;
  permissions: JarPermissions;
  tokenSymbol?: string;
  tokenDecimals: number;
  onEditClick: () => void;
  toast: any;
}

export function JarDetailsCard({
  addressString,
  chainId,
  metadata,
  config,
  permissions,
  tokenSymbol,
  tokenDecimals,
  onEditClick,
  toast,
}: JarDetailsCardProps) {
  const { isAdmin, isFeeCollector, showUserFunctions } = permissions;

  // Format balance for display
  const formattedBalance = formatJarBalance(
    config.balance,
    tokenDecimals,
    tokenSymbol,
    chainId
  );

  return (
    <Card className="shadow-lg bg-white border-none overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Jar Title and Description */}
          <div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {metadata.image && (
                  <img
                    src={metadata.image}
                    alt={metadata.name}
                    className="w-16 h-16 rounded-lg object-cover mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-[#1a1a1a]">
                    {metadata.name}
                  </h1>
                  {metadata.link && (
                    <a
                      href={metadata.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
                {metadata.description && (
                  <p className="text-[#4a3520] mt-1">
                    {metadata.description}
                  </p>
                )}
                {!metadata.description && (
                  <p className="text-[#4a3520] mt-1">
                    Shared Token Pool
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditClick}
                  className="ml-4 border-[#ff5e14] text-[#ff5e14] hover:bg-[#fff0e0]"
                >
                  Edit Info
                </Button>
              )}
            </div>
          </div>

          {/* SIMPLIFIED: Focus on 5 Essential Details Only */}
          <div className="bg-gradient-to-r from-[#fff8f0] to-white p-6 rounded-lg mb-4">
            {/* 1. BALANCE - Most Prominent */}
            <div className="text-center mb-6">
              <p className="text-[#4a3520] text-sm mb-1">Available Balance</p>
              <p className="text-[#ff5e14] font-bold text-3xl">
                {formattedBalance}
              </p>
            </div>

            {/* 2-5. Key Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* 2. Access Type */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#ff5e14]" />
                <div>
                  <p className="text-[#4a3520] font-medium">Access</p>
                  <p className="text-[#1a1a1a]">{config.accessType}</p>
                </div>
              </div>

              {/* 3. Your Status */}
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#ff5e14]" />
                <div>
                  <p className="text-[#4a3520] font-medium">Status</p>
                  <p className={`font-medium ${config.denylist ? "text-red-600" : config.allowlist ? "text-green-600" : "text-red-600"}`}>
                    {config.denylist ? "Denied" : config.allowlist ? "Authorized" : "Not Authorized"}
                  </p>
                </div>
              </div>

              {/* 4. Withdrawal Rules - Simplified */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#ff5e14]" />
                <div>
                  <p className="text-[#4a3520] font-medium">Rules</p>
                  <p className="text-[#1a1a1a]">
                    {config.withdrawalOption === "Fixed" ? "Fixed Amount" : "Variable Amount"}
                  </p>
                </div>
              </div>

              {/* 5. Contract - Minimized */}
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-[#ff5e14]" />
                <div>
                  <p className="text-[#4a3520] font-medium">Contract</p>
                  <div className="flex items-center gap-1">
                    <p className="text-[#1a1a1a] font-mono text-xs">{formatAddress(addressString)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(addressString, toast)}
                      className="h-5 w-5 text-[#ff5e14] hover:bg-[#fff0e0] p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* User Status */}
            {(showUserFunctions || isAdmin || isFeeCollector) && (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-[#3c2a14] mb-2">
                  Your Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  {config.denylist ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 bg-[#ffebee] text-[#c62828] border-[#c62828] px-3 py-1"
                    >
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Denylisted
                    </Badge>
                  ) : (
                    showUserFunctions && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 bg-[#e6f7e6] text-[#2e7d32] border-[#2e7d32] px-3 py-1"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Allowlisted
                      </Badge>
                    )
                  )}
                  {isFeeCollector && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 bg-[#e3f2fd] text-[#1976d2] border-[#1976d2] px-3 py-1"
                    >
                      <Coins className="h-3 w-3 mr-1" />
                      Fee Collector
                    </Badge>
                  )}
                  {isAdmin && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 bg-[#fce4ec] text-[#c2185b] border-[#c2185b] px-3 py-1"
                    >
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export default JarDetailsCard;
