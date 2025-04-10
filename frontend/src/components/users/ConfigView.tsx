
// Main ConfigView component that uses all the above components
import React, { useState } from "react";
import {
  useWriteCookieJarWithdrawWhitelistMode,
  useWriteCookieJarWithdrawNftMode,
} from "../../generated";

import { ConfigDetailsSection } from "./ConfigDetailsSection";
import { FundingSection } from "./FundingSection";
import { WhitelistWithdrawalSection } from "./WhitelistWithdrawalSection";
import { NFTGatedWithdrawalSection } from "./NFTGatedWithdrawalSection";
import { WithdrawalHistorySection } from "./WithdrawlHistorySection";

interface ConfigViewProps {
  config: any; // Ideally this would be more specifically typed
  tokenAddress: string;
  setTokenAddress: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  onSubmit: (value: string) => void;
}

interface Withdrawal {
  amount: bigint;
  purpose: string;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  config,
  amount,
  tokenAddress,
  setTokenAddress,
  setAmount,
  onSubmit,
}) => {
  // State management
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>("");
  const [gateAddress, setGateAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");

  // Check conditions for showing different UI sections
  const showUserFunctionsWhitelisted =
    config?.whitelist === true && config?.accessType === "Whitelist";
  const showUserFunctionsNFTGated = config?.accessType === "NFTGated";

  // Contract hooks
  const {
    writeContract: withdrawWhitelistMode,
    data: withdrawWhitelistModeData,
    error: withdrawWhitelistModeError,
  } = useWriteCookieJarWithdrawWhitelistMode();

  const {
    writeContract: withdrawNFTMode,
    data: withdrawNFTModeData,
    error: withdrawNFTModeError,
  } = useWriteCookieJarWithdrawNftMode();

  // Handler functions
  const handleWithdrawWhitelist = () => {
    withdrawWhitelistMode({
      address: config.contractAddress,
      args: [config.fixedAmount, withdrawPurpose],
    });
  };

  const handleWithdrawWhitelistVariable = () => {
    withdrawWhitelistMode({
      address: config.contractAddress,
      args: [BigInt(withdrawAmount), withdrawPurpose],
    });
  };

  const handleWithdrawNFT = () => {
    withdrawNFTMode({
      address: config.contractAddress,
      args: [
        BigInt(config.fixedAmount),
        withdrawPurpose,
        gateAddress as `0x${string}`,
        BigInt(tokenId),
      ],
    });
  };

  const handleWithdrawNFTVariable = () => {
    withdrawNFTMode({
      address: config.contractAddress,
      args: [
        BigInt(withdrawAmount),
        withdrawPurpose,
        gateAddress as `0x${string}`,
        BigInt(tokenId),
      ],
    });
  };

  return (
    <>
      <ConfigDetailsSection config={config} />
      
      <div className="flex flex-col gap-4 mt-6">
        <FundingSection 
          amount={amount} 
          setAmount={setAmount} 
          onSubmit={onSubmit} 
        />
        
        {showUserFunctionsWhitelisted && (
          <WhitelistWithdrawalSection
            config={config}
            withdrawPurpose={withdrawPurpose}
            setWithdrawPurpose={setWithdrawPurpose}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            handleWithdrawWhitelist={handleWithdrawWhitelist}
            handleWithdrawWhitelistVariable={handleWithdrawWhitelistVariable}
          />
        )}
        
        {showUserFunctionsNFTGated && (
          <NFTGatedWithdrawalSection
            config={config}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            gateAddress={gateAddress}
            setGateAddress={setGateAddress}
            tokenId={tokenId}
            setTokenId={setTokenId}
            handleWithdrawNFT={handleWithdrawNFT}
            handleWithdrawNFTVariable={handleWithdrawNFTVariable}
          />
        )}
        
        <WithdrawalHistorySection pastWithdrawals={config.pastWithdrawals} />
      </div>
    </>
  );
};