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
   * Register a new stream
   */
  const registerStream = async (
    sender: string,
    token: string,
    ratePerSecond: string
  ) => {
    if (!isAddress(sender) || !isAddress(token) || !ratePerSecond) {
      toast({
        title: "Invalid Input",
        description: "Please provide valid addresses and rate.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRegistering(true);
      await registerStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: "registerStream",
        args: [sender as `0x${string}`, token as `0x${string}`, parseEther(ratePerSecond)],
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register stream.",
        variant: "destructive",
      });
      setIsRegistering(false);
    }
  };

  /**
   * Approve a pending stream
   */
  const approveStream = async (streamId: number) => {
    try {
      setIsApproving(true);
      await approveStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: "approveStream",
        args: [BigInt(streamId)],
      });
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve stream.",
        variant: "destructive",
      });
      setIsApproving(false);
    }
  };

  /**
   * Process accumulated stream tokens
   */
  const processStream = async (streamId: number) => {
    try {
      setIsProcessing(true);
      setProcessingStreamId(streamId);
      await processStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: "processStream",
        args: [BigInt(streamId)],
      });
    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process stream.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProcessingStreamId(null);
    }
  };

  return {
    // Actions
    registerStream,
    approveStream,
    processStream,

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
