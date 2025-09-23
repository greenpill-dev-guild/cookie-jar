import { isAddress } from "viem";
import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";

/**
 * Hypercert claim data structure
 * Note: Real implementation would import from @hypercerts-org/sdk
 */
interface HypercertClaim {
  /** Contract address of the hypercert */
  contract: string;
  /** Token ID within the contract */
  tokenId: string;
  /** Claim information and metadata */
  claim: {
    /** Unique claim identifier */
    claimId: string;
    /** Display name of the hypercert */
    name?: string;
    /** Description of the impact work */
    description?: string;
    /** Image URL for the hypercert */
    image?: string;
    /** External URL for more information */
    external_url?: string;
    /** Address of the claim creator */
    creator: string;
    /** Total supply of hypercert fractions */
    totalSupply: string;
    /** Structured metadata */
    metadata?: {
      /** Scope of work performed */
      work_scope?: string[];
      /** Scope of impact created */
      impact_scope?: string[];
      /** Timeframe when work was performed */
      work_timeframe?: {
        from: number;
        to: number;
      };
      /** Timeframe of expected impact */
      impact_timeframe?: {
        from: number;
        to: number;
      };
    };
  };
  /** User's balance of this hypercert */
  balance: string;
  /** User's ownership percentage */
  percentage: string;
}

/**
 * Options for configuring the useHypercerts hook
 */
interface UseHypercertsOptions {
  /** Specific hypercert contract address to check */
  tokenContract?: string;
  /** Specific token ID to check */
  tokenId?: string;
  /** Whether to fetch user's hypercerts automatically */
  fetchUserHypercerts?: boolean;
  /** Whether to include detailed metadata */
  withMetadata?: boolean;
}

/**
 * Return type for useHypercerts hook
 */
interface UseHypercertsResult {
  /** Array of user's hypercert claims */
  userHypercerts: HypercertClaim[];
  /** Specific hypercert info (if contract/tokenId provided) */
  hypercertInfo: HypercertClaim | null;
  /** User's balance of specific hypercert */
  userBalance: bigint;
  /** Overall loading state */
  isLoading: boolean;
  /** Loading state for user hypercerts */
  isLoadingHypercerts: boolean;
  /** Loading state for balance checking */
  isLoadingBalance: boolean;
  /** General error state */
  error: string | null;
  /** Error specific to hypercert fetching */
  hypercertsError: string | null;
  /** Error specific to balance checking */
  balanceError: string | null;
  /** Function to search for hypercerts */
  searchHypercerts: (query: string) => Promise<HypercertClaim[]>;
  /** Function to validate a specific hypercert */
  validateHypercert: (
    contract: string,
    tokenId: string,
  ) => Promise<HypercertClaim | null>;
  /** Function to check if user has minimum balance */
  checkUserBalance: (
    contract: string,
    tokenId: string,
    minBalance: string,
  ) => boolean;
  /** Function to refetch all data */
  refetch: () => void;
}

// ERC1155 ABI for balance checking
const ERC1155_ABI = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Custom hook for Hypercerts protocol integration
 * 
 * Provides comprehensive Hypercerts functionality including impact certificate
 * validation, ownership verification, and metadata fetching. Uses ERC-1155
 * standard for balance checking with Hypercerts-specific data structures.
 * 
 * Features:
 * - Impact certificate validation
 * - Fractional ownership tracking
 * - Work and impact scope metadata
 * - Balance verification for access control
 * - Search functionality for discovering certificates
 * - ERC-1155 compatible balance checking
 * 
 * @param options - Configuration options for Hypercerts functionality
 * @returns Object with hypercert data, balances, and utility functions
 * 
 * @example
 * ```tsx
 * const {
 *   userHypercerts,
 *   hypercertInfo,
 *   userBalance,
 *   checkUserBalance,
 *   isLoading
 * } = useHypercerts({
 *   tokenContract: '0x...',
 *   tokenId: '123',
 *   fetchUserHypercerts: true,
 *   withMetadata: true
 * });
 * 
 * if (isLoading) return <div>Loading certificates...</div>;
 * 
 * return (
 *   <div>
 *     {hypercertInfo && (
 *       <div>
 *         <h2>{hypercertInfo.claim.name}</h2>
 *         <p>Your share: {hypercertInfo.percentage}%</p>
 *         <p>Balance: {userBalance.toString()}</p>
 *       </div>
 *     )}
 *     {userHypercerts.map(cert => (
 *       <CertificateCard key={cert.claim.claimId} hypercert={cert} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useHypercerts(
  options: UseHypercertsOptions = {},
): UseHypercertsResult {
  const { address: userAddress } = useAccount();
  const [userHypercerts, setUserHypercerts] = useState<HypercertClaim[]>([]);
  const [hypercertInfo, setHypercertInfo] = useState<HypercertClaim | null>(
    null,
  );
  const [isLoadingHypercerts, setIsLoadingHypercerts] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [hypercertsError, setHypercertsError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const isLoading = isLoadingHypercerts || isLoadingBalance;
  const error = hypercertsError || balanceError;

  // Get user's balance for specific hypercert using on-chain call
  const {
    data: userBalance,
    isLoading: isCheckingBalance,
    error: onChainBalanceError,
    refetch: refetchBalance,
  } = useReadContract({
    address:
      options.tokenContract && isAddress(options.tokenContract)
        ? (options.tokenContract as `0x${string}`)
        : undefined,
    abi: ERC1155_ABI,
    functionName: "balanceOf",
    args:
      userAddress && options.tokenId
        ? [userAddress, BigInt(options.tokenId)]
        : undefined,
    query: {
      enabled: !!(options.tokenContract && options.tokenId && userAddress),
    },
  });

  // Get total supply for the hypercert
  const { data: totalSupply } = useReadContract({
    address:
      options.tokenContract && isAddress(options.tokenContract)
        ? (options.tokenContract as `0x${string}`)
        : undefined,
    abi: ERC1155_ABI,
    functionName: "totalSupply",
    args: options.tokenId ? [BigInt(options.tokenId)] : undefined,
    query: {
      enabled: !!(options.tokenContract && options.tokenId),
    },
  });

  // Get metadata URI
  const { data: tokenURI } = useReadContract({
    address:
      options.tokenContract && isAddress(options.tokenContract)
        ? (options.tokenContract as `0x${string}`)
        : undefined,
    abi: ERC1155_ABI,
    functionName: "uri",
    args: options.tokenId ? [BigInt(options.tokenId)] : undefined,
    query: {
      enabled: !!(options.tokenContract && options.tokenId),
    },
  });

  // Fetch user's hypercerts
  const fetchUserHypercerts = async (address: string) => {
    setIsLoadingHypercerts(true);
    setHypercertsError(null);

    try {
      // Note: This is a mock implementation
      // Real implementation would use Hypercerts SDK:
      // import { HypercertsSDK } from '@hypercerts-org/sdk'
      // const sdk = new HypercertsSDK()
      // const hypercerts = await sdk.getUserHypercerts(address)

      // Mock data for demonstration
      const mockHypercerts: HypercertClaim[] = [
        {
          contract: "0x1234567890123456789012345678901234567890",
          tokenId: "1",
          claim: {
            claimId: "1",
            name: "Ocean Cleanup Initiative",
            description: "Removed 100kg of plastic from ocean",
            image: "https://example.com/hypercert1.png",
            creator: address,
            totalSupply: "1000000",
            metadata: {
              work_scope: ["Ocean cleanup", "Environmental restoration"],
              impact_scope: ["Environmental impact", "Ocean health"],
              work_timeframe: { from: 1640995200, to: 1672531200 }, // 2022
              impact_timeframe: { from: 1640995200, to: 1735689600 }, // 2022-2025
            },
          },
          balance: "250000",
          percentage: "25",
        },
        {
          contract: "0x1234567890123456789012345678901234567890",
          tokenId: "2",
          claim: {
            claimId: "2",
            name: "Carbon Offset Project",
            description: "Sequestered 50 tons of CO2 through reforestation",
            image: "https://example.com/hypercert2.png",
            creator: address,
            totalSupply: "500000",
            metadata: {
              work_scope: ["Reforestation", "Carbon sequestration"],
              impact_scope: ["Climate impact", "Carbon reduction"],
              work_timeframe: { from: 1640995200, to: 1672531200 },
              impact_timeframe: { from: 1640995200, to: 2020281600 }, // Long-term impact
            },
          },
          balance: "100000",
          percentage: "20",
        },
      ];

      setUserHypercerts(mockHypercerts);
    } catch (error) {
      console.error("Error fetching user hypercerts:", error);
      setHypercertsError("Failed to fetch your hypercert collection");
    } finally {
      setIsLoadingHypercerts(false);
    }
  };

  // Validate specific hypercert
  const validateHypercert = async (
    contract: string,
    tokenId: string,
  ): Promise<HypercertClaim | null> => {
    if (!isAddress(contract) || isNaN(Number(tokenId))) {
      throw new Error("Invalid contract address or token ID");
    }

    setIsLoadingBalance(true);
    setBalanceError(null);

    try {
      // Note: This is a mock implementation
      // Real implementation would fetch from Hypercerts API or on-chain

      const mockClaim: HypercertClaim = {
        contract,
        tokenId,
        claim: {
          claimId: tokenId,
          name: `Environmental Impact Certificate #${tokenId}`,
          description: "Verified environmental impact contribution",
          image: "https://example.com/hypercert.png",
          creator: "0x1234567890123456789012345678901234567890",
          totalSupply: totalSupply?.toString() || "1000000",
        },
        balance: userBalance?.toString() || "0",
        percentage:
          userBalance && totalSupply
            ? ((Number(userBalance) / Number(totalSupply)) * 100).toFixed(2)
            : "0",
      };

      setHypercertInfo(mockClaim);
      return mockClaim;
    } catch (error) {
      console.error("Error validating hypercert:", error);
      setBalanceError("Invalid hypercert or contract not found");
      setHypercertInfo(null);
      return null;
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Search for hypercerts
  const searchHypercerts = async (query: string): Promise<HypercertClaim[]> => {
    try {
      // Note: This is a mock implementation
      // Real implementation would use Hypercerts SDK search

      const mockResults: HypercertClaim[] = [
        {
          contract: "0x1234567890123456789012345678901234567890",
          tokenId: "1",
          claim: {
            claimId: "1",
            name: `${query} Impact Certificate`,
            description: "Verified impact contribution",
            creator: "0x1234567890123456789012345678901234567890",
            totalSupply: "1000000",
          },
          balance: "0",
          percentage: "0",
        },
      ];

      return mockResults;
    } catch (error) {
      console.error("Error searching hypercerts:", error);
      return [];
    }
  };

  // Check if user has sufficient balance
  const checkUserBalance = (
    contract: string,
    tokenId: string,
    minBalance: string,
  ): boolean => {
    if (!userBalance || !minBalance) return false;
    return userBalance >= BigInt(minBalance);
  };

  // Refetch all data
  const refetch = () => {
    if (userAddress && options.fetchUserHypercerts) {
      fetchUserHypercerts(userAddress);
    }
    if (options.tokenContract && options.tokenId) {
      validateHypercert(options.tokenContract, options.tokenId);
    }
    refetchBalance();
  };

  // Auto-fetch user hypercerts when enabled
  useEffect(() => {
    if (userAddress && options.fetchUserHypercerts) {
      fetchUserHypercerts(userAddress);
    }
  }, [userAddress, options.fetchUserHypercerts]);

  // Auto-validate specific hypercert when provided
  useEffect(() => {
    if (options.tokenContract && options.tokenId) {
      validateHypercert(options.tokenContract, options.tokenId);
    }
  }, [options.tokenContract, options.tokenId, userBalance, totalSupply]);

  // Handle on-chain balance errors
  useEffect(() => {
    if (onChainBalanceError) {
      setBalanceError("Failed to check hypercert balance");
    }
  }, [onChainBalanceError]);

  return {
    userHypercerts,
    hypercertInfo,
    userBalance: userBalance || BigInt(0),
    isLoading,
    isLoadingHypercerts,
    isLoadingBalance: isLoadingBalance || isCheckingBalance,
    error,
    hypercertsError,
    balanceError,
    searchHypercerts,
    validateHypercert,
    checkUserBalance,
    refetch,
  };
}
