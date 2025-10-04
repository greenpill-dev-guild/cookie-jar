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
import { useSuperfluidFramework } from '../blockchain/useSuperfluidFramework';

/**
 * Hook for managing Superfluid streaming actions
 */
export const useStreamingActions = (jarAddress: `0x${string}`) => {
  const { address: _address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sf } = useSuperfluidFramework();

  // Transaction states
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Write contract hooks
  const {
    writeContract: createStreamWrite,
    data: createHash,
    isPending: createPending,
  } = useWriteContract();

  const {
    writeContract: updateStreamWrite,
    data: updateHash,
    isPending: updatePending,
  } = useWriteContract();

  const {
    writeContract: deleteStreamWrite,
    data: deleteHash,
    isPending: deletePending,
  } = useWriteContract();

  // Transaction receipts
  const { isLoading: createLoading, isSuccess: createSuccess } =
    useWaitForTransactionReceipt({
      hash: createHash,
    });

  const { isLoading: updateLoading, isSuccess: updateSuccess } =
    useWaitForTransactionReceipt({
      hash: updateHash,
    });

  const { isLoading: deleteLoading, isSuccess: deleteSuccess } =
    useWaitForTransactionReceipt({
      hash: deleteHash,
    });

  // Handle success states
  useEffect(() => {
    if (createSuccess) {
      toast({
        title: 'Stream Created',
        description: 'Superfluid stream has been created successfully.',
      });
      setIsCreating(false);
      queryClient.invalidateQueries({
        queryKey: ['superfluidStreams', jarAddress],
      });
    }
  }, [createSuccess, toast, queryClient, jarAddress]);

  useEffect(() => {
    if (updateSuccess) {
      toast({
        title: 'Stream Updated',
        description: 'Superfluid stream has been updated successfully.',
      });
      setIsUpdating(false);
      queryClient.invalidateQueries({
        queryKey: ['superfluidStreams', jarAddress],
      });
    }
  }, [updateSuccess, toast, queryClient, jarAddress]);

  useEffect(() => {
    if (deleteSuccess) {
      toast({
        title: 'Stream Deleted',
        description: 'Superfluid stream has been deleted successfully.',
      });
      setIsDeleting(false);
      queryClient.invalidateQueries({
        queryKey: ['superfluidStreams', jarAddress],
      });
    }
  }, [deleteSuccess, toast, queryClient, jarAddress]);

  /**
   * Create a new Superfluid stream
   */
  const createSuperStream = async (superToken: string, flowRate: string) => {
    if (!isAddress(superToken) || !flowRate) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide valid super token address and flow rate.',
        variant: 'destructive',
      });
      return;
    }

    if (!sf) {
      toast({
        title: 'Superfluid Not Ready',
        description: 'Superfluid framework is not initialized.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);

      // Convert flow rate string to int96 (wad per second)
      // Flow rate should be in wei per second, not ETH amount
      const flowRateInt96 = BigInt(flowRate);

      await createStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: 'createSuperStream',
        args: [superToken as `0x${string}`, flowRateInt96],
      });
    } catch (error: any) {
      toast({
        title: 'Stream Creation Failed',
        description: error.message || 'Failed to create Superfluid stream.',
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  /**
   * Update an existing Superfluid stream
   */
  const updateSuperStream = async (superToken: string, newFlowRate: string) => {
    if (!isAddress(superToken) || !newFlowRate) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide valid super token address and flow rate.',
        variant: 'destructive',
      });
      return;
    }

    if (!sf) {
      toast({
        title: 'Superfluid Not Ready',
        description: 'Superfluid framework is not initialized.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);

      // Convert flow rate string to int96 (wad per second)
      const flowRateInt96 = BigInt(newFlowRate);

      await updateStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: 'updateSuperStream',
        args: [superToken as `0x${string}`, flowRateInt96],
      });
    } catch (error: any) {
      toast({
        title: 'Stream Update Failed',
        description: error.message || 'Failed to update Superfluid stream.',
        variant: 'destructive',
      });
      setIsUpdating(false);
    }
  };

  /**
   * Delete a Superfluid stream
   */
  const deleteSuperStream = async (superToken: string) => {
    if (!isAddress(superToken)) {
      toast({
        title: 'Invalid Token',
        description: 'Please provide a valid super token address.',
        variant: 'destructive',
      });
      return;
    }

    if (!sf) {
      toast({
        title: 'Superfluid Not Ready',
        description: 'Superfluid framework is not initialized.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDeleting(true);

      await deleteStreamWrite({
        address: jarAddress,
        abi: cookieJarAbi,
        functionName: 'deleteSuperStream',
        args: [superToken as `0x${string}`],
      });
    } catch (error: any) {
      toast({
        title: 'Stream Deletion Failed',
        description: error.message || 'Failed to delete Superfluid stream.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  return {
    // Actions
    createSuperStream,
    updateSuperStream,
    deleteSuperStream,

    // Loading states
    isCreating: createPending || createLoading || isCreating,
    isUpdating: updatePending || updateLoading || isUpdating,
    isDeleting: deletePending || deleteLoading || isDeleting,

    // Transaction hashes
    createHash,
    updateHash,
    deleteHash,

    // Superfluid framework
    sf,
  };
};
