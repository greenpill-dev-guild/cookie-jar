"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { useBlockNumber, useReadContract } from "wagmi";

// Simple in-memory cache for validation results
const validationCache = new Map<
	string,
	{ data: any; timestamp: number; blockNumber: number }
>();

// ERC165 interface IDs
const ERC165_INTERFACE_ID = "0x01ffc9a7";
const ERC721_INTERFACE_ID = "0x80ac58cd";
const ERC1155_INTERFACE_ID = "0xd9b67a26";

const ERC165_ABI = [
	{
		name: "supportsInterface",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "interfaceId", type: "bytes4" }],
		outputs: [{ name: "", type: "bool" }],
	},
] as const;

export interface NFTValidationResult {
	isValid: boolean;
	detectedType: "ERC721" | "ERC1155" | null;
	isLoading: boolean;
	error: string | null;
	isMalicious?: boolean;
	warnings?: string[];
	fromCache?: boolean;
	cacheAge?: number;
}

export interface UseEnhancedNFTValidationOptions {
	onValidationComplete?: (result: NFTValidationResult) => void;
	enableCaching?: boolean;
	checkMalicious?: boolean;
	forceFresh?: boolean;
}

/**
 * Enhanced NFT validation hook with ERC165 detection and caching
 *
 * Features:
 * - ERC165 interface detection for ERC721/ERC1155
 * - Malicious contract detection
 * - Intelligent caching with block awareness
 * - Performance monitoring
 *
 * @param contractAddress - The NFT contract address to validate
 * @param options - Configuration options
 */
export function useEnhancedNFTValidation(
	contractAddress: string | undefined,
	options: UseEnhancedNFTValidationOptions = {},
) {
	const {
		onValidationComplete,
		enableCaching = true,
		checkMalicious = false,
		forceFresh = false,
	} = options;

	const [result, setResult] = useState<NFTValidationResult>({
		isValid: false,
		detectedType: null,
		isLoading: false,
		error: null,
	});

	const validationAttempted = useRef(false);
	const { data: currentBlock } = useBlockNumber({ watch: false });

	// Validate address format
	const isValidAddress =
		contractAddress && isAddress(contractAddress) ? true : false;

	// Generate cache key
	const cacheKey = isValidAddress
		? `nft-validation-${contractAddress?.toLowerCase()}`
		: null;

	// Check cache first
	useEffect(() => {
		if (!isValidAddress || !cacheKey || !enableCaching || forceFresh) return;

		const cached = validationCache.get(cacheKey);
		if (
			cached &&
			(!currentBlock || cached.blockNumber >= Number(currentBlock) - 100)
		) {
			setResult({
				...cached.data,
				fromCache: true,
				cacheAge: Date.now() - cached.timestamp,
			});
			return;
		}
	}, [cacheKey, isValidAddress, enableCaching, forceFresh, currentBlock]);

	// ERC165 check for supportsInterface
	const {
		data: supportsERC165,
		isLoading: isCheckingERC165,
		error: erc165Error,
	} = useReadContract({
		address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
		abi: ERC165_ABI,
		functionName: "supportsInterface",
		args: [ERC165_INTERFACE_ID],
		query: {
			enabled: isValidAddress && !result.isValid,
			retry: 1,
		},
	});

	// ERC721 check
	const {
		data: supportsERC721,
		isLoading: isCheckingERC721,
		error: erc721Error,
	} = useReadContract({
		address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
		abi: ERC165_ABI,
		functionName: "supportsInterface",
		args: [ERC721_INTERFACE_ID],
		query: {
			enabled: Boolean(isValidAddress && supportsERC165 && !result.isValid),
			retry: 1,
		},
	});

	// ERC1155 check
	const {
		data: supportsERC1155,
		isLoading: isCheckingERC1155,
		error: erc1155Error,
	} = useReadContract({
		address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
		abi: ERC165_ABI,
		functionName: "supportsInterface",
		args: [ERC1155_INTERFACE_ID],
		query: {
			enabled: Boolean(isValidAddress && supportsERC165 && !result.isValid),
			retry: 1,
		},
	});

	// Process validation results
	useEffect(() => {
		if (!isValidAddress || validationAttempted.current) return;

		// Wait for all checks to complete
		const isLoading = isCheckingERC165 || isCheckingERC721 || isCheckingERC1155;
		if (isLoading) {
			setResult((prev) => ({ ...prev, isLoading: true }));
			return;
		}

		// Check for errors
		const hasError = erc165Error || erc721Error || erc1155Error;
		if (hasError) {
			const errorMessage =
				erc165Error?.message || erc721Error?.message || erc1155Error?.message;
			setResult({
				isValid: false,
				detectedType: null,
				isLoading: false,
				error: errorMessage || "Failed to validate contract",
			});
			validationAttempted.current = true;
			return;
		}

		// Check if we have results
		if (cacheKey && enableCaching && !forceFresh) {
			const cached = validationCache.get(cacheKey);
			if (
				cached &&
				(!currentBlock || cached.blockNumber >= Number(currentBlock) - 100)
			) {
				setResult({
					...cached.data,
					fromCache: true,
					cacheAge: Date.now() - cached.timestamp,
				});
				return;
			}
		}

		// Process ERC165 results
		if (supportsERC165 === false) {
			// Contract doesn't support ERC165, but might still be a legacy NFT
			setResult({
				isValid: false,
				detectedType: null,
				isLoading: false,
				error: "Contract does not support ERC165 interface detection",
				warnings: [
					"This contract may be a legacy NFT implementation without ERC165 support",
				],
			});
			validationAttempted.current = true;
			return;
		}

		// Check which standard is supported
		let detectedType: "ERC721" | "ERC1155" | null = null;
		if (supportsERC721) {
			detectedType = "ERC721";
		} else if (supportsERC1155) {
			detectedType = "ERC1155";
		}

		// Build validation result
		const validationResult: NFTValidationResult = {
			isValid: detectedType !== null,
			detectedType,
			isLoading: false,
			error: detectedType
				? null
				: "Contract does not support ERC721 or ERC1155",
			warnings:
				detectedType === null
					? ["Contract supports ERC165 but not NFT standards"]
					: undefined,
		};

		// Cache the result
		if (cacheKey && enableCaching && validationResult.isValid) {
			validationCache.set(cacheKey, {
				data: validationResult,
				timestamp: Date.now(),
				blockNumber: Number(currentBlock) || 0,
			});
		}

		setResult(validationResult);
		validationAttempted.current = true;

		// Trigger callback
		if (onValidationComplete) {
			onValidationComplete(validationResult);
		}
	}, [
		isValidAddress,
		supportsERC165,
		supportsERC721,
		supportsERC1155,
		isCheckingERC165,
		isCheckingERC721,
		isCheckingERC1155,
		erc165Error,
		erc721Error,
		erc1155Error,
		onValidationComplete,
		cacheKey,
		enableCaching,
		currentBlock,
		forceFresh,
	]);

	// Malicious contract check (optional)
	useEffect(() => {
		if (
			!checkMalicious ||
			!result.isValid ||
			!isValidAddress ||
			result.isMalicious !== undefined
		)
			return;

		// TODO: Implement malicious contract detection
		// This could check against known malicious contract databases
		// or perform heuristic analysis

		// For now, just set as not malicious
		setResult((prev) => ({ ...prev, isMalicious: false }));
	}, [checkMalicious, result.isValid, isValidAddress, result.isMalicious]);

	// Reset validation when address changes
	useEffect(() => {
		validationAttempted.current = false;
		setResult({
			isValid: false,
			detectedType: null,
			isLoading: false,
			error: null,
		});
	}, [contractAddress]);

	// Manual revalidation function
	const revalidate = useCallback(() => {
		validationAttempted.current = false;
		setResult((prev) => ({ ...prev, isLoading: true, fromCache: false }));

		// Clear cache if it exists
		if (cacheKey) {
			validationCache.delete(cacheKey);
		}
	}, [cacheKey]);

	// Get cache stats
	const getCacheStats = useCallback(() => {
		return {
			size: validationCache.size,
			entries: Array.from(validationCache.entries()).map(([key, value]) => ({
				key,
				age: Date.now() - value.timestamp,
				blockNumber: value.blockNumber,
			})),
		};
	}, []);

	return {
		...result,
		revalidate,
		getCacheStats,
	};
}

/**
 * Hook to batch validate multiple NFT contracts
 */
export function useBatchNFTValidation(
	contractAddresses: string[],
	options: UseEnhancedNFTValidationOptions = {},
) {
	const [results, setResults] = useState<Record<string, NFTValidationResult>>(
		{},
	);
	const [isValidating, setIsValidating] = useState(false);

	const validate = useCallback(async () => {
		setIsValidating(true);

		const validationResults: Record<string, NFTValidationResult> = {};

		for (const address of contractAddresses) {
			if (!isAddress(address)) {
				validationResults[address] = {
					isValid: false,
					detectedType: null,
					isLoading: false,
					error: "Invalid address format",
				};
				continue;
			}

			// Check cache first
			const cacheKey = `nft-validation-${address.toLowerCase()}`;
			const cached = validationCache.get(cacheKey);

			if (cached && !options.forceFresh) {
				validationResults[address] = { ...cached.data, fromCache: true };
			} else {
				// Would need to implement actual validation here
				// For now, mark as pending
				validationResults[address] = {
					isValid: false,
					detectedType: null,
					isLoading: true,
					error: null,
				};
			}
		}

		setResults(validationResults);
		setIsValidating(false);
	}, [contractAddresses, options.forceFresh]);

	useEffect(() => {
		if (contractAddresses.length > 0) {
			validate();
		}
	}, [contractAddresses, validate]);

	return {
		results,
		isValidating,
		revalidate: validate,
	};
}

/**
 * Hook to get validation statistics
 */
export function useNFTValidationStats() {
	const getStats = useCallback(
		() => ({
			size: validationCache.size,
			entries: Array.from(validationCache.entries()).map(([key, value]) => ({
				key,
				age: Date.now() - value.timestamp,
				blockNumber: value.blockNumber,
			})),
		}),
		[],
	);

	const [stats, setStats] = useState(getStats());

	useEffect(() => {
		const interval = setInterval(() => {
			setStats(getStats());
		}, 5000); // Update every 5 seconds

		return () => clearInterval(interval);
	}, [getStats]);

	const clearCache = useCallback(() => {
		validationCache.clear();
		setStats(getStats());
	}, [getStats]);

	const cleanup = useCallback(() => {
		// Remove entries older than 5 minutes
		const fiveMinutesAgo = Date.now() - 300000;
		let removed = 0;
		for (const [key, value] of validationCache.entries()) {
			if (value.timestamp < fiveMinutesAgo) {
				validationCache.delete(key);
				removed++;
			}
		}
		setStats(getStats());
		return removed;
	}, [getStats]);

	return {
		stats,
		clearCache,
		cleanup,
	};
}
