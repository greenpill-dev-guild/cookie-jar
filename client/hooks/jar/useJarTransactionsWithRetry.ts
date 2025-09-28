"use client";

import { useState, useCallback, useEffect } from "react";
import { useChainId } from "wagmi";
import { parseUnits } from "viem";

import { useToast } from "@/hooks/app/useToast";
import { useTransactionWithRetry } from "@/hooks/app/useTransactionWithRetry";
import { useMultipleTokenSymbols } from "@/hooks/blockchain/useMultipleTokenSymbols";
import { useMultipleTokenDecimals } from "@/hooks/blockchain/useMultipleTokenDecimals";
import { cookieJarAbi } from "@/generated";
import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";
import { isV2Chain } from "@/config/supported-networks";

export interface JarConfig {
  contractAddress?: `0x${string}`;
  currency?: string;
  fixedAmount?: bigint;
}

interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Enhanced jar transactions hook with built-in retry logic
 * 
 * Features:
 * - Automatic retry on network/RPC failures
 * - Smart error categorization
 * - User-friendly error messages
 * - Progress tracking for multi-step transactions
 * 
 * @param config Jar configuration
 * @param addressString Jar contract address
 * @param options Transaction retry options
 */
export const useJarTransactionsWithRetry = (
  config: JarConfig | undefined,
  addressString: `0x${string}`,
  options: TransactionOptions = {}
) => {
  const { toast } = useToast();
  const chainId = useChainId();
  
  // Transaction state
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPurpose, setWithdrawPurpose] = useState("");
  const [pendingDepositAmount, setPendingDepositAmount] = useState(BigInt(0));
  const [approvalCompleted, setApprovalCompleted] = useState(false);

  // Multi-step transaction tracking
  const [transactionStep, setTransactionStep] = useState<
    "idle" | "approving" | "depositing" | "withdrawing"
  >("idle");

  // Get token info
  const tokenAddresses = config?.currency && config.currency !== ETH_ADDRESS 
    ? [config.currency as `0x${string}`]
    : [];
  
  const { data: tokenSymbols } = useMultipleTokenSymbols(tokenAddresses);
  const { data: tokenDecimals } = useMultipleTokenDecimals(tokenAddresses);

  const tokenSymbol = config?.currency && config.currency !== ETH_ADDRESS
    ? (tokenSymbols as any)?.[config.currency] || "TOKEN"
    : "ETH";
    
  const tokenDecimalValue = config?.currency && config.currency !== ETH_ADDRESS
    ? (tokenDecimals as any)?.[config.currency] || 18
    : 18;

  // Contract configuration
  const abi = cookieJarAbi; // Only V2 supported for now
  const withdrawAllowlistFunction = isV2Chain(chainId) 
    ? "withdrawAllowlist" 
    : "withdrawWhitelist";

  // Enhanced transaction hooks with retry logic
  const depositETH = useTransactionWithRetry({
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 2000,
  });

  const depositCurrency = useTransactionWithRetry({
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 2000,
  });

  const approve = useTransactionWithRetry({
    maxRetries: options.maxRetries || 2, // Fewer retries for approvals
    retryDelay: options.retryDelay || 1500,
  });

  const withdrawAllowlist = useTransactionWithRetry({
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 2000,
  });

  const withdrawNFT = useTransactionWithRetry({
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 2000,
  });

  // Helper function to parse token amounts
  const parseTokenAmount = useCallback((value: string, decimals: number): bigint => {
    try {
      return parseUnits(value || "0", decimals);
    } catch (error) {
      console.error("Error parsing token amount:", error);
      return BigInt(0);
    }
  }, []);

  // Handle approval completion for ERC20 deposits
  useEffect(() => {
    if (approve.isSuccess && approvalCompleted && transactionStep === "approving") {
      setTransactionStep("depositing");
      
      const executeDeposit = async () => {
        try {
          await depositCurrency.writeContract({
            address: addressString,
            abi,
            functionName: "depositCurrency",
            args: [pendingDepositAmount],
          });
        } catch (error) {
          setTransactionStep("idle");
          setApprovalCompleted(false);
          setPendingDepositAmount(BigInt(0));
        }
      };

      executeDeposit();
    }
  }, [
    approve.isSuccess,
    approvalCompleted,
    transactionStep,
    depositCurrency,
    addressString,
    abi,
    pendingDepositAmount,
  ]);

  // Handle deposit completion
  useEffect(() => {
    if (depositETH.isSuccess || depositCurrency.isSuccess) {
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${amount} ${tokenSymbol}`,
      });
      
      setAmount("");
      setTransactionStep("idle");
      setApprovalCompleted(false);
      setPendingDepositAmount(BigInt(0));
    }
  }, [depositETH.isSuccess, depositCurrency.isSuccess, amount, tokenSymbol, toast]);

  // Handle withdrawal completion
  useEffect(() => {
    if (withdrawAllowlist.isSuccess || withdrawNFT.isSuccess) {
      toast({
        title: "Withdrawal Successful",
        description: withdrawPurpose 
          ? `Successfully withdrew for: ${withdrawPurpose}`
          : "Successfully withdrew funds",
      });
      
      setWithdrawAmount("");
      setWithdrawPurpose("");
      setTransactionStep("idle");
    }
  }, [withdrawAllowlist.isSuccess, withdrawNFT.isSuccess, withdrawPurpose, toast]);

  // Deposit submission handler
  const onSubmit = useCallback(async (value: string) => {
    if (!config?.currency) return;
    
    const amountBigInt = parseTokenAmount(value || "0", tokenDecimalValue);
    
    if (amountBigInt <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      if (config.currency === ETH_ADDRESS) {
        setTransactionStep("depositing");
        await depositETH.writeContract({
          address: addressString,
          abi,
          functionName: "depositETH",
          value: amountBigInt,
        });
      } else {
        setTransactionStep("approving");
        setApprovalCompleted(true);
        setPendingDepositAmount(amountBigInt);
        
        await approve.writeContract({
          address: config.currency as `0x${string}`,
          abi: [
            {
              name: "approve",
              type: "function",
              stateMutability: "nonpayable",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [addressString, amountBigInt],
        });
      }
    } catch (error) {
      setTransactionStep("idle");
      setApprovalCompleted(false);
      setPendingDepositAmount(BigInt(0));
    }
  }, [
    config?.currency,
    parseTokenAmount,
    tokenDecimalValue,
    addressString,
    abi,
    depositETH,
    approve,
    toast,
  ]);

  // Allowlist withdrawal handler
  const handleWithdrawAllowlist = useCallback(async () => {
    if (!config?.contractAddress || !config?.fixedAmount) return;

    try {
      setTransactionStep("withdrawing");
      await withdrawAllowlist.writeContract({
        address: config.contractAddress,
        abi,
        functionName: withdrawAllowlistFunction,
        args: [config.fixedAmount, withdrawPurpose],
      });
    } catch (error) {
      setTransactionStep("idle");
    }
  }, [
    config?.contractAddress,
    config?.fixedAmount,
    withdrawAllowlist,
    abi,
    withdrawAllowlistFunction,
    withdrawPurpose,
  ]);

  // Variable withdrawal handler
  const handleWithdrawAllowlistVariable = useCallback(async (variableAmount: bigint) => {
    if (!config?.contractAddress) return;

    try {
      setTransactionStep("withdrawing");
      await withdrawAllowlist.writeContract({
        address: config.contractAddress,
        abi,
        functionName: withdrawAllowlistFunction,
        args: [variableAmount, withdrawPurpose],
      });
    } catch (error) {
      setTransactionStep("idle");
    }
  }, [
    config?.contractAddress,
    withdrawAllowlist,
    abi,
    withdrawAllowlistFunction,
    withdrawPurpose,
  ]);

  // NFT withdrawal handler
  const handleWithdrawNFT = useCallback(async (withdrawalAmount: bigint) => {
    if (!config?.contractAddress) return;

    try {
      setTransactionStep("withdrawing");
      await withdrawNFT.writeContract({
        address: config.contractAddress,
        abi,
        functionName: "withdrawNFTMode",
        args: [withdrawalAmount, withdrawPurpose],
      });
    } catch (error) {
      setTransactionStep("idle");
    }
  }, [
    config?.contractAddress,
    withdrawNFT,
    abi,
    withdrawPurpose,
  ]);

  // Reset all transactions
  const resetTransactions = useCallback(() => {
    depositETH.reset();
    depositCurrency.reset();
    approve.reset();
    withdrawAllowlist.reset();
    withdrawNFT.reset();
    setTransactionStep("idle");
    setApprovalCompleted(false);
    setPendingDepositAmount(BigInt(0));
  }, [depositETH, depositCurrency, approve, withdrawAllowlist, withdrawNFT]);

  // Combined loading states
  const isApprovalPending = approve.isPending || approve.isLoading;
  const isDepositPending = depositETH.isPending || depositCurrency.isPending || 
                          depositETH.isLoading || depositCurrency.isLoading ||
                          transactionStep === "approving";
  const isWithdrawPending = withdrawAllowlist.isPending || withdrawNFT.isPending ||
                           withdrawAllowlist.isLoading || withdrawNFT.isLoading;

  return {
    // State
    amount,
    setAmount,
    withdrawAmount,
    setWithdrawAmount,
    withdrawPurpose,
    setWithdrawPurpose,
    transactionStep,
    
    // Token info
    tokenSymbol,
    tokenDecimals: tokenDecimalValue,
    
    // Transaction handlers
    onSubmit,
    handleWithdrawAllowlist,
    handleWithdrawAllowlistVariable,
    handleWithdrawNFT,
    resetTransactions,
    
    // Status flags
    isApprovalPending,
    isDepositPending,
    isWithdrawPending,
    
    // Individual transaction states (for advanced usage)
    depositETH,
    depositCurrency,
    approve,
    withdrawAllowlist,
    withdrawNFT,
    
    // Retry capabilities
    canRetryDeposit: depositETH.retryState.canRetry || depositCurrency.retryState.canRetry,
    canRetryWithdrawal: withdrawAllowlist.retryState.canRetry || withdrawNFT.retryState.canRetry,
    retryDeposit: () => {
      if (depositETH.retryState.canRetry) depositETH.retry();
      if (depositCurrency.retryState.canRetry) depositCurrency.retry();
    },
    retryWithdrawal: () => {
      if (withdrawAllowlist.retryState.canRetry) withdrawAllowlist.retry();
      if (withdrawNFT.retryState.canRetry) withdrawNFT.retry();
    },
  };
};
