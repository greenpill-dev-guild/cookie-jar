// WhitelistWithdrawalSection.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WhitelistWithdrawalSectionProps {
  config: any; // Ideally this would be more specifically typed
  withdrawPurpose: string;
  setWithdrawPurpose: (value: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  handleWithdrawWhitelist: () => void;
  handleWithdrawWhitelistVariable: () => void;
}

export const WhitelistWithdrawalSection: React.FC<WhitelistWithdrawalSectionProps> = ({ 
  config, 
  withdrawPurpose, 
  setWithdrawPurpose, 
  withdrawAmount, 
  setWithdrawAmount,
  handleWithdrawWhitelist,
  handleWithdrawWhitelistVariable
}) => {
  // Fixed amount withdrawal with purpose
  if (config.strictPurpose && config.withdrawalOption === "FIXED") {
    return (
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Enter purpose"
          value={withdrawPurpose}
          onChange={(e) => setWithdrawPurpose(e.target.value)}
          className="w-full"
        />
        <Button onClick={handleWithdrawWhitelist} className="w-full">
          Withdraw with Purpose
        </Button>
      </div>
    );
  }
  
  // Fixed amount withdrawal without purpose
  if (!config.strictPurpose && config.withdrawalOption === "FIXED") {
    return (
      <div className="flex flex-col gap-4">
        <Button onClick={handleWithdrawWhitelist} className="w-full">
          Withdraw Whitelisted Mode
        </Button>
      </div>
    );
  }
  
  // Variable amount withdrawal with purpose
  if (config.strictPurpose && config.withdrawalOption === "Variable") {
    return (
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Enter Amount"
          value={withdrawAmount}
          onChange={(e) => {
            // Only allow numbers and decimal points
            const value = e.target.value;
            if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
              setWithdrawAmount(value);
            }
          }}
          className="w-full"
        />
        <Button onClick={handleWithdrawWhitelistVariable} className="w-full">
          Withdraw Whitelist Mode
        </Button>
      </div>
    );
  }
  
  return null;
};
