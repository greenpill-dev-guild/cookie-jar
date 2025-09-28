"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther, isAddress } from "viem";
import { cookieJarAbi } from "@/generated";
import { useToast } from "../app/useToast";

/**
 * Stream data structure matching the contract
 */
export interface StreamData {
  id: number;
  sender: string;
  token: string;
  tokenSymbol: string;
  ratePerSecond: bigint;
  totalStreamed: bigint;
  pendingAmount: bigint;
  lastProcessedTime: number;
  nextProcessTime: number;
  isActive: boolean;
  isApproved: boolean;
  decimals: number;
}

/**
 * Hook for managing streaming actions (admin only)
 */
export const useStreamingActions = (jarAddress: `0x${string}`) => {
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Transaction states
  const [isRegistering, setIsRegistering] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStreamId, setProcessingStreamId] = useState<number | null>(null);

  // Write contract hooks
  const {
    writeContract: registerStreamWrite,
    data: registerHash,
    isPending: registerPending,
  } = useWriteContract();

  const {
    writeContract: approveStreamWrite,
    data: approveHash,
    isPending: approvePending,
  } = useWriteContract();

  const {
    writeContract: processStreamWrite,
    data: processHash,
    isPending: processPending,
  } = useWriteContract();

  // Transaction receipts
  const { isLoading: registerLoading, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  const { isLoading: approveLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: processLoading, isSuccess: processSuccess } = useWaitForTransactionReceipt({
    hash: processHash,
  });

  // Handle success states with useEffect
  useEffect(() => {
    if (registerSuccess) {
      toast({
        title: "Stream Registered",
        description: "Stream has been registered successfully.",
      });
      setIsRegistering(false);
      queryClient.invalidateQueries({ queryKey: ["streams", jarAddress] });
    }
  }, [registerSuccess, toast, queryClient, jarAddress]);

  useEffect(() => {
    if (approveSuccess) {
      toast({
        title: "Stream Approved",
        description: "Stream has been approved and is now active.",
      });
      setIsApproving(false);
      queryClient.invalidateQueries({ queryKey: ["streams", jarAddress] });
    }
  }, [approveSuccess, toast, queryClient, jarAddress]);

  useEffect(() => {
    if (processSuccess) {
      toast({
        title: "Stream Processed",
        description: "Stream tokens have been processed into the jar.",
      });
      setIsProcessing(false);
      setProcessingStreamId(null);
      queryClient.invalidateQueries({ queryKey: ["streams", jarAddress] });
    }
  }, [processSuccess, toast, queryClient, jarAddress]);

  /**
   * Create a new Superfluid stream
   */
  const createSuperStream = async (
    superToken: string,
    flowRate: string
  ) => {
    if (!isAddress(superToken) || !flowRate) {
      toast({
        title: "Invalid Input",
        description: "Please provide valid super token address and flow rate.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRegistering(true);
      await registerStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: "createSuperStream",
        args: [superToken as `0x${string}`, parseEther(flowRate)],
      });
    } catch (error: any) {
      toast({
        title: "Stream Creation Failed",
        description: error.message || "Failed to create Superfluid stream.",
        variant: "destructive",
      });
      setIsRegistering(false);
    }
  };




  return {
    // Actions
    createSuperStream,


    // Loading states
    isRegistering: registerPending || registerLoading || isRegistering,
    isApproving: approvePending || approveLoading || isApproving,
    isProcessing: processPending || processLoading || isProcessing,
    processingStreamId,

    // Transaction hashes
    registerHash,
    approveHash,
    processHash,
  };
};
