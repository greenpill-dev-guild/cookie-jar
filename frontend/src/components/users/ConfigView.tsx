import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatEther, parseEther } from "viem";
import { ConfigItem } from "./ConfigItem";
import { formatTime, formatValue, formatAddress } from "../../utils";
import {
  useWriteCookieJarWithdrawWhitelistMode,
  useWriteCookieJarWithdrawNftMode,
} from "../../generated";

interface ConfigViewProps {
  config: any;
  amount: string;

  setAmount: (value: string) => void;
  onSubmit: (value: string) => void;
}
type Withdrawal = {
  amount: bigint;
  purpose: string;
};
export const ConfigView: React.FC<ConfigViewProps> = ({
  config,
  amount,
  setAmount,
  onSubmit,
}) => {
  // Check if the current CookieJar is whitelisted and access type is whitelisted
  const showUserFunctionsWhitelisted =
    config?.whitelist === true && config?.accessType === "Whitelist";

  const showUserFunctionsNFTGated = config?.accessType === "";

  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>("");
  const [gateAddress, setGateAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");

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

  // Handle number input validation for withdrawal amount
  const handleWithdrawAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Only allow numbers and decimal points
    const value = e.target.value;
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWithdrawAmount(value);
    }
  };

  // Handle withdrawal with proper state value for purpose
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
      <div className="flex flex-col gap-4 mt-6">
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
        FIXED WITHDRAWALS
        {showUserFunctionsWhitelisted &&
          config.strictPurpose &&
          config.withdrawalOption == "FIXED" && (
            <>
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
            </>
          )}
        {showUserFunctionsWhitelisted &&
          !config.strictPurpose &&
          config.withdrawalOption == "FIXED" && (
            <>
              <Button onClick={handleWithdrawWhitelist} className="w-full">
                Withdraw Whitelisted Mode
              </Button>
            </>
          )}
        {showUserFunctionsNFTGated &&
          config.strictPurpose &&
          config.withdrawalOption == "FIXED" && (
            <>
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
            </>
          )}
        <>
          VARIABLE WITHDRAWALS
          {showUserFunctionsWhitelisted &&
            config.strictPurpose &&
            config.withdrawalOption == "Variable" && (
              <>
                <Input
                  type="text"
                  placeholder="Enter Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full"
                />
                <Button
                  onClick={handleWithdrawWhitelistVariable}
                  className="w-full"
                >
                  Withdraw Whitelist Mode
                </Button>
              </>
            )}
          {showUserFunctionsNFTGated &&
            config.strictPurpose &&
            config.withdrawalOption == "Variable" && (
              <>
                <Input
                  type="text"
                  placeholder="Enter Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
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
              </>
            )}
          <h1>Past Withdrawals from this Jar</h1>
          <ul>
            {config.pastWithdrawals.map(
              (withdrawal: Withdrawal, index: number) => (
                <li key={index} className="border p-2 mb-2 rounded">
                  <p>
                    <strong>Amount:</strong> {withdrawal.amount.toString()}
                  </p>
                  <p>
                    <strong>Purpose:</strong> {withdrawal.purpose}
                  </p>
                </li>
              )
            )}
          </ul>
        </>
      </div>
    </>
  );
};
