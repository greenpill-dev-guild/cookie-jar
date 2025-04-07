// ConfigDetailsSection.tsx
import React from "react";
import { Separator } from "@/components/ui/separator";
import { ConfigItem } from "./ConfigItem";
import { formatEther } from "viem";
import { formatTime, formatValue, formatAddress } from "../../utils";

interface ConfigDetailsSectionProps {
  config: any; // Ideally this would be more specifically typed
}

export const ConfigDetailsSection: React.FC<ConfigDetailsSectionProps> = ({ config }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ConfigItem
        label="Access Type"
        value={formatValue(config.accessType)}
        highlight
      />
      <ConfigItem label="Admin" value={formatAddress(config.admin || "")} />
      <ConfigItem
        label="Withdrawal Option"
        value={formatValue(config.withdrawalOption)}
        highlight
      />
      <ConfigItem label="Fixed Amount" value={Number(config.fixedAmount)} />
      <ConfigItem
        label="Balance"
        value={formatValue(config.balance.toString())}
        highlight
      />
      <ConfigItem
        label="Currency"
        value={formatAddress(config.currency)}
        highlight
      />

      <Separator className="col-span-1 md:col-span-2 my-2" />
      <ConfigItem
        label="Max Withdrawal"
        value={
          config.maxWithdrawal
            ? formatEther(BigInt(config.maxWithdrawal))
            : "N/A"
        }
      />
      <ConfigItem
        label="Withdrawal Interval"
        value={formatTime(
          config.withdrawalInterval
            ? Number(config.withdrawalInterval)
            : undefined
        )}
      />
      <ConfigItem
        label="Strict Purpose"
        value={formatValue(config.strictPurpose)}
        boolean
      />
      <ConfigItem
        label="Emergency Withdrawal"
        value={formatValue(config.emergencyWithdrawalEnabled)}
        boolean
      />
      <ConfigItem
        label="One Time Withdrawal"
        value={formatValue(config.oneTimeWithdrawal)}
        boolean
      />
      <Separator className="col-span-1 md:col-span-2 my-2" />
      <ConfigItem
        label="Fee Collector"
        value={formatAddress(config.feeCollector || "")}
      />
      <ConfigItem
        label="Whitelisted"
        value={formatValue(config.whitelist)}
        boolean
      />
      <ConfigItem
        label="Blacklisted"
        value={formatValue(config.blacklist)}
        boolean
      />
      <ConfigItem
        label="Last Withdrawal Whitelist"
        value={formatValue(config.lastWithdrawalWhitelist?.toString())}
      />
      <ConfigItem
        label="Last Withdrawal NFT"
        value={formatValue(config.lastWithdrawalNft?.toString())}
      />
    </div>
  );
};
