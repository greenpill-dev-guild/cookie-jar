
// FundingSection.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FundingSectionProps {
  amount: string;
  setAmount: (value: string) => void;
  onSubmit: (value: string) => void;
}

export const FundingSection: React.FC<FundingSectionProps> = ({ 
  amount, 
  setAmount, 
  onSubmit 
}) => {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <Input
        type="text"
        placeholder="Enter amount (in wei so it can handle both eth and currency deposits.)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full"
      />
      <Button onClick={() => onSubmit(amount)} className="w-full">
        Fund CookieJar with Currency
      </Button>
    </div>
  );
};