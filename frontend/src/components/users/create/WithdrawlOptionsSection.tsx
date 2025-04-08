// src/components/CookieJar/WithdrawalOptionsSection.tsx
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { parseEther } from "viem";
export enum WithdrawalTypeOptions {
  Fixed = 0,
  Variable = 1,
}
interface WithdrawalOptionsSectionProps {
  withdrawalOption: WithdrawalTypeOptions;
  setWithdrawalOption: (option: WithdrawalTypeOptions) => void;
  fixedAmount: string;
  setFixedAmount: (amount: string) => void;
  maxWithdrawal: string;
  setMaxWithdrawal: (amount: string) => void;
  withdrawalInterval: string;
  setWithdrawalInterval: (interval: string) => void;
  supportedCurrency: `0x${string}`;
}

export const WithdrawalOptionsSection: React.FC<
  WithdrawalOptionsSectionProps
> = ({
  withdrawalOption,
  setWithdrawalOption,
  fixedAmount,
  setFixedAmount,
  maxWithdrawal,
  setMaxWithdrawal,
  withdrawalInterval,
  setWithdrawalInterval,
  supportedCurrency,
}) => {
  // Check if currency is ETH (address 3)
  const isEthCurrency =
    supportedCurrency === "0x0000000000000000000000000000000000000003";

  // Helper to format placeholder and description based on currency type
  const getAmountPlaceholder = isEthCurrency ? "0.1 ETH" : "1000 tokens";
  const getAmountDescription = isEthCurrency
    ? "Fixed withdrawal amount in ETH (will be converted to wei)"
    : "Fixed withdrawal amount in token units";

  const getMaxWithdrawalDescription = isEthCurrency
    ? "Maximum withdrawal amount in ETH (will be converted to wei)"
    : "Maximum withdrawal amount in token units";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="withdrawalOption">Withdrawal Option</Label>
        <Select
          value={withdrawalOption.toString()}
          onValueChange={(value) =>
            setWithdrawalOption(Number(value) as WithdrawalTypeOptions)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select withdrawal option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Fixed</SelectItem>
            <SelectItem value="1">Variable</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          How withdrawals will be handled
        </p>
      </div>

      {/* Fixed Amount (show if Fixed is selected) */}
      {withdrawalOption === WithdrawalTypeOptions.Fixed && (
        <div className="space-y-2">
          <Label htmlFor="fixedAmount">Fixed Amount</Label>
          <Input
            id="fixedAmount"
            type="text"
            placeholder={getAmountPlaceholder}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {getAmountDescription}
          </p>
        </div>
      )}

      {/* Max Withdrawal (show if Variable is selected) */}
      {withdrawalOption === WithdrawalTypeOptions.Variable && (
        <div className="space-y-2">
          <Label htmlFor="maxWithdrawal">Maximum Withdrawal</Label>
          <Input
            id="maxWithdrawal"
            type="text"
            placeholder={getAmountPlaceholder}
            value={maxWithdrawal}
            onChange={(e) => setMaxWithdrawal(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {getMaxWithdrawalDescription}
          </p>
        </div>
      )}

      {/* Withdrawal Interval */}
      <div className="space-y-2">
        <Label htmlFor="withdrawalInterval">Withdrawal Interval (days)</Label>
        <Input
          id="withdrawalInterval"
          type="number"
          placeholder="1"
          value={(Number(withdrawalInterval) / 86400).toString()}
          onChange={(e) => {
            const days = parseFloat(e.target.value);
            const seconds = isNaN(days) ? "" : (days * 86400).toString();
            setWithdrawalInterval(seconds);
          }}
        />
        <p className="text-sm text-muted-foreground">
          Time between allowed withdrawals 
        </p>
      </div>
    </>
  );
};
