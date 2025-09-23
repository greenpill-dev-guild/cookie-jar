"use client";

import { parseEther } from "viem";
import { useWriteContract, useChainId } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { cookieJarAbi, useWriteErc20Approve, useWriteCookieJarWithdrawNftMode } from "@/generated";

import { cookieJarV1Abi } from "@/lib/blockchain/cookie-jar-v1-abi";
import { isV2Chain } from "@/config/supported-networks";
import { ETH_ADDRESS, parseTokenAmount, useTokenInfo } from "@/lib/blockchain/token-utils";

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

/**
 * Custom hook to handle Cookie Jar transaction logic (deposits and withdrawals)
 * 
 * Manages all transaction-related state and logic including deposits, withdrawals,
 * approvals for ERC-20 tokens, and transaction status tracking. Automatically
 * handles differences between v1 and v2 contracts and ETH vs ERC-20 currencies.
 * 
 * @param config - Jar configuration with currency and contract info
 * @param addressString - Cookie jar contract address
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
 * } = useJarTransactions(config, jarAddress);
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
  addressString: `0x${string}`
) => {
  const { toast } = useToast();
  const chainId = useChainId();
  
  // Transaction state
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>("");
  const [gateAddress, setGateAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [approvalCompleted, setApprovalCompleted] = useState(false);
  const [pendingDepositAmount, setPendingDepositAmount] = useState<bigint>(BigInt(0));

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

  // Contract write hooks
  const { writeContract: DepositEth } = useWriteContract();
  const { writeContract: DepositCurrency } = useWriteContract();
  
  const {
    writeContract: Approve,
    isPending: isApprovalPending,
    isSuccess: isApprovalSuccess,
    isError: isApprovalError,
  } = useWriteErc20Approve();

  const {
    writeContract: withdrawAllowlistMode,
    data: withdrawAllowlistModeData,
    error: withdrawAllowlistModeError,
    isSuccess: isWithdrawAllowlistSuccess,
    isPending: isWithdrawAllowlistPending,
  } = useWriteContract();

  const {
    writeContract: withdrawNFTMode,
    data: withdrawNFTModeData,
    error: withdrawNFTModeError,
    isSuccess: isWithdrawNFTSuccess,
    isPending: isWithdrawNFTPending,
  } = useWriteCookieJarWithdrawNftMode();

  // Handle approval completion for ERC20 deposits
  useEffect(() => {
    if (isApprovalSuccess && approvalCompleted) {
      DepositCurrency({
        address: addressString as `0x${string}`,
        abi,
        functionName: "depositCurrency",
        args: [pendingDepositAmount],
      });
      setApprovalCompleted(false);
      setPendingDepositAmount(BigInt(0));
    }
  }, [
    isApprovalSuccess,
    approvalCompleted,
    DepositCurrency,
    addressString,
    pendingDepositAmount,
    abi,
  ]);

  // Deposit submission handler
  const onSubmit = useCallback((value: string) => {
    if (!config?.currency) return;
    
    // Parse amount considering the token decimals
    const amountBigInt = parseTokenAmount(value || "0", tokenDecimals);

    if (config.currency === ETH_ADDRESS) {
      DepositEth({
        address: addressString as `0x${string}`,
        abi,
        functionName: "depositETH",
        value: amountBigInt,
      });
    } else {
      setApprovalCompleted(true);
      setPendingDepositAmount(amountBigInt);
      try {
        Approve({
          address: config.currency as `0x${string}`,
          args: [addressString as `0x${string}`, amountBigInt],
        });
      } catch (error) {
        console.error("Approve error:", error);
      }
    }
  }, [config?.currency, tokenDecimals, addressString, abi, DepositEth, Approve]);

  // Allowlist withdrawal handlers
  const handleWithdrawAllowlist = useCallback(() => {
    if (!config?.contractAddress || !config?.fixedAmount) return;

    withdrawAllowlistMode({
      address: config.contractAddress,
      abi,
      functionName: withdrawAllowlistFunction,
      args: [config.fixedAmount, withdrawPurpose],
    });
  }, [config?.contractAddress, config?.fixedAmount, withdrawAllowlistMode, abi, withdrawAllowlistFunction, withdrawPurpose]);

  const handleWithdrawAllowlistVariable = useCallback(() => {
    if (!config?.contractAddress || !withdrawAmount) return;

    // Parse amount considering the token decimals
    const parsedAmount =
      config.currency === ETH_ADDRESS
        ? parseEther(withdrawAmount)
        : parseTokenAmount(withdrawAmount, tokenDecimals);

    withdrawAllowlistMode({
      address: config.contractAddress,
      abi,
      functionName: withdrawAllowlistFunction,
      args: [parsedAmount, withdrawPurpose],
    });
  }, [config?.contractAddress, config?.currency, withdrawAmount, tokenDecimals, withdrawAllowlistMode, abi, withdrawAllowlistFunction, withdrawPurpose]);

  // NFT withdrawal handlers
  const handleWithdrawNFT = useCallback(() => {
    if (!config?.contractAddress || !config?.fixedAmount || !gateAddress) return;

    withdrawNFTMode({
      address: config.contractAddress,
      args: [
        config.fixedAmount,
        withdrawPurpose,
        gateAddress as `0x${string}`,
        BigInt(tokenId || "0"),
      ],
    });
  }, [config?.contractAddress, config?.fixedAmount, gateAddress, tokenId, withdrawPurpose, withdrawNFTMode]);

  const handleWithdrawNFTVariable = useCallback(() => {
    if (!config?.contractAddress || !withdrawAmount || !gateAddress) return;

    // Parse amount considering the token decimals
    const parsedAmount =
      config?.currency === ETH_ADDRESS
        ? parseEther(withdrawAmount)
        : parseTokenAmount(withdrawAmount, tokenDecimals);

    withdrawNFTMode({
      address: config.contractAddress,
      args: [
        parsedAmount,
        withdrawPurpose,
        gateAddress as `0x${string}`,
        BigInt(tokenId || "0"),
      ],
    });
  }, [config?.contractAddress, config?.currency, withdrawAmount, tokenDecimals, gateAddress, tokenId, withdrawPurpose, withdrawNFTMode]);

  // Success and error handling effects
  useEffect(() => {
    if (isWithdrawAllowlistSuccess || isWithdrawNFTSuccess) {
      toast({
        title: "Withdrawal Successful",
        description: "Your withdrawal has been processed successfully.",
      });
      // Reset form fields
      setWithdrawAmount("");
      setWithdrawPurpose("");
      setGateAddress("");
      setTokenId("");
    }
  }, [isWithdrawAllowlistSuccess, isWithdrawNFTSuccess, toast]);

  useEffect(() => {
    if (withdrawAllowlistModeError || withdrawNFTModeError) {
      toast({
        title: "Withdrawal Failed",
        description:
          (withdrawAllowlistModeError || withdrawNFTModeError)?.message ||
          "An error occurred during withdrawal",
        variant: "destructive",
      });
    }
  }, [withdrawAllowlistModeError, withdrawNFTModeError, toast]);

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
    
    // Token info
    isERC20,
    tokenSymbol,
    tokenDecimals,
    
    // Transaction handlers
    onSubmit,
    handleWithdrawAllowlist,
    handleWithdrawAllowlistVariable,
    handleWithdrawNFT,
    handleWithdrawNFTVariable,
    
    // Transaction status
    isApprovalPending,
    isWithdrawAllowlistPending,
    isWithdrawNFTPending,
    
    // For composing withdrawal sections
    config: {
      ...config,
      isWithdrawPending: isWithdrawAllowlistPending || isWithdrawNFTPending,
    },
  };
};
