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
  ArrowUpToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAddress } from "@/lib/app/utils";
import { getExplorerAddressUrl } from "@/lib/network/utils";
import { formatUnits } from "viem";
import { formatTimeComponents, formatTimeString } from "@/lib/display/time";
import { formatJarBalance, copyToClipboard } from "@/lib/display/jar-display";
import { getNativeCurrency } from "@/config/supported-networks";
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
  const nativeCurrency = getNativeCurrency(chainId);
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

          <Separator className="my-2" />

          {/* Jar Details - Key Value Pairs */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-[#4a3520] font-medium">
                Contract Address
              </span>
              <div className="flex items-center">
                <span className="text-[#1a1a1a] font-medium mr-2">
                  {formatAddress(addressString)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(addressString, toast)}
                  className="h-7 w-7 text-[#ff5e14] hover:text-[#ff5e14] hover:bg-[#fff0e0]"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#ff5e14] hover:text-[#ff5e14] hover:bg-[#fff0e0]"
                  asChild
                >
                  <a
                    href={getExplorerAddressUrl(addressString, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-2">
              <span className="text-[#4a3520] font-medium">
                Access Type
              </span>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-[#ff5e14] mr-2" />
                <span className="text-[#1a1a1a] font-medium">
                  {config.accessType}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-2">
              <span className="text-[#4a3520] font-medium">
                Cooldown Period
              </span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-[#ff5e14] mr-2" />
                <span className="text-[#1a1a1a] font-medium">
                  {config.withdrawalInterval
                    ? (() => {
                        const seconds = Number(config.withdrawalInterval);
                        const {
                          days,
                          hours,
                          minutes,
                          seconds: secs,
                        } = formatTimeComponents(seconds);
                        return formatTimeString(days, hours, minutes, secs);
                      })()
                    : "N/A"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-2">
              <span className="text-[#4a3520] font-medium">
                {config.withdrawalOption === "Fixed"
                  ? "Fixed Amount"
                  : "Max Withdrawal"}
              </span>
              <div className="flex items-center">
                <ArrowUpToLine className="h-4 w-4 text-[#ff5e14] mr-2" />
                <span className="text-[#1a1a1a] font-medium">
                  {config.withdrawalOption === "Fixed"
                    ? config.fixedAmount
                      ? config.currency ===
                        "0x0000000000000000000000000000000000000003"
                        ? Number(
                            formatUnits(config.fixedAmount, 18),
                          ).toFixed(4) +
                          " " +
                          nativeCurrency.symbol
                        : Number(
                            formatUnits(
                              config.fixedAmount,
                              tokenDecimals,
                            ),
                          ).toFixed(4) +
                          " " +
                          tokenSymbol
                      : "N/A"
                    : config.maxWithdrawal
                      ? config.currency ===
                        "0x0000000000000000000000000000000000000003"
                        ? Number(
                            formatUnits(config.maxWithdrawal, 18),
                          ).toFixed(4) +
                          " " +
                          nativeCurrency.symbol
                        : Number(
                            formatUnits(
                              config.maxWithdrawal,
                              tokenDecimals,
                            ),
                          ).toFixed(4) +
                          " " +
                          tokenSymbol
                      : "N/A"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center py-2">
              <span className="text-[#4a3520] font-medium">
                Current Balance
              </span>
              <span className="text-[#ff5e14] font-bold text-xl">
                {formattedBalance}
              </span>
            </div>

            <Separator />

            {/* Add Allowlist Status indicator */}
            <div className="flex justify-between items-center py-2">
              <span className="text-[#4a3520] font-medium">
                Your Status
              </span>
              <div className="flex items-center">
                {config.denylist ? (
                  <span className="font-medium px-3 py-1 rounded-full text-white bg-red-500">
                    Denylisted
                  </span>
                ) : (
                  <span
                    className={`font-medium px-3 py-1 rounded-full text-white ${config.allowlist ? "bg-green-500" : "bg-red-500"}`}
                  >
                    {config.allowlist
                      ? "Allowlisted"
                      : "Not Allowlisted"}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Feature boxes */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-[#f8f8f8] p-2 rounded-lg text-center">
                <p className="text-[#4a3520] text-sm mb-1">
                  Purpose Required
                </p>
                <p className="font-semibold text-[#1a1a1a]">
                  {config.strictPurpose ? "Yes" : "No"}
                </p>
              </div>

              <div className="bg-[#f8f8f8] p-2 rounded-lg text-center">
                <p className="text-[#4a3520] text-sm mb-1">
                  Fixed Amount
                </p>
                <p className="font-semibold text-[#1a1a1a]">
                  {config.withdrawalOption === "Fixed" ? "Yes" : "No"}
                  {config.withdrawalOption === "Fixed" &&
                    config.fixedAmount && (
                      <span className="block text-xs text-[#ff5e14]">
                        {config.currency ===
                        "0x0000000000000000000000000000000000000003"
                          ? Number(
                              formatUnits(
                                config.fixedAmount || BigInt(0),
                                18,
                              ),
                            ).toFixed(4) +
                            " " +
                            nativeCurrency.symbol
                          : Number(
                              formatUnits(
                                config.fixedAmount || BigInt(0),
                                tokenDecimals,
                              ),
                            ).toFixed(4) +
                            " " +
                            tokenSymbol}
                      </span>
                    )}
                </p>
              </div>

              <div className="bg-[#f8f8f8] p-2 rounded-lg text-center">
                <p className="text-[#4a3520] text-sm mb-1">
                  Emergency Withdrawal
                </p>
                <p className="font-semibold text-[#1a1a1a]">
                  {config.emergencyWithdrawalEnabled
                    ? "Enabled"
                    : "Disabled"}
                </p>
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
        </div>
      </CardContent>
    </Card>
  );
}
