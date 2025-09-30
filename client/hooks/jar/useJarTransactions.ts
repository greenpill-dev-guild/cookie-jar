"use client";

import { parseEther, parseUnits } from "viem";
import { useWriteContract, useChainId } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { cookieJarAbi, useWriteErc20Approve, useWriteCookieJarWithdraw } from "@/generated";

import { cookieJarV1Abi } from "@/lib/blockchain/cookie-jar-v1-abi";
import { isV2Chain } from "@/config/supported-networks";
import { ETH_ADDRESS, parseTokenAmount, useTokenInfo } from "@/lib/blockchain/token-utils";
import { useTransactionWithRetry } from "@/hooks/app/useTransactionWithRetry";
import { useToast } from "../app/useToast";

/**
 * Configuration for jar transactions
 */
export interface JarConfig {
  /** Currency address (ETH_ADDRESS for native ETH) */
  currency?: string;
  /** Cookie jar contract address */
  contractAddress?: `0x${string}`;
  /** Fixed withdrawal amount (if applicable) */
  fixedAmount?: bigint;
}

interface TransactionOptions {
  /** Enable retry logic for failed transactions */
  enableRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
}

/**
 * Custom hook to handle Cookie Jar transaction logic (deposits and withdrawals)
 *
 * Manages all transaction-related state and logic including deposits, withdrawals,
 * approvals for ERC-20 tokens, and transaction status tracking. Automatically
 * handles differences between v1 and v2 contracts and ETH vs ERC-20 currencies.
 * Supports configurable retry logic for improved reliability.
 *
 * @param config - Jar configuration with currency and contract info
 * @param addressString - Cookie jar contract address
 * @param options - Transaction configuration options
 * @returns Object with transaction state, handlers, and status flags
 *
 * @example
 * ```tsx
 * const {
 *   amount,
 *   setAmount,
 *   onSubmit,
 *   withdrawAmount,
 *   handleWithdrawAllowlist,
 *   isApprovalPending,
 *   tokenSymbol
 * } = useJarTransactions(config, jarAddress, { enableRetry: true });
 *
 * // Handle deposit
 * <input value={amount} onChange={e => setAmount(e.target.value)} />
 * <button onClick={() => onSubmit(amount)}>Deposit</button>
 *
 * // Handle withdrawal
 * <button onClick={handleWithdrawAllowlist}>Withdraw</button>
 * ```
 */
export const useJarTransactions = (
  config: JarConfig | undefined,
  addressString: `0x${string}`,
  options: TransactionOptions = {}
) => {
  const { toast } = useToast();
  const chainId = useChainId();
  const { enableRetry = false, maxRetries = 3, retryDelay = 2000 } = options;

  // Transaction state
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>("");
  const [gateAddress, setGateAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [pendingDepositAmount, setPendingDepositAmount] = useState<bigint>(BigInt(0));
  const [approvalCompleted, setApprovalCompleted] = useState(false);

  // Multi-step transaction tracking
  const [transactionStep, setTransactionStep] = useState<
    "idle" | "approving" | "depositing" | "withdrawing"
  >("idle");

  // Version-aware ABI and function selection
  const isV2 = isV2Chain(chainId);
  const abi = isV2 ? cookieJarAbi : cookieJarV1Abi;
  const withdrawAllowlistFunction = isV2
    ? "withdrawAllowlistMode"
    : "withdrawWhitelistMode";

  // Get token information
  const isERC20 = !!config?.currency && config.currency !== ETH_ADDRESS;
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenInfo(
    (isERC20 && config?.currency ? config.currency : ETH_ADDRESS) as `0x${string}`,
  );

  const tokenDecimalValue = tokenDecimals || 18;

  // Enhanced transaction hooks with retry logic
  const depositETH = useTransactionWithRetry({
    maxRetries: enableRetry ? maxRetries : 1,
    retryDelay: enableRetry ? retryDelay : 0,
  });

  const depositCurrency = useTransactionWithRetry({
    maxRetries: enableRetry ? maxRetries : 1,
    retryDelay: enableRetry ? retryDelay : 0,
  });

  const approve = useTransactionWithRetry({
    maxRetries: enableRetry ? Math.min(maxRetries, 2) : 1, // Fewer retries for approvals
    retryDelay: enableRetry ? retryDelay : 0,
  });

  const withdrawAllowlist = useTransactionWithRetry({
    maxRetries: enableRetry ? maxRetries : 1,
    retryDelay: enableRetry ? retryDelay : 0,
  });

  const withdrawNFT = useTransactionWithRetry({
    maxRetries: enableRetry ? maxRetries : 1,
    retryDelay: enableRetry ? retryDelay : 0,
  });

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

  // Deposit submission handler
  const onSubmit = useCallback(async (value: string) => {
    if (!config?.currency) return;

    const amountBigInt = parseUnits(value || "0", tokenDecimalValue);

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
    tokenDecimalValue,
    addressString,
    abi,
    depositETH,
    approve,
    toast,
  ]);

  // Allowlist withdrawal handlers
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

  const handleWithdrawAllowlistVariable = useCallback(async (variableAmount?: bigint) => {
    if (!config?.contractAddress) return;

    const amountToWithdraw = variableAmount || (
      config.currency === ETH_ADDRESS
        ? parseEther(withdrawAmount || "0")
        : parseUnits(withdrawAmount || "0", tokenDecimalValue)
    );

    try {
      setTransactionStep("withdrawing");
      await withdrawAllowlist.writeContract({
        address: config.contractAddress,
        abi,
        functionName: withdrawAllowlistFunction,
        args: [amountToWithdraw, withdrawPurpose],
      });
    } catch (error) {
      setTransactionStep("idle");
    }
  }, [
    config?.contractAddress,
    config?.currency,
    withdrawAmount,
    tokenDecimalValue,
    withdrawAllowlist,
    abi,
    withdrawAllowlistFunction,
    withdrawPurpose,
  ]);

  // NFT withdrawal handlers
  const handleWithdrawNFT = useCallback(async (withdrawalAmount?: bigint) => {
    if (!config?.contractAddress || !gateAddress) return;

    const amountToWithdraw = withdrawalAmount || config?.fixedAmount || BigInt(0);

    try {
      setTransactionStep("withdrawing");
      await withdrawNFT.writeContract({
        address: config.contractAddress,
        abi,
        functionName: "withdrawNFTMode",
        args: [amountToWithdraw, withdrawPurpose, gateAddress as `0x${string}`, BigInt(tokenId || "0")],
      });
    } catch (error) {
      setTransactionStep("idle");
    }
  }, [
    config?.contractAddress,
    config?.fixedAmount,
    gateAddress,
    tokenId,
    withdrawPurpose,
    withdrawNFT,
    abi,
  ]);

  const handleWithdrawNFTVariable = useCallback(async (variableAmount?: bigint) => {
    if (!config?.contractAddress || !gateAddress) return;

    const amountToWithdraw = variableAmount || (
      config?.currency === ETH_ADDRESS
        ? parseEther(withdrawAmount || "0")
        : parseUnits(withdrawAmount || "0", tokenDecimalValue)
    );

    try {
      setTransactionStep("withdrawing");
      await withdrawNFT.writeContract({
        address: config.contractAddress,
        abi,
        functionName: "withdrawNFTMode",
        args: [amountToWithdraw, withdrawPurpose, gateAddress as `0x${string}`, BigInt(tokenId || "0")],
      });
    } catch (error) {
      setTransactionStep("idle");
    }
  }, [
    config?.contractAddress,
    config?.currency,
    withdrawAmount,
    tokenDecimalValue,
    gateAddress,
    tokenId,
    withdrawPurpose,
    withdrawNFT,
    abi,
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
    gateAddress,
    setGateAddress,
    tokenId,
    setTokenId,
    transactionStep,

    // Token info
    tokenSymbol,
    tokenDecimals: tokenDecimalValue,

    // Transaction handlers
    onSubmit,
    handleWithdrawAllowlist,
    handleWithdrawAllowlistVariable,
    handleWithdrawNFT,
    handleWithdrawNFTVariable,
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

    // For composing withdrawal sections
    config: {
      ...config,
      isWithdrawPending,
    },
  };
};
