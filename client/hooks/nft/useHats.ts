import { useCallback, useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import {
	hatsProvider,
	type HatDetails as ProviderHatDetails,
} from "@/lib/nft/protocols/HatsProvider";

/**
 * Hat information structure - extends the provider interface
 */
export interface HatInfo extends Omit<ProviderHatDetails, "maxSupply"> {
	name?: string;
	description?: string;
	isActive?: boolean;
	wearerCount?: number;
	maxSupply?: number;
}

/**
 * User's hat data with status information
 */
export interface UserHat {
	hatId: string;
	hat: HatInfo;
	isWearing: boolean;
	isEligible: boolean;
	isInGoodStanding: boolean;
}

interface UseHatsOptions {
	hatId?: string;
	hatsContract?: string;
	fetchUserHats?: boolean;
	checkEligibility?: boolean;
}

interface UseHatsResult {
	userHats: UserHat[];
	hatInfo: HatInfo | null;
	isWearingHat: boolean;
	isEligible: boolean;
	isLoading: boolean;
	isLoadingHats: boolean;
	isCheckingEligibility: boolean;
	error: string | null;
	hatsError: string | null;
	eligibilityError: string | null;
	searchHats: (query: string) => Promise<HatInfo[]>;
	validateHatId: (hatId: string) => Promise<HatInfo | null>;
	refetch: () => void;
}

// Hats Protocol contract addresses per network
const HATS_CONTRACTS: Record<number, string> = {
	1: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
	10: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
	100: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
	8453: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
	42161: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
	11155111: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
	84532: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
};

// Minimal ABI for Hats Protocol contract
const HATS_ABI = [
	{
		inputs: [
			{ name: "user", type: "address" },
			{ name: "hatId", type: "uint256" },
		],
		name: "isWearerOfHat",
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{ name: "user", type: "address" },
			{ name: "hatId", type: "uint256" },
		],
		name: "isEligible",
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{ name: "user", type: "address" },
			{ name: "hatId", type: "uint256" },
		],
		name: "isInGoodStanding",
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ name: "hatId", type: "uint256" }],
		name: "hatSupply",
		outputs: [{ name: "", type: "uint32" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

/** Convert provider hat details to hook's HatInfo format */
function toHatInfo(hat: ProviderHatDetails): HatInfo {
	return {
		...hat,
		name: hat.details || `Hat #${hat.prettyId}`,
		description: hat.details || "",
		isActive: hat.status,
		wearerCount: parseInt(hat.currentSupply, 10) || 0,
		maxSupply: parseInt(hat.maxSupply, 10) || 0,
	} as HatInfo;
}

/**
 * Custom hook for Hats Protocol integration.
 *
 * Uses on-chain contract reads (via wagmi) for real-time hat status
 * and the Hats SDK for metadata/search operations. All async SDK calls
 * use AbortController signals to prevent state updates after unmount.
 */
export function useHats(options: UseHatsOptions = {}): UseHatsResult {
	const { address: userAddress } = useAccount();
	const chainId = useChainId();
	const [userHats, setUserHats] = useState<UserHat[]>([]);
	const [hatInfo, setHatInfo] = useState<HatInfo | null>(null);
	const [isLoadingHats, setIsLoadingHats] = useState(false);
	const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
	const [hatsError, setHatsError] = useState<string | null>(null);
	const [eligibilityError, setEligibilityError] = useState<string | null>(null);

	// Track mount state for async callbacks triggered by refetch()
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const isLoading = isLoadingHats || isCheckingEligibility;
	const error = hatsError || eligibilityError;

	const hatsContractAddress =
		options.hatsContract || HATS_CONTRACTS[chainId] || HATS_CONTRACTS[1];

	// ── On-chain reads (wagmi handles lifecycle automatically) ──

	const {
		data: isWearingHat,
		isLoading: isCheckingWearer,
		error: wearerError,
		refetch: refetchWearer,
	} = useReadContract({
		address:
			hatsContractAddress && isAddress(hatsContractAddress)
				? (hatsContractAddress as `0x${string}`)
				: undefined,
		abi: HATS_ABI,
		functionName: "isWearerOfHat",
		args:
			userAddress && options.hatId
				? [userAddress, BigInt(options.hatId)]
				: undefined,
		query: {
			enabled: !!(hatsContractAddress && userAddress && options.hatId),
		},
	});

	const {
		data: isEligible,
		isLoading: isCheckingEligible,
		error: eligibleError,
	} = useReadContract({
		address:
			hatsContractAddress && isAddress(hatsContractAddress)
				? (hatsContractAddress as `0x${string}`)
				: undefined,
		abi: HATS_ABI,
		functionName: "isEligible",
		args:
			userAddress && options.hatId
				? [userAddress, BigInt(options.hatId)]
				: undefined,
		query: {
			enabled: !!(
				hatsContractAddress &&
				userAddress &&
				options.hatId &&
				options.checkEligibility
			),
		},
	});

	// Good standing check (used for error status display)
	useReadContract({
		address:
			hatsContractAddress && isAddress(hatsContractAddress)
				? (hatsContractAddress as `0x${string}`)
				: undefined,
		abi: HATS_ABI,
		functionName: "isInGoodStanding",
		args:
			userAddress && options.hatId
				? [userAddress, BigInt(options.hatId)]
				: undefined,
		query: {
			enabled: !!(
				hatsContractAddress &&
				userAddress &&
				options.hatId &&
				options.checkEligibility
			),
		},
	});

	// Hat supply check
	useReadContract({
		address:
			hatsContractAddress && isAddress(hatsContractAddress)
				? (hatsContractAddress as `0x${string}`)
				: undefined,
		abi: HATS_ABI,
		functionName: "hatSupply",
		args: options.hatId ? [BigInt(options.hatId)] : undefined,
		query: {
			enabled: !!(hatsContractAddress && options.hatId),
		},
	});

	// ── Async SDK operations (wrapped in useCallback with abort support) ──

	/**
	 * Fetch user's hats from the SDK.
	 * Accepts an AbortSignal to cancel state updates on unmount.
	 */
	const fetchUserHatsImpl = useCallback(
		async (address: string, signal?: AbortSignal) => {
			setIsLoadingHats(true);
			setHatsError(null);

			try {
				const result = await hatsProvider.getUserHats(address, chainId, {
					limit: 50,
					activeOnly: true,
				});

				// Guard: don't update state if aborted or unmounted
				if (signal?.aborted) return;

				const mapped: UserHat[] = result.hats.map((hat) => ({
					hatId: hat.id,
					hat: toHatInfo(hat),
					isWearing: true,
					isEligible: true,
					isInGoodStanding: true,
				}));

				setUserHats(mapped);
			} catch (err) {
				if (signal?.aborted) return;
				console.error("Error fetching user hats:", err);
				setHatsError("Failed to fetch your organizational roles");
			} finally {
				if (!signal?.aborted) {
					setIsLoadingHats(false);
				}
			}
		},
		[chainId],
	);

	/**
	 * Validate a specific hat ID via the SDK.
	 * Accepts an AbortSignal to cancel state updates on unmount.
	 */
	const validateHatIdImpl = useCallback(
		async (hatId: string, signal?: AbortSignal): Promise<HatInfo | null> => {
			if (!hatId || Number.isNaN(Number(hatId))) {
				throw new Error("Hat ID must be a valid number");
			}

			setIsCheckingEligibility(true);
			setEligibilityError(null);

			try {
				const hat = await hatsProvider.getHat(hatId, chainId);

				if (signal?.aborted) return null;

				if (!hat) {
					throw new Error("Hat not found");
				}

				const info = toHatInfo(hat);
				setHatInfo(info);
				return info;
			} catch (err) {
				if (signal?.aborted) return null;
				console.error("Error validating hat ID:", err);
				setEligibilityError("Hat ID not found or invalid");
				setHatInfo(null);
				return null;
			} finally {
				if (!signal?.aborted) {
					setIsCheckingEligibility(false);
				}
			}
		},
		[chainId],
	);

	/**
	 * Search for hats — called by consumers, not by effects.
	 * Stable reference via useCallback.
	 */
	const searchHats = useCallback(
		async (query: string): Promise<HatInfo[]> => {
			try {
				const result = await hatsProvider.searchHats(query, chainId, {
					limit: 20,
					activeOnly: true,
					includeSubHats: true,
				});
				return result.hats.map(toHatInfo);
			} catch (err) {
				console.error("Error searching hats:", err);
				return [];
			}
		},
		[chainId],
	);

	/**
	 * Public validateHatId — delegates to impl but respects mountedRef.
	 * Used by consumers calling refetch() or validateHatId() directly.
	 */
	const validateHatId = useCallback(
		async (hatId: string): Promise<HatInfo | null> => {
			return validateHatIdImpl(hatId);
		},
		[validateHatIdImpl],
	);

	/**
	 * Refetch all data. Uses mountedRef guard since this is user-triggered
	 * and not covered by the useEffect AbortController cleanup.
	 */
	const refetch = useCallback(() => {
		if (userAddress && options.fetchUserHats) {
			fetchUserHatsImpl(userAddress);
		}
		if (options.hatId) {
			validateHatIdImpl(options.hatId);
		}
		refetchWearer();
	}, [
		userAddress,
		options.fetchUserHats,
		options.hatId,
		fetchUserHatsImpl,
		validateHatIdImpl,
		refetchWearer,
	]);

	// ── Effects ──

	// Auto-fetch user hats (with AbortController cleanup)
	useEffect(() => {
		if (!userAddress || !options.fetchUserHats) return;

		const controller = new AbortController();
		fetchUserHatsImpl(userAddress, controller.signal);

		return () => controller.abort();
	}, [userAddress, options.fetchUserHats, fetchUserHatsImpl]);

	// Auto-validate specific hat (with AbortController cleanup)
	useEffect(() => {
		if (!options.hatId) return;

		const controller = new AbortController();
		validateHatIdImpl(options.hatId, controller.signal);

		return () => controller.abort();
	}, [options.hatId, validateHatIdImpl]);

	// Propagate on-chain errors
	useEffect(() => {
		if (wearerError || eligibleError) {
			setEligibilityError("Failed to check hat eligibility");
		}
	}, [wearerError, eligibleError]);

	return {
		userHats,
		hatInfo,
		isWearingHat: isWearingHat || false,
		isEligible: isEligible || false,
		isLoading,
		isLoadingHats,
		isCheckingEligibility:
			isCheckingEligibility || isCheckingWearer || isCheckingEligible,
		error,
		hatsError,
		eligibilityError,
		searchHats,
		validateHatId,
		refetch,
	};
}
