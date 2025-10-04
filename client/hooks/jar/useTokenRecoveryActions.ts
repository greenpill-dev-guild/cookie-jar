'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { isAddress } from 'viem';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { cookieJarAbi } from '@/generated';
import { useToast } from '../app/useToast';

/**
 * Pending token data structure
 */
export interface PendingToken {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: bigint;
  decimals: number;
  isSwappable: boolean;
  estimatedOutput?: bigint;
}

/**
 * Hook for managing token recovery actions (admin only)
 */
export const useTokenRecoveryActions = (jarAddress: `0x${string}`) => {
  const { address: _address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Transaction states
  const [isSwapping, setIsSwapping] = useState(false);
  const [swappingTokenAddress, setSwappingTokenAddress] = useState<
    string | null
  >(null);

  // Write contract hooks
  const {
    writeContract: swapTokensWrite,
    data: swapHash,
    isPending: swapPending,
  } = useWriteContract();

  // Transaction receipt
  const {
    isLoading: swapLoading,
    isSuccess: swapSuccess,
    error: swapError,
  } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  // Handle success and error states
  useEffect(() => {
    if (swapSuccess) {
      toast({
        title: 'Swap Successful',
        description: `Token has been swapped successfully.`,
      });
      setIsSwapping(false);
      setSwappingTokenAddress(null);

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['pendingTokens', jarAddress],
      });
      queryClient.invalidateQueries({ queryKey: ['jarBalance', jarAddress] });
    }
  }, [swapSuccess, toast, queryClient, jarAddress]);

  useEffect(() => {
    if (swapError) {
      toast({
        title: 'Swap Failed',
        description: swapError.message || 'Failed to swap token.',
        variant: 'destructive',
      });
      setIsSwapping(false);
      setSwappingTokenAddress(null);
    }
  }, [swapError, toast]);

  /**
   * Swap pending tokens to the jar's token
   */
  const swapPendingToken = async (tokenAddress: string) => {
    if (!isAddress(tokenAddress)) {
      toast({
        title: 'Invalid Token',
        description: 'Invalid token address provided.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSwapping(true);
      setSwappingTokenAddress(tokenAddress);

      await swapTokensWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: 'swapPendingTokens',
        args: [
          tokenAddress as `0x${string}`,
          BigInt(0), // amount - 0 means swap all pending balance
          BigInt(0), // minJarTokensOut - 0 means no minimum (should be calculated from oracle in production)
        ],
      });
    } catch (error: any) {
      toast({
        title: 'Swap Failed',
        description: error.message || 'Failed to initiate token swap.',
        variant: 'destructive',
      });
      setIsSwapping(false);
      setSwappingTokenAddress(null);
    }
  };

  /**
   * Check if currently swapping a specific token
   */
  const isSwappingToken = (tokenAddress: string): boolean => {
    return (
      swappingTokenAddress === tokenAddress &&
      (swapPending || swapLoading || isSwapping)
    );
  };

  return {
    // Actions
    swapPendingToken,

    // Loading states
    isSwapping: swapPending || swapLoading || isSwapping,
    swappingTokenAddress,
    isSwappingToken,

    // Transaction hash
    swapHash,
  };
};
