// src/components/CookieJar/CreateCookieJarForm.tsx
"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useWriteCookieJarFactoryCreateCookieJar } from "../../generated";
import { useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusAlert } from "../../components/users/create/StatusAlert";
import { JarOwnerSection } from "../../components/users/create/JarOwnerSection";
import { SupportedCurrencySection } from "../../components/users/create/SupportedCurrencySection";
import { AccessTypeSection } from "../../components/users/create/AccessTypeSection";
import { WithdrawalOptionsSection } from "../../components/users/create/WithdrawlOptionsSection";
import { JarFeaturesSection } from "../../components/users/create/JarFeaturesSection";
import { MetadataSection } from "../../components/users/create/MetadataSection";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Enums matching the contract
export enum AccessType {
  Whitelist = 0,
  NFTGated = 1,
}

export enum WithdrawalTypeOptions {
  Fixed = 0,
  Variable = 1,
}

export enum NFTType {
  ERC721 = 0,
  ERC1155 = 1,
  Soulbound = 2,
}

// Known address constants
const ETH_ADDRESS = "0x0000000000000000000000000000000000000003";

const CreateCookieJarForm: React.FC = () => {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [jarOwnerAddress, setJarOwnerAddress] = useState<`0x${string}`>(
    "0x0000000000000000000000000000000000000000"
  );
  const [supportedCurrency, setSupportedCurrency] = useState<`0x${string}`>(ETH_ADDRESS);
  const [accessType, setAccessType] = useState<AccessType>(AccessType.Whitelist);
  const [withdrawalOption, setWithdrawalOption] = useState<WithdrawalTypeOptions>(WithdrawalTypeOptions.Fixed);
  const [fixedAmount, setFixedAmount] = useState("0");
  const [maxWithdrawal, setMaxWithdrawal] = useState("0");
  const [withdrawalInterval, setWithdrawalInterval] = useState("0");
  const [strictPurpose, setStrictPurpose] = useState(false);
  const [emergencyWithdrawalEnabled, setEmergencyWithdrawalEnabled] = useState(true);
  const [oneTimeWithdrawal, setOneTimeWithdrawal] = useState(false);
  const [metadata, setMetadata] = useState("");
  const { isConnected } = useAccount();

  // NFT management
  const [nftAddresses, setNftAddresses] = useState<string[]>([]);
  const [nftTypes, setNftTypes] = useState<number[]>([]);

  // Contract write hook
  const {
    writeContract: createCookieJar,
    data: txHash,
    isPending: isCreating,
    isSuccess: isSubmitted,
    error: createError,
  } = useWriteCookieJarFactoryCreateCookieJar();

  // Transaction receipt hook
  const {
    data: receipt,
    isLoading: isWaitingForReceipt,
    isSuccess: txConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // Determine if we're using ETH or a token
  const isEthCurrency = supportedCurrency === ETH_ADDRESS;

  // Parse amount based on currency type
  const parseAmount = (amountStr: string): bigint => {
    if (!amountStr || amountStr === "0") return BigInt(0);
    
    try {
      if (isEthCurrency) {
        // For ETH, convert from ETH to wei
        return parseEther(amountStr);
      } else {
        // For tokens, use the raw value (assuming it's already in the smallest unit)
        return BigInt(amountStr);
      }
    } catch (error) {
      console.error("Error parsing amount:", error);
      return BigInt(0);
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(() => {
      // Only use NFT addresses if access type is TokenGated
      const effectiveNftAddresses =
        accessType === AccessType.NFTGated ? nftAddresses : [];
      const effectiveNftTypes =
        accessType === AccessType.NFTGated ? nftTypes : [];

      try {
        createCookieJar({
          args: [
            jarOwnerAddress,
            supportedCurrency,
            accessType,
            effectiveNftAddresses as readonly `0x${string}`[],
            effectiveNftTypes,
            withdrawalOption,
            parseAmount(fixedAmount),
            parseAmount(maxWithdrawal),
            BigInt(withdrawalInterval || "0"),
            strictPurpose,
            emergencyWithdrawalEnabled,
            oneTimeWithdrawal,
            metadata,
          ],
        });
      } catch (error) {
        console.error("Error creating cookie jar:", error);
      }
    });
  };

  // Reset form after submission
  const resetForm = () => {
    setJarOwnerAddress("0x0000000000000000000000000000000000000000");
    setSupportedCurrency(ETH_ADDRESS);
    setAccessType(AccessType.Whitelist);
    setWithdrawalOption(WithdrawalTypeOptions.Fixed);
    setFixedAmount("0");
    setMaxWithdrawal("0");
    setWithdrawalInterval("0");
    setStrictPurpose(false);
    setEmergencyWithdrawalEnabled(true);
    setOneTimeWithdrawal(false);
    setMetadata("");
    setNftAddresses([]);
    setNftTypes([]);
  };

  // Display success when transaction is confirmed
  useEffect(() => {
    if (txConfirmed && receipt) {
      // Reset form after successful creation
      resetForm();
    }
  }, [txConfirmed, receipt]);

  // Show error if transaction fails
  useEffect(() => {
    if (createError) {
      console.error("Transaction error:", createError);
      alert(`Transaction failed: ${createError.message}`);
    }
  }, [createError]);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Cookie Jar</CardTitle>
        <CardDescription>
          Configure and deploy a new cookie jar onchain
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <JarOwnerSection 
            jarOwnerAddress={jarOwnerAddress} 
            setJarOwnerAddress={setJarOwnerAddress} 
          />
          
          <SupportedCurrencySection 
            supportedCurrency={supportedCurrency} 
            setSupportedCurrency={setSupportedCurrency} 
          />
          
          <AccessTypeSection 
            accessType={accessType} 
            setAccessType={setAccessType} 
            nftAddresses={nftAddresses}
            setNftAddresses={setNftAddresses}
            nftTypes={nftTypes}
            setNftTypes={setNftTypes}
          />
          
          <WithdrawalOptionsSection 
            withdrawalOption={withdrawalOption} 
            setWithdrawalOption={setWithdrawalOption} 
            fixedAmount={fixedAmount} 
            setFixedAmount={setFixedAmount} 
            maxWithdrawal={maxWithdrawal} 
            setMaxWithdrawal={setMaxWithdrawal} 
            withdrawalInterval={withdrawalInterval} 
            setWithdrawalInterval={setWithdrawalInterval}
            supportedCurrency={supportedCurrency}
          />
          
          <JarFeaturesSection 
            strictPurpose={strictPurpose} 
            setStrictPurpose={setStrictPurpose} 
            emergencyWithdrawalEnabled={emergencyWithdrawalEnabled} 
            setEmergencyWithdrawalEnabled={setEmergencyWithdrawalEnabled} 
            oneTimeWithdrawal={oneTimeWithdrawal} 
            setOneTimeWithdrawal={setOneTimeWithdrawal} 
          />
          
          <MetadataSection 
            metadata={metadata} 
            setMetadata={setMetadata} 
          />

          {/* Transaction status alerts */}
          <StatusAlert 
            isSubmitted={isSubmitted} 
            txConfirmed={txConfirmed} 
          />

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || isCreating || isWaitingForReceipt}
          >
            {(isPending || isCreating || isWaitingForReceipt) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isCreating
              ? "Creating..."
              : isWaitingForReceipt
                ? "Confirming..."
                : "Create Cookie Jar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateCookieJarForm;