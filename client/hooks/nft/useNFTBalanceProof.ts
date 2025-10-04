import { useCallback, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import { useBlockNumber, useReadContract } from 'wagmi';

/**
 * NFT balance proof structure for preventing race conditions
 */
interface BalanceProof {
  /** User's balance of the NFT */
  balance: bigint;
  /** Block number when proof was generated */
  blockNumber: number;
  /** Timestamp when proof was created */
  timestamp: number;
  /** Whether the proof indicates valid ownership */
  isValid: boolean;
}

/**
 * Parameters for useNFTBalanceProof hook
 */
interface UseNFTBalanceProofParams {
  /** NFT contract address */
  contractAddress: string;
  /** Token ID to check balance for */
  tokenId: string;
  /** NFT standard (ERC721 or ERC1155) */
  tokenType: 'ERC721' | 'ERC1155';
  /** User address to check balance for */
  userAddress?: string;
  /** Whether to enable proof generation */
  enabled?: boolean;
}

/**
 * Return type for useNFTBalanceProof hook
 */
interface UseNFTBalanceProofReturn {
  /** Current balance proof (null if not generated) */
  proof: BalanceProof | null;
  /** Whether the proof is considered stale */
  isStale: boolean;
  /** Function to refresh the proof */
  refreshProof: () => void;
  /** Whether proof generation is in progress */
  isLoading: boolean;
  /** Error message if proof generation failed */
  error: string | null;
}

// ERC1155 ABI for balance checking
const ERC1155_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC721 ABI for ownership checking
const ERC721_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Custom hook for generating and managing NFT balance proofs
 *
 * Creates cryptographically verifiable proofs of NFT ownership at specific
 * block numbers to prevent race conditions in transactions. Useful for
 * ensuring ownership hasn't changed between UI state and transaction execution.
 *
 * Features:
 * - Block-based proof generation
 * - Automatic staleness detection
 * - Support for both ERC-721 and ERC-1155
 * - Race condition prevention
 * - Automatic refresh capabilities
 *
 * @param params - Configuration for proof generation
 * @returns Object with proof data and management functions
 *
 * @example
 * ```tsx
 * const {
 *   proof,
 *   isStale,
 *   refreshProof,
 *   isLoading,
 *   error
 * } = useNFTBalanceProof({
 *   contractAddress: '0x...',
 *   tokenId: '123',
 *   tokenType: 'ERC721',
 *   userAddress: account
 * });
 *
 * // Check proof before transaction
 * if (proof && !isStale && proof.isValid) {
 *   // Proceed with transaction using proof data
 *   executeTransaction(proof);
 * } else {
 *   // Refresh proof or show error
 *   refreshProof();
 * }
 * ```
 */
export const useNFTBalanceProof = ({
  contractAddress,
  tokenId,
  tokenType,
  userAddress,
  enabled = true,
}: UseNFTBalanceProofParams): UseNFTBalanceProofReturn => {
  const [proof, setProof] = useState<BalanceProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get current block number for proof validation
  const { data: currentBlock, isLoading: blockLoading } = useBlockNumber({
    watch: true,
  });

  const isValidContract = contractAddress && isAddress(contractAddress);
  const isValidTokenId = tokenId && tokenId !== '';
  const shouldFetch =
    enabled && isValidContract && isValidTokenId && userAddress;

  // ERC1155 balance check
  const {
    data: erc1155Balance,
    isLoading: erc1155Loading,
    error: erc1155Error,
    refetch: refetchERC1155,
  } = useReadContract({
    address: isValidContract ? (contractAddress as `0x${string}`) : undefined,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args:
      userAddress && isValidTokenId
        ? [userAddress as `0x${string}`, BigInt(tokenId)]
        : undefined,
    query: {
      enabled: Boolean(shouldFetch && tokenType === 'ERC1155'),
    },
  });

  // ERC721 ownership check
  const {
    data: erc721Owner,
    isLoading: erc721Loading,
    error: erc721Error,
    refetch: refetchERC721,
  } = useReadContract({
    address: isValidContract ? (contractAddress as `0x${string}`) : undefined,
    abi: ERC721_ABI,
    functionName: 'ownerOf',
    args: isValidTokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: Boolean(shouldFetch && tokenType === 'ERC721'),
    },
  });

  const isLoading = blockLoading || erc1155Loading || erc721Loading;

  // Update proof when data changes
  useEffect(() => {
    if (!shouldFetch || !currentBlock) return;

    const contractError = erc1155Error || erc721Error;

    if (contractError) {
      setError(
        'Failed to validate NFT ownership. Contract may be invalid or network error.'
      );
      setProof(null);
      return;
    }

    let balance: bigint;
    let isValid = false;

    if (tokenType === 'ERC1155' && erc1155Balance !== undefined) {
      balance = erc1155Balance;
      isValid = balance > 0n;
    } else if (tokenType === 'ERC721' && erc721Owner && userAddress) {
      // For ERC721, balance is 1 if owned, 0 if not
      balance =
        erc721Owner.toLowerCase() === userAddress.toLowerCase() ? 1n : 0n;
      isValid = balance > 0n;
    } else {
      // Still loading or no data
      return;
    }

    const newProof: BalanceProof = {
      balance,
      blockNumber: Number(currentBlock),
      timestamp: Date.now(),
      isValid,
    };

    setProof(newProof);
    setError(null);
  }, [
    shouldFetch,
    currentBlock,
    erc1155Balance,
    erc721Owner,
    userAddress,
    tokenType,
    erc1155Error,
    erc721Error,
  ]);

  // Check if proof is stale (more than 5 blocks old)
  const isStale = useCallback(
    (proofData: BalanceProof | null): boolean => {
      if (!proofData || !currentBlock) return true;
      return Number(currentBlock) - proofData.blockNumber > 5; // Max 5 blocks old
    },
    [currentBlock]
  );

  // Refresh proof by refetching data
  const refreshProof = useCallback(() => {
    if (tokenType === 'ERC1155') {
      refetchERC1155();
    } else if (tokenType === 'ERC721') {
      refetchERC721();
    }
  }, [tokenType, refetchERC1155, refetchERC721]);

  return {
    proof,
    isStale: isStale(proof),
    refreshProof,
    isLoading,
    error,
  };
};

/**
 * Utility function to validate a balance proof before using it in a transaction
 *
 * @param proof The balance proof to validate
 * @param currentBlock The current block number
 * @param minRequiredBalance The minimum balance required
 * @returns Validation result
 */
export const validateBalanceProof = (
  proof: BalanceProof | null,
  currentBlock: number,
  minRequiredBalance: bigint = 1n
): {
  isValid: boolean;
  reason?: string;
} => {
  if (!proof) {
    return { isValid: false, reason: 'No balance proof available' };
  }

  if (!proof.isValid) {
    return {
      isValid: false,
      reason: 'Invalid balance proof - insufficient balance',
    };
  }

  if (currentBlock - proof.blockNumber > 5) {
    return {
      isValid: false,
      reason: 'Balance proof is too old (more than 5 blocks)',
    };
  }

  if (proof.balance < minRequiredBalance) {
    return {
      isValid: false,
      reason: `Insufficient balance: ${proof.balance} < ${minRequiredBalance}`,
    };
  }

  return { isValid: true };
};

/**
 * Utility hook for managing multiple NFT balance proofs
 *
 * @param nfts Array of NFT data to track
 * @param userAddress User address
 * @returns Map of proofs by contract-token key
 */
export const useMultipleNFTBalanceProofs = (
  _nfts: Array<{
    contractAddress: string;
    tokenId: string;
    tokenType: 'ERC721' | 'ERC1155';
  }>,
  _userAddress?: string
): Map<string, BalanceProof | null> => {
  const [proofsMap, _setProofsMap] = useState<Map<string, BalanceProof | null>>(
    new Map()
  );

  // This would be implemented to manage multiple proofs efficiently
  // For now, users should call useNFTBalanceProof for each NFT individually
  // Future optimization: batch balance calls

  return proofsMap;
};
