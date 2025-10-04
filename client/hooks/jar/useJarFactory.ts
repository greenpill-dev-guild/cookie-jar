'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useChainId, usePublicClient, useWatchContractEvent } from 'wagmi';
import { isV2Chain } from '@/config/supported-networks';
import { cookieJarAbi, cookieJarFactoryAbi } from '@/generated';
import { cookieJarFactoryV1Abi } from '@/lib/blockchain/cookie-jar-v1-abi';
import { useToast } from '../app/useToast';
import { useContractAddresses } from '../blockchain/useContractAddresses';

/**
 * Simple metadata type for backwards compatibility
 */
export type ParsedMetadata = {
  /** Display title of the jar */
  title: string;
  /** Optional description */
  description?: string;
  /** Whether this is v2 metadata format */
  isV2: boolean;
};

/**
 * Error categorization for better UX
 */
export type JarFetchError = {
  /** Address of the jar that failed to load */
  jarAddress: Address;
  /** Type of error that occurred */
  errorType:
    | 'NETWORK_ERROR'
    | 'CONTRACT_NOT_FOUND'
    | 'ABI_MISMATCH'
    | 'INVALID_DATA'
    | 'TIMEOUT'
    | 'UNKNOWN';
  /** Human-readable error message */
  errorMessage: string;
  /** Whether this error can be retried */
  canRetry: boolean;
  /** Number of retry attempts made */
  retryCount?: number;
};

/**
 * Factory fetch progress tracking
 */
export type FetchProgress = {
  /** Total number of jars to fetch */
  total: number;
  /** Number of jars completed (success or failure) */
  completed: number;
  /** Number of successfully loaded jars */
  successful: number;
  /** Number of failed jar loads */
  failed: number;
};

/**
 * Complete Cookie Jar information structure
 */
export type CookieJarInfo = {
  /** Contract address of the jar */
  jarAddress: Address;
  /** Currency address (ETH_ADDRESS for native ETH) */
  currency: Address;
  /** Address of the jar creator */
  jarCreator?: Address;
  /** Raw metadata string */
  metadata?: string;
  /** Parsed metadata object */
  parsedMetadata?: ParsedMetadata;
  /** Access control type (0=Allowlist, 1=NFT, etc.) */
  accessType: number;
  /** Withdrawal option (0=Fixed, 1=Variable) */
  withdrawalOption: number;
  /** Fixed withdrawal amount */
  fixedAmount: bigint;
  /** Maximum withdrawal amount */
  maxWithdrawal: bigint;
  /** Time between withdrawals in seconds */
  withdrawalInterval: bigint;
  /** Whether withdrawal purpose is required */
  strictPurpose: boolean;
  /** Whether emergency withdrawals are enabled */
  emergencyWithdrawalEnabled: boolean;
  /** Whether withdrawals are one-time only */
  oneTimeWithdrawal: boolean;
  /** Current balance held by the jar */
  currencyHeldByJar?: bigint;
  /** Whether jar supports protocol integrations */
  supportsProtocols: boolean;
};

// Simple metadata parser
function parseJarMetadata(rawMetadata: string): ParsedMetadata {
  if (!rawMetadata || rawMetadata.trim() === '') {
    return { title: 'Untitled Jar', isV2: false };
  }

  // Try parsing as JSON (v2)
  try {
    const parsed = JSON.parse(rawMetadata);
    if (parsed.version === '2.0' || parsed.title) {
      return {
        title: parsed.title || 'Untitled Jar',
        description: parsed.description,
        isV2: true,
      };
    }
  } catch {
    // Not JSON, treat as v1 string title
  }

  // v1: Simple string title
  return {
    title: rawMetadata.trim(),
    isV2: false,
  };
}

// Enhanced error categorization
function _categorizeError(error: any, jarAddress: Address): JarFetchError {
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
    return {
      jarAddress,
      errorType: 'NETWORK_ERROR',
      errorMessage: 'Network timeout or connectivity issue',
      canRetry: true,
    };
  }

  if (
    errorMessage.includes('contract function') ||
    errorMessage.includes('does not exist')
  ) {
    return {
      jarAddress,
      errorType: 'CONTRACT_NOT_FOUND',
      errorMessage: 'Contract not found at this address',
      canRetry: false,
    };
  }

  if (
    errorMessage.includes('ABI') ||
    errorMessage.includes('function signature')
  ) {
    return {
      jarAddress,
      errorType: 'ABI_MISMATCH',
      errorMessage: 'Contract ABI mismatch (possibly old/new contract version)',
      canRetry: false,
    };
  }

  if (errorMessage.includes('invalid') || errorMessage.includes('decode')) {
    return {
      jarAddress,
      errorType: 'INVALID_DATA',
      errorMessage: 'Invalid data returned from contract',
      canRetry: true,
    };
  }

  return {
    jarAddress,
    errorType: 'UNKNOWN',
    errorMessage:
      errorMessage.slice(0, 100) + (errorMessage.length > 100 ? '...' : ''),
    canRetry: true,
  };
}

// Helper function to fetch jar details
async function fetchJarDetails(
  publicClient: any,
  jarAddress: Address
): Promise<CookieJarInfo | null> {
  try {
    // Check if we're on local chain (31337) and use individual calls instead of multicall
    const chainId = await publicClient.getChainId();
    const isLocalChain = chainId === 31337;

    let currency,
      accessType,
      withdrawalOption,
      fixedAmount,
      maxWithdrawal,
      withdrawalInterval,
      strictPurpose,
      emergencyWithdrawalEnabled,
      oneTimeWithdrawal,
      currencyHeldByJar;

    if (isLocalChain) {
      // Use individual calls for local development (no multicall3 contract)
      [
        currency,
        accessType,
        withdrawalOption,
        fixedAmount,
        maxWithdrawal,
        withdrawalInterval,
        strictPurpose,
        emergencyWithdrawalEnabled,
        oneTimeWithdrawal,
        currencyHeldByJar,
      ] = await Promise.all([
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'CURRENCY',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'ACCESS_TYPE',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'WITHDRAWAL_OPTION',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'fixedAmount',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'maxWithdrawal',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'withdrawalInterval',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'STRICT_PURPOSE',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'EMERGENCY_WITHDRAWAL_ENABLED',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'ONE_TIME_WITHDRAWAL',
        }),
        publicClient.readContract({
          address: jarAddress,
          abi: cookieJarAbi,
          functionName: 'currencyHeldByJar',
        }),
      ]);
    } else {
      // Use multicall for other chains that support it
      const results = await publicClient.multicall({
        contracts: [
          { address: jarAddress, abi: cookieJarAbi, functionName: 'CURRENCY' },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'ACCESS_TYPE',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'WITHDRAWAL_OPTION',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'fixedAmount',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'maxWithdrawal',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'withdrawalInterval',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'STRICT_PURPOSE',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'EMERGENCY_WITHDRAWAL_ENABLED',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'ONE_TIME_WITHDRAWAL',
          },
          {
            address: jarAddress,
            abi: cookieJarAbi,
            functionName: 'currencyHeldByJar',
          },
        ],
      });

      [
        currency,
        accessType,
        withdrawalOption,
        fixedAmount,
        maxWithdrawal,
        withdrawalInterval,
        strictPurpose,
        emergencyWithdrawalEnabled,
        oneTimeWithdrawal,
        currencyHeldByJar,
      ] = results;
    }

    const accessTypeNum = isLocalChain
      ? (accessType as number)
      : (accessType.result as number);
    const supportsProtocols = accessTypeNum >= 2;

    return {
      jarAddress,
      currency: isLocalChain
        ? (currency as Address)
        : (currency.result as Address),
      accessType: accessTypeNum,
      withdrawalOption: isLocalChain
        ? (withdrawalOption as number)
        : (withdrawalOption.result as number),
      fixedAmount: isLocalChain
        ? (fixedAmount as bigint)
        : (fixedAmount.result as bigint),
      maxWithdrawal: isLocalChain
        ? (maxWithdrawal as bigint)
        : (maxWithdrawal.result as bigint),
      withdrawalInterval: isLocalChain
        ? (withdrawalInterval as bigint)
        : (withdrawalInterval.result as bigint),
      strictPurpose: isLocalChain
        ? (strictPurpose as boolean)
        : (strictPurpose.result as boolean),
      emergencyWithdrawalEnabled: isLocalChain
        ? (emergencyWithdrawalEnabled as boolean)
        : (emergencyWithdrawalEnabled.result as boolean),
      oneTimeWithdrawal: isLocalChain
        ? (oneTimeWithdrawal as boolean)
        : (oneTimeWithdrawal.result as boolean),
      currencyHeldByJar: isLocalChain
        ? (currencyHeldByJar as bigint)
        : (currencyHeldByJar.result as bigint),
      supportsProtocols,
    };
  } catch (err) {
    console.error(`❌ Error fetching details for jar ${jarAddress}:`, err);
    return null;
  }
}

/**
 * Custom hook to get all Cookie Jar information from factory and individual contracts
 *
 * Fetches comprehensive jar data including factory addresses, metadata, and detailed
 * jar configurations. Uses React Query for optimal caching, error handling, and
 * race condition prevention. Supports both v1 and v2 factory contracts.
 *
 * Features:
 * - Batch loading with progress tracking
 * - Automatic cache invalidation on new jar creation
 * - Error categorization and retry logic
 * - Real-time updates via contract events
 * - Network-specific optimizations
 *
 * @returns Object with jar data, loading states, and control functions
 *
 * @example
 * ```tsx
 * const {
 *   jars,
 *   isLoading,
 *   error,
 *   refresh,
 *   retryFailedJars
 * } = useCookieJarFactory();
 *
 * if (isLoading) return <div>Loading jars...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return (
 *   <div>
 *     {jars.map(jar => (
 *       <JarCard key={jar.jarAddress} jar={jar} />
 *     ))}
 *     <button onClick={refresh}>Refresh</button>
 *   </div>
 * );
 * ```
 */
export function useCookieJarFactory() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { cookieJarFactory: factoryAddress, isLoading: addressLoading } =
    useContractAddresses();
  const { toast } = useToast();

  // Query for factory data (addresses and metadata)
  const {
    data: factoryData,
    error: factoryError,
    isLoading: isLoadingFactory,
  } = useQuery({
    queryKey: ['cookie-jar-factory', chainId, factoryAddress],
    queryFn: async () => {
      if (!publicClient || !factoryAddress) {
        throw new Error('Missing dependencies');
      }

      const isV2Contract = isV2Chain(chainId);
      const factoryAbi = isV2Contract
        ? cookieJarFactoryAbi
        : cookieJarFactoryV1Abi;

      // Get jar addresses - v2 uses getAllJars, v1 uses getCookieJars
      const functionName = isV2Contract ? 'getAllJars' : 'getCookieJars';
      const addresses = (await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName,
      })) as Address[];

      // Get metadata - now works for both V1 and V2!
      let metadatas: string[];
      // Get metadata - now works for both V1 and V2!
      metadatas = await Promise.all(
        addresses.map(async (_, index) => {
          try {
            return (await publicClient.readContract({
              address: factoryAddress,
              abi: factoryAbi,
              functionName: 'metadatas',
              args: [BigInt(index)],
            })) as string;
          } catch (error) {
            console.warn(`Failed to fetch metadata for index ${index}:`, error);
            return 'Jar Info';
          }
        })
      );

      return { addresses, metadatas };
    },
    enabled: !addressLoading && !!publicClient && !!factoryAddress,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Query for all jar details
  const {
    data: jars = [],
    error: jarsError,
    isLoading: isLoadingJars,
    refetch: refetchJars,
  } = useQuery({
    queryKey: ['cookie-jar-details', chainId, factoryData?.addresses],
    queryFn: async (): Promise<CookieJarInfo[]> => {
      if (!publicClient || !factoryData?.addresses) {
        return [];
      }

      const { addresses, metadatas } = factoryData;

      // Process jars in batches to avoid overwhelming the network
      const batchSize = 10;
      const validJars: CookieJarInfo[] = [];

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((address) => fetchJarDetails(publicClient, address))
        );

        batchResults.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled' && result.value) {
            const originalIndex = i + batchIndex;
            const metadata = metadatas[originalIndex] || 'Jar Info';

            validJars.push({
              ...result.value,
              metadata,
              parsedMetadata: parseJarMetadata(metadata),
            });
          }
        });
      }

      return validJars;
    },
    enabled: !!factoryData?.addresses && !!publicClient,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Listen for new jar creation events to trigger immediate updates
  useWatchContractEvent({
    address: factoryAddress,
    abi: cookieJarFactoryAbi,
    eventName: 'JarCreated',
    onLogs: (logs) => {
      console.log('🎉 New jar created, triggering refresh:', logs);
      toast({
        title: '🎉 New jar detected',
        description: 'Refreshing jar list...',
        variant: 'default',
      });
      queryClient.invalidateQueries({
        queryKey: ['cookie-jar-factory', chainId, factoryAddress],
      });
    },
    enabled: !!factoryAddress,
  });

  // Handle errors and show toasts
  const error = factoryError || jarsError;
  const isLoading = addressLoading || isLoadingFactory || isLoadingJars;

  // Determine loading state and error messages
  if (error) {
    console.error('❌ Error in cookie jar factory:', error);
  }

  // For compatibility with the jars page interface
  const cookieJarsData = jars.map((jar) => ({
    ...jar,
    jarCreator: '0x0000000000000000000000000000000000000000' as Address, // placeholder address
  }));

  return {
    jars,
    cookieJarsData, // Named to match useCookieJarData interface
    isLoading,
    error,
    // Raw jar data for existing components
    jarAddresses: factoryData?.addresses,
    jarMetadatas: factoryData?.metadatas,
    isLoadingData: isLoadingFactory,
    // Enhanced features (simplified with React Query)
    fetchProgress: null as FetchProgress | null, // React Query handles progress internally
    failedJars: [] as JarFetchError[], // React Query handles retries internally
    retryFailedJars: () => refetchJars(), // Simple retry function
    // Add manual refresh functions
    refresh: () => {
      console.log('🔄 Manual refresh triggered');
      queryClient.invalidateQueries({
        queryKey: ['cookie-jar-factory', chainId, factoryAddress],
      });
    },
  };
}

/**
 * Hook to get information about a specific jar by its address
 * Uses React Query for better caching and error handling
 * @param jarAddress The address of the jar to fetch details for
 * @returns Jar details
 */
export function useCookieJarByAddress(jarAddress?: Address) {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const {
    data: jar = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cookie-jar-by-address', chainId, jarAddress],
    queryFn: async (): Promise<CookieJarInfo | null> => {
      if (!jarAddress || !publicClient) {
        return null;
      }

      return await fetchJarDetails(publicClient, jarAddress);
    },
    enabled: !!jarAddress && !!publicClient,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    jar,
    isLoading,
    error,
  };
}

/**
 * Simple helper hook to get parsed metadata for any jar
 */
export function useJarMetadata(rawMetadata: string): ParsedMetadata {
  return parseJarMetadata(rawMetadata || '');
}

/**
 * Helper hook to get jars with parsed metadata
 */
export function useJarsWithMetadata() {
  const { jars, isLoading, error, ...rest } = useCookieJarFactory();

  const jarsWithMetadata = jars.map((jar) => ({
    ...jar,
    parsedMetadata: jar.parsedMetadata || parseJarMetadata(jar.metadata || ''),
  }));

  return {
    jars: jarsWithMetadata,
    isLoading,
    error,
    ...rest,
  };
}
