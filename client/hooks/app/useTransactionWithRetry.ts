"use client";

import { useState, useCallback, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useToast } from "@/hooks/app/useToast";
import type { 
  UseWriteContractParameters,
  UseWriteContractReturnType,
} from "wagmi";

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

export interface TransactionWithRetryState {
  attemptCount: number;
  isRetrying: boolean;
  lastError: Error | null;
  canRetry: boolean;
}

interface TransactionWithRetryResult {
  writeContract: (parameters: any) => Promise<void>;
  hash: `0x${string}` | undefined;
  isPending: boolean;
  error: any;
  isSuccess: boolean;
  isLoading: boolean;
  retryState: TransactionWithRetryState;
  retry: () => Promise<void>;
  reset: () => void;
}

const defaultRetryConfig: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    const message = error.message.toLowerCase();
    // Retry on network errors, timeout, RPC errors, but not user rejections
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("rpc") ||
      message.includes("server") ||
      message.includes("failed to fetch") ||
      message.includes("connection") ||
      message.includes("rate limit")
    ) && !message.includes("user rejected") && !message.includes("cancelled");
  },
};

/**
 * Enhanced useWriteContract with automatic retry logic
 * 
 * Features:
 * - Automatic retry on network/RPC errors
 * - Exponential backoff
 * - Configurable retry conditions
 * - User-friendly error messages
 * - Manual retry capability
 * 
 * @param retryConfig Configuration for retry behavior
 * @returns Enhanced transaction interface with retry capabilities
 */
export function useTransactionWithRetry(
  retryConfig: RetryConfig = {}
): TransactionWithRetryResult {
  const config = { ...defaultRetryConfig, ...retryConfig };
  const { toast } = useToast();
  
  // State for retry management
  const [retryState, setRetryState] = useState<TransactionWithRetryState>({
    attemptCount: 0,
    isRetrying: false,
    lastError: null,
    canRetry: false,
  });

  const lastParametersRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    writeContract: originalWriteContract,
    data: hash,
    isPending,
    error,
    isSuccess,
    reset: originalReset,
  } = useWriteContract();

  const { isLoading } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Executes transaction with retry logic
   */
  const executeTransaction = useCallback(async (
    parameters: any,
    isRetry: boolean = false
  ) => {
    try {
      // Store parameters for potential retries
      if (!isRetry) {
        lastParametersRef.current = parameters;
        setRetryState(prev => ({
          ...prev,
          attemptCount: 0,
          lastError: null,
          canRetry: false,
        }));
      }

      // Update attempt count
      setRetryState(prev => ({
        ...prev,
        attemptCount: prev.attemptCount + 1,
        isRetrying: isRetry,
      }));

      await originalWriteContract(parameters);

    } catch (err) {
      const error = err as any;
      console.error(`Transaction attempt ${retryState.attemptCount + 1} failed:`, error);

      const canRetryError = config.retryCondition(error);
      const hasRetriesLeft = retryState.attemptCount < config.maxRetries;
      const shouldRetry = canRetryError && hasRetriesLeft;

      setRetryState(prev => ({
        ...prev,
        lastError: error,
        canRetry: canRetryError,
        isRetrying: false,
      }));

      if (shouldRetry) {
        // Show retry notification
        toast({
          title: "Transaction Failed",
          description: `Retrying transaction (${retryState.attemptCount + 1}/${config.maxRetries})...`,
          variant: "default",
        });

        // Calculate delay with exponential backoff
        const delay = config.retryDelay * Math.pow(config.backoffMultiplier, retryState.attemptCount);

        retryTimeoutRef.current = setTimeout(async () => {
          if (lastParametersRef.current) {
            await executeTransaction(lastParametersRef.current, true);
          }
        }, delay);

      } else {
        // No more retries or error is not retryable
        const errorMessage = getUserFriendlyErrorMessage(error);
        
        toast({
          title: "Transaction Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw error;
      }
    }
  }, [originalWriteContract, config, retryState.attemptCount, toast]);

  /**
   * Manual retry function
   */
  const retry = useCallback(async () => {
    if (lastParametersRef.current && retryState.canRetry) {
      await executeTransaction(lastParametersRef.current, true);
    }
  }, [executeTransaction, retryState.canRetry]);

  /**
   * Reset function that clears retry state
   */
  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setRetryState({
      attemptCount: 0,
      isRetrying: false,
      lastError: null,
      canRetry: false,
    });

    lastParametersRef.current = null;
    originalReset();
  }, [originalReset]);

  return {
    writeContract: executeTransaction,
    hash,
    isPending: isPending || retryState.isRetrying,
    error,
    isSuccess,
    isLoading,
    retryState,
    retry,
    reset,
  };
}

/**
 * Convert technical errors to user-friendly messages
 */
function getUserFriendlyErrorMessage(error: any): string {
  const message = error.message.toLowerCase();

  if (message.includes("user rejected") || message.includes("cancelled")) {
    return "Transaction was cancelled by user.";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds to complete this transaction.";
  }

  if (message.includes("gas") && message.includes("limit")) {
    return "Transaction requires more gas than available. Try increasing gas limit.";
  }

  if (message.includes("nonce")) {
    return "Transaction nonce error. Please refresh and try again.";
  }

  if (message.includes("network") || message.includes("connection")) {
    return "Network connection error. Please check your internet connection and try again.";
  }

  if (message.includes("timeout")) {
    return "Transaction timed out. Please try again.";
  }

  if (message.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (message.includes("execution reverted")) {
    // Try to extract revert reason
    const revertMatch = message.match(/execution reverted: (.+)/);
    if (revertMatch && revertMatch[1]) {
      return `Transaction failed: ${revertMatch[1]}`;
    }
    return "Transaction was reverted by the contract.";
  }

  // Default fallback
  return "Transaction failed. Please try again.";
}

/**
 * Hook for handling common transaction patterns with retry logic
 */
export function useTransactionPattern(
  retryConfig?: RetryConfig
) {
  const transaction = useTransactionWithRetry(retryConfig);
  const { toast } = useToast();

  const handleTransaction = useCallback(async (
    parameters: any,
    options?: {
      successTitle?: string;
      successDescription?: string;
      onSuccess?: () => void;
    }
  ) => {
    try {
      await transaction.writeContract(parameters);
      
      if (options?.successTitle) {
        toast({
          title: options.successTitle,
          description: options.successDescription || "Transaction completed successfully.",
        });
      }

      options?.onSuccess?.();
      
    } catch (error) {
      // Error handling is done in useTransactionWithRetry
      console.error("Transaction pattern error:", error);
    }
  }, [transaction, toast]);

  return {
    ...transaction,
    handleTransaction,
  };
}
