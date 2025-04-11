// src/components/CookieJar/SupportedCurrencySection.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Known address constants
const ETH_ADDRESS = "0x0000000000000000000000000000000000000003";

interface SupportedCurrencySectionProps {
  supportedCurrency: `0x${string}`;
  setSupportedCurrency: (address: `0x${string}`) => void;
}

export const SupportedCurrencySection: React.FC<SupportedCurrencySectionProps> = ({ 
  supportedCurrency, 
  setSupportedCurrency 
}) => {
  const [currencyType, setCurrencyType] = React.useState<"eth" | "token">(
    supportedCurrency === ETH_ADDRESS ? "eth" : "token"
  );

  // Update currency type when the currency changes
  React.useEffect(() => {
    setCurrencyType(supportedCurrency === ETH_ADDRESS ? "eth" : "token");
  }, [supportedCurrency]);

  const handleCurrencyTypeChange = (value: string) => {
    if (value === "eth") {
      setSupportedCurrency(ETH_ADDRESS);
      setCurrencyType("eth");
    } else {
      setCurrencyType("token");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Currency Type</Label>
        <Select value={currencyType} onValueChange={handleCurrencyTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eth">ETH (Native)</SelectItem>
            <SelectItem value="token">ERC20 Token</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {currencyType === "token" && (
        <div className="space-y-2">
          <Label htmlFor="supportedCurrency">Token Contract Address</Label>
          <Input
            id="supportedCurrency"
            placeholder="0x..."
            value={supportedCurrency === ETH_ADDRESS ? "" : supportedCurrency}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith("0x") && value.length === 42) {
                setSupportedCurrency(value as `0x${string}`);
              } else {
                console.error("Invalid Token address");
              }
            }}
          />
          <p className="text-sm text-muted-foreground">
            Address of the ERC20 token contract
          </p>
        </div>
      )}

      <div className="mt-1">
        <p className="text-sm font-medium text-slate-700">
          {currencyType === "eth" 
            ? "Using Native ETH as currency" 
            : "Using ERC20 token as currency"}
        </p>
        <p className="text-xs text-muted-foreground">
          {currencyType === "eth"
            ? "Amount inputs will be in ETH and automatically converted to wei"
            : "Amount inputs should be in token's smallest unit (no decimal conversion)"}
        </p>
      </div>
    </div>
  );
};