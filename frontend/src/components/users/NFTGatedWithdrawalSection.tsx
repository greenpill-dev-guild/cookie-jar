// NFTGatedWithdrawalSection.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NFTGatedWithdrawalSectionProps {
  config: any; // Ideally this would be more specifically typed
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  gateAddress: string;
  setGateAddress: (value: string) => void;
  tokenId: string;
  setTokenId: (value: string) => void;
  handleWithdrawNFT: () => void;
  handleWithdrawNFTVariable: () => void;
}

export const NFTGatedWithdrawalSection: React.FC<NFTGatedWithdrawalSectionProps> = ({
  config,
  withdrawAmount,
  setWithdrawAmount,
  gateAddress,
  setGateAddress,
  tokenId,
  setTokenId,
  handleWithdrawNFT,
  handleWithdrawNFTVariable
}) => {
  // Fixed amount NFT-gated withdrawal
  console.log("config")
  if ( config.withdrawalOption === "Fixed") {
    return (
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Enter GateAddress"
          value={gateAddress}
          onChange={(e) => setGateAddress(e.target.value)}
          className="w-full"
        />
        <Input
          type="text"
          placeholder="Enter TokenId"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          className="w-full"
        />
        <Button onClick={handleWithdrawNFT} className="w-full">
          Withdraw NFTGated Mode
        </Button>
      </div>
    );
  }
  
  // Variable amount NFT-gated withdrawal
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
        <Input
          type="text"
          placeholder="Enter GateAddress"
          value={gateAddress}
          onChange={(e) => setGateAddress(e.target.value)}
          className="w-full"
        />
        <Input
          type="text"
          placeholder="Enter TokenId"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          className="w-full"
        />
        <Button onClick={handleWithdrawNFTVariable} className="w-full">
          Withdraw NFTGated Mode
        </Button>
      </div>
    );
  }
  
  return null;
};
