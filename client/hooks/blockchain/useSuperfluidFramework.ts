'use client';

import { useQuery } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import {
  createSuperfluidFramework,
  isSuperfluidSupported,
} from '@/lib/blockchain/superfluid-config';

/**
 * Hook for initializing and caching Superfluid Framework
 * This creates the framework once per chain and caches it
 */
export const useSuperfluidFramework = () => {
  const chainId = useChainId();

  return useQuery({
    queryKey: ['superfluidFramework', chainId],
    queryFn: async () => {
      if (!isSuperfluidSupported(chainId)) {
        throw new Error(`Superfluid not supported on chain ${chainId}`);
      }

      // Create and cache the framework instance
      return await createSuperfluidFramework(chainId);
    },
    staleTime: Infinity, // Framework doesn't change during session
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    enabled: !!chainId && isSuperfluidSupported(chainId),
    retry: (failureCount, error) => {
      // Don't retry if chain is not supported
      if (error.message.includes('not supported')) return false;
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
  });
};
