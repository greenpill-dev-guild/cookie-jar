import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	ExternalLink,
	ImageIcon,
	Info,
	Loader2,
	PlusCircle,
	Settings,
	Shield,
	Trash2,
	TrendingUp,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { isAddress } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useEnhancedNFTValidation } from "@/hooks/nft/useEnhancedNFTValidation";
import { log } from "@/lib/app/logger";
import { AlchemyNFTProvider } from "@/lib/nft/AlchemyProvider";
import { getAlchemyApiKey } from "@/lib/nft/config";

// ── Constants ──

const VALIDATION_CONSTANTS = {
	MAX_ADDRESS_LENGTH: 42,
	MIN_ADDRESS_LENGTH: 42,
	MAX_COLLECTION_NAME_LENGTH: 100,
	MAX_DESCRIPTION_LENGTH: 500,
	MAX_IMAGE_URL_LENGTH: 500,
	MAX_QUANTITY: 1000000,
	MIN_QUANTITY: 1,
	MAX_GATES_PER_JAR: 20,
	DEBOUNCE_DELAY: 500,
	MAX_API_CALLS_PER_MINUTE: 30,
	MALICIOUS_PATTERNS: [
		/javascript:/i,
		/data:text\/html/i,
		/vbscript:/i,
		/<script/i,
		/eval\(/i,
		/expression\(/i,
	],
} as const;

// ── Sanitization ──

const sanitizeInput = {
	address: (input: string): string => {
		return input
			.trim()
			.toLowerCase()
			.slice(0, VALIDATION_CONSTANTS.MAX_ADDRESS_LENGTH);
	},

	string: (input: string | undefined, maxLength: number): string => {
		if (!input) return "";
		return input
			.trim()
			.slice(0, maxLength)
			.replace(/[<>'"]/g, "");
	},

	url: (input: string | undefined): string => {
		if (!input) return "";
		for (const pattern of VALIDATION_CONSTANTS.MALICIOUS_PATTERNS) {
			if (pattern.test(input)) {
				log.warn(
					"Malicious URL pattern detected, sanitizing:",
					input,
					"NFTGateInput",
				);
				return "";
			}
		}
		return input.slice(0, VALIDATION_CONSTANTS.MAX_IMAGE_URL_LENGTH);
	},

	quantity: (input: number): number => {
		const num = Math.floor(Math.abs(input));
		return Math.min(
			Math.max(num, VALIDATION_CONSTANTS.MIN_QUANTITY),
			VALIDATION_CONSTANTS.MAX_QUANTITY,
		);
	},
};

// ── Rate Limiting Hook (enhanced with countdown) ──

/**
 * Rate limiter that tracks API call frequency within a sliding window.
 * Returns both a gate function and a countdown (in seconds) until
 * the next call slot opens — useful for showing "retry in Xs" in the UI.
 */
const useRateLimit = (maxCalls: number, windowMs: number) => {
	const callsRef = useRef<number[]>([]);
	const [resetIn, setResetIn] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const pruneExpiredCalls = useCallback(() => {
		const now = Date.now();
		const cutoff = now - windowMs;
		callsRef.current = callsRef.current.filter((time) => time > cutoff);
	}, [windowMs]);

	const canCall = useCallback(() => {
		pruneExpiredCalls();
		return callsRef.current.length < maxCalls;
	}, [maxCalls, pruneExpiredCalls]);

	const recordCall = useCallback(() => {
		pruneExpiredCalls();
		if (callsRef.current.length >= maxCalls) return false;
		callsRef.current.push(Date.now());
		return true;
	}, [maxCalls, pruneExpiredCalls]);

	// Update countdown when rate-limited
	useEffect(() => {
		const tick = () => {
			const now = Date.now();
			const cutoff = now - windowMs;
			const activeCalls = callsRef.current.filter((time) => time > cutoff);

			if (activeCalls.length >= maxCalls && activeCalls.length > 0) {
				const oldestCall = activeCalls[0];
				const msUntilReset = oldestCall + windowMs - now;
				setResetIn(Math.max(0, Math.ceil(msUntilReset / 1000)));
			} else {
				setResetIn(0);
			}
		};

		timerRef.current = setInterval(tick, 1000);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [maxCalls, windowMs]);

	return { canCall, recordCall, resetIn };
};

// ── Types ──

enum NFTType {
	None = 0,
	ERC721 = 1,
	ERC1155 = 2,
}

export interface EnhancedNFTGate {
	address: string;
	type: NFTType;
	name?: string;
	symbol?: string;
	image?: string;
	verified?: boolean;
	floorPrice?: number;
	totalSupply?: number;
	minQuantity?: number;
	maxQuantity?: number;
	enableQuantityGating?: boolean;
	enableAnalytics?: boolean;
	requiredTraits?: Array<{
		trait_type: string;
		value: string | number;
		operator?: "equals" | "greater_than" | "less_than" | "contains";
	}>;
	enableTraitGating?: boolean;
}

interface EnhancedNFTGateInputProps {
	onAddNFT: (gate: EnhancedNFTGate) => void;
	existingGates?: EnhancedNFTGate[];
	className?: string;
}

interface CollectionPreview {
	name?: string;
	symbol?: string;
	description?: string;
	image?: string;
	verified?: boolean;
	floorPrice?: number;
	totalSupply?: number;
	contractType?: "ERC721" | "ERC1155";
	isActive?: boolean;
	externalUrl?: string;
	warnings?: string[];
}

// ── Form State Reducer ──

interface NFTGateFormState {
	nftAddress: string;
	selectedType: NFTType;
	debouncedAddress: string;
	showAdvanced: boolean;
	inputErrors: string[];
	enableQuantityGating: boolean;
	minQuantity: number;
	maxQuantity: number;
	enableAnalytics: boolean;
	enableTraitGating: boolean;
}

type NFTGateFormAction =
	| { type: "SET_ADDRESS"; payload: string }
	| { type: "SET_TYPE"; payload: NFTType }
	| { type: "SET_DEBOUNCED_ADDRESS"; payload: string }
	| { type: "TOGGLE_ADVANCED" }
	| { type: "SET_ERRORS"; payload: string[] }
	| { type: "SET_QUANTITY_GATING"; payload: boolean }
	| { type: "SET_MIN_QUANTITY"; payload: number }
	| { type: "SET_MAX_QUANTITY"; payload: number }
	| { type: "SET_ANALYTICS"; payload: boolean }
	| { type: "SET_TRAIT_GATING"; payload: boolean }
	| { type: "RESET" };

const INITIAL_STATE: NFTGateFormState = {
	nftAddress: "",
	selectedType: NFTType.ERC721,
	debouncedAddress: "",
	showAdvanced: false,
	inputErrors: [],
	enableQuantityGating: false,
	minQuantity: 1,
	maxQuantity: 10,
	enableAnalytics: true,
	enableTraitGating: false,
};

function nftGateFormReducer(
	state: NFTGateFormState,
	action: NFTGateFormAction,
): NFTGateFormState {
	switch (action.type) {
		case "SET_ADDRESS":
			return { ...state, nftAddress: action.payload };
		case "SET_TYPE":
			return {
				...state,
				selectedType: action.payload,
				// Auto-disable quantity gating when switching to ERC721
				enableQuantityGating:
					action.payload === NFTType.ERC721
						? false
						: state.enableQuantityGating,
			};
		case "SET_DEBOUNCED_ADDRESS":
			return { ...state, debouncedAddress: action.payload };
		case "TOGGLE_ADVANCED":
			return { ...state, showAdvanced: !state.showAdvanced };
		case "SET_ERRORS":
			return { ...state, inputErrors: action.payload };
		case "SET_QUANTITY_GATING":
			return { ...state, enableQuantityGating: action.payload };
		case "SET_MIN_QUANTITY":
			return { ...state, minQuantity: action.payload };
		case "SET_MAX_QUANTITY":
			return { ...state, maxQuantity: action.payload };
		case "SET_ANALYTICS":
			return { ...state, enableAnalytics: action.payload };
		case "SET_TRAIT_GATING":
			return { ...state, enableTraitGating: action.payload };
		case "RESET":
			return INITIAL_STATE;
		default:
			return state;
	}
}

// ── Sub-components ──

const NFTCard: React.FC<{
	preview: CollectionPreview;
	type: "ERC721" | "ERC1155";
}> = ({ preview, type }) => (
	<Card className="h-full">
		<CardHeader className="pb-2">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					{preview.image ? (
						<div className="relative w-8 h-8">
							<Image
								src={preview.image}
								alt={preview.name || "NFT"}
								fill
								sizes="32px"
								className="rounded object-cover"
								onError={(e) => {
									e.currentTarget.style.display = "none";
								}}
							/>
						</div>
					) : (
						<div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
							<ImageIcon className="h-4 w-4 text-gray-400" />
						</div>
					)}
					<div>
						<CardTitle className="text-sm">
							{preview.name || "Unknown Collection"}
						</CardTitle>
						{preview.symbol && (
							<p className="text-xs text-gray-500">{preview.symbol}</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1">
					<Badge
						variant={type === "ERC721" ? "default" : "secondary"}
						className="text-xs"
					>
						{type}
					</Badge>
					{preview.verified && (
						<span title="Verified Collection">
							<Shield className="h-3 w-3 text-green-500" />
						</span>
					)}
				</div>
			</div>
		</CardHeader>

		<CardContent className="pt-0">
			<div className="space-y-2">
				{preview.description && (
					<p className="text-xs text-gray-600 line-clamp-2">
						{preview.description}
					</p>
				)}

				<div className="flex justify-between items-center text-xs">
					{preview.floorPrice && (
						<div className="flex items-center gap-1">
							<TrendingUp className="h-3 w-3" />
							<span>{preview.floorPrice} ETH</span>
						</div>
					)}

					{preview.totalSupply && (
						<div className="text-gray-500">
							Supply: {preview.totalSupply.toLocaleString()}
						</div>
					)}
				</div>

				{preview.externalUrl && (
					<a
						href={preview.externalUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
					>
						<ExternalLink className="h-3 w-3" />
						View Collection
					</a>
				)}
			</div>
		</CardContent>
	</Card>
);

// ── Main Component ──

export const EnhancedNFTGateInput: React.FC<EnhancedNFTGateInputProps> = ({
	onAddNFT,
	existingGates = [],
	className = "",
}) => {
	const [state, dispatch] = useReducer(nftGateFormReducer, INITIAL_STATE);

	const {
		nftAddress,
		selectedType,
		debouncedAddress,
		showAdvanced,
		inputErrors,
		enableQuantityGating,
		minQuantity,
		maxQuantity,
		enableAnalytics,
		enableTraitGating,
	} = state;

	// Rate limiting with countdown
	const { canCall: canMakeApiCall, recordCall: recordApiCall, resetIn } =
		useRateLimit(
		VALIDATION_CONSTANTS.MAX_API_CALLS_PER_MINUTE,
		60 * 1000,
	);

	// Input validation
	const validateInputs = useCallback(() => {
		const errors: string[] = [];

		if (nftAddress) {
			const sanitizedAddress = sanitizeInput.address(nftAddress);
			if (sanitizedAddress.length < VALIDATION_CONSTANTS.MIN_ADDRESS_LENGTH) {
				errors.push("Address must be 42 characters long");
			}
			if (!isAddress(sanitizedAddress)) {
				errors.push("Invalid Ethereum address format");
			}
			if (nftAddress.includes(" ")) {
				errors.push("Address cannot contain spaces");
			}
			if (
				nftAddress.toLowerCase() ===
				"0x0000000000000000000000000000000000000000"
			) {
				errors.push("Cannot use zero address");
			}
		}

		if (enableQuantityGating) {
			if (minQuantity < VALIDATION_CONSTANTS.MIN_QUANTITY) {
				errors.push(
					`Minimum quantity must be at least ${VALIDATION_CONSTANTS.MIN_QUANTITY}`,
				);
			}
			if (maxQuantity > VALIDATION_CONSTANTS.MAX_QUANTITY) {
				errors.push(
					`Maximum quantity cannot exceed ${VALIDATION_CONSTANTS.MAX_QUANTITY}`,
				);
			}
			if (minQuantity >= maxQuantity) {
				errors.push("Minimum quantity must be less than maximum quantity");
			}
		}

		if (existingGates.length >= VALIDATION_CONSTANTS.MAX_GATES_PER_JAR) {
			errors.push(
				`Cannot add more than ${VALIDATION_CONSTANTS.MAX_GATES_PER_JAR} NFT gates per jar`,
			);
		}

		dispatch({ type: "SET_ERRORS", payload: errors });
		return errors.length === 0;
	}, [
		nftAddress,
		enableQuantityGating,
		minQuantity,
		maxQuantity,
		existingGates.length,
	]);

	// Debounced address with validation
	useEffect(() => {
		const timer = setTimeout(() => {
			if (nftAddress.trim()) {
				const sanitized = sanitizeInput.address(nftAddress);
				if (validateInputs()) {
					dispatch({ type: "SET_DEBOUNCED_ADDRESS", payload: sanitized });
				} else {
					dispatch({ type: "SET_DEBOUNCED_ADDRESS", payload: "" });
				}
			} else {
				dispatch({ type: "SET_DEBOUNCED_ADDRESS", payload: "" });
				dispatch({ type: "SET_ERRORS", payload: [] });
			}
		}, VALIDATION_CONSTANTS.DEBOUNCE_DELAY);
		return () => clearTimeout(timer);
	}, [nftAddress, validateInputs]);

	// Contract validation
	const { isValid, detectedType, isLoading, error } = useEnhancedNFTValidation(
		canMakeApiCall() ? debouncedAddress : "",
		{ onValidationRequest: () => recordApiCall() },
	);

	// Collection preview
	const {
		data: collectionPreview,
		isLoading: isLoadingPreview,
		error: previewError,
	} = useQuery({
		queryKey: ["nft-collection-preview", debouncedAddress],
		queryFn: async (): Promise<CollectionPreview | null> => {
			if (
				!debouncedAddress ||
				!isAddress(debouncedAddress) ||
				!canMakeApiCall()
			)
				return null;

			if (!recordApiCall()) {
				throw new Error("Rate limit exceeded. Please wait before trying again.");
			}

			try {
				const apiKey = getAlchemyApiKey("mainnet");
				if (!apiKey) {
					log.warn(
						"No Alchemy API key available for NFT validation",
						undefined,
						"NFTGateInput",
					);
					return null;
				}

				const provider = new AlchemyNFTProvider(apiKey);
				const validation = await provider.validateContract(debouncedAddress);

				if (!validation.isValid) {
					if (validation.isMalicious) {
						log.warn(
							"Potentially malicious contract detected:",
							debouncedAddress,
							"NFTGateInput",
						);
					}
					return null;
				}

				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error("Request timeout")), 10000);
				});

				const metadata = await Promise.race([
					provider.getNFTMetadata(debouncedAddress, "1"),
					timeoutPromise,
				]);

				return {
					name: sanitizeInput.string(
						metadata.collection || metadata.name,
						VALIDATION_CONSTANTS.MAX_COLLECTION_NAME_LENGTH,
					),
					description: sanitizeInput.string(
						metadata.description,
						VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH,
					),
					image: sanitizeInput.url(metadata.image),
					contractType: metadata.tokenType,
					verified:
						!validation.isMalicious &&
						(validation.warnings?.length ?? 0) === 0,
					isActive: true,
					warnings: validation.warnings,
				};
			} catch (error) {
				log.error(
					"Failed to fetch collection preview:",
					error,
					"NFTGateInput",
				);

				if (error instanceof Error && error.message.includes("rate limit")) {
					throw new Error(
						"Rate limit exceeded. Please wait before trying again.",
					);
				}

				return null;
			}
		},
		enabled: !!(
			debouncedAddress &&
			isAddress(debouncedAddress) &&
			isValid &&
			canMakeApiCall()
		),
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		retry: (failureCount, error) => {
			if (error instanceof Error && error.message.includes("rate limit")) {
				return false;
			}
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
	});

	// Type matching
	const typeMatches =
		!detectedType ||
		(detectedType === "ERC721" && selectedType === NFTType.ERC721) ||
		(detectedType === "ERC1155" && selectedType === NFTType.ERC1155);

	const isDuplicate = existingGates.some(
		(gate) => gate.address.toLowerCase() === nftAddress.toLowerCase(),
	);

	const canAdd =
		nftAddress && isValid && typeMatches && !isLoading && !isDuplicate;

	// Auto-correct type when detected type differs
	useEffect(() => {
		if (detectedType && !typeMatches) {
			const newType =
				detectedType === "ERC721" ? NFTType.ERC721 : NFTType.ERC1155;
			dispatch({ type: "SET_TYPE", payload: newType });
		}
	}, [detectedType, typeMatches]);

	const handleAddNFT = useCallback(() => {
		if (!canAdd || !validateInputs() || inputErrors.length > 0) {
			log.warn(
				"Cannot add NFT gate: validation failed",
				{
					inputErrors,
					canAdd,
				},
				"NFTGateInput",
			);
			return;
		}

		const sanitizedAddress = sanitizeInput.address(nftAddress);
		const sanitizedMinQuantity = sanitizeInput.quantity(minQuantity);
		const sanitizedMaxQuantity = sanitizeInput.quantity(maxQuantity);

		const gate: EnhancedNFTGate = {
			address: sanitizedAddress,
			type: selectedType,
			name: sanitizeInput.string(
				collectionPreview?.name,
				VALIDATION_CONSTANTS.MAX_COLLECTION_NAME_LENGTH,
			),
			image: sanitizeInput.url(collectionPreview?.image),
			verified:
				collectionPreview?.verified && !collectionPreview?.warnings?.length,
			floorPrice: collectionPreview?.floorPrice
				? sanitizeInput.quantity(collectionPreview.floorPrice)
				: undefined,
			totalSupply: collectionPreview?.totalSupply,
			enableAnalytics,
		};

		if (selectedType === NFTType.ERC1155 && enableQuantityGating) {
			if (sanitizedMinQuantity < sanitizedMaxQuantity) {
				gate.enableQuantityGating = true;
				gate.minQuantity = sanitizedMinQuantity;
				gate.maxQuantity = sanitizedMaxQuantity;
			} else {
				log.warn(
					"Invalid quantity range, skipping quantity gating",
					undefined,
					"NFTGateInput",
				);
			}
		}

		if (enableTraitGating) {
			gate.enableTraitGating = true;
			gate.requiredTraits = [];
		}

		log.info(
			"Adding NFT gate:",
			{
				address: sanitizedAddress,
				type: selectedType === NFTType.ERC721 ? "ERC721" : "ERC1155",
				hasQuantityGating: gate.enableQuantityGating,
				hasTraitGating: gate.enableTraitGating,
				verified: gate.verified,
			},
			"NFTGateInput",
		);

		onAddNFT(gate);
		dispatch({ type: "RESET" });
	}, [
		canAdd,
		validateInputs,
		inputErrors,
		nftAddress,
		selectedType,
		collectionPreview,
		enableAnalytics,
		enableQuantityGating,
		minQuantity,
		maxQuantity,
		enableTraitGating,
		onAddNFT,
	]);

	const getValidationIcon = () => {
		if (!debouncedAddress) return null;
		if (isLoading)
			return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
		if (isDuplicate) return <AlertCircle className="h-4 w-4 text-orange-500" />;
		if (isValid && typeMatches)
			return <CheckCircle2 className="h-4 w-4 text-green-500" />;
		if (error || !typeMatches)
			return <AlertCircle className="h-4 w-4 text-red-500" />;
		return null;
	};

	const getValidationMessage = () => {
		if (inputErrors.length > 0) {
			return inputErrors.join(", ");
		}

		if (resetIn > 0) {
			return `Rate limit reached. Retry in ${resetIn}s.`;
		}

		if (!debouncedAddress) return null;
		if (isLoading) return "Validating contract...";
		if (isDuplicate) return "This NFT contract is already added";
		if (error) return error;
		if (previewError) {
			const errorMsg =
				previewError instanceof Error
					? previewError.message
					: "Failed to load preview";
			return `Preview error: ${errorMsg}`;
		}
		if (isValid && !typeMatches) {
			return `Contract is ${detectedType} but type is set to ${selectedType === NFTType.ERC721 ? "ERC721" : "ERC1155"}`;
		}
		if (isValid && typeMatches) {
			const warnings = collectionPreview?.warnings;
			const warningText = warnings?.length
				? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})`
				: "";
			return `Valid ${detectedType} contract${collectionPreview?.verified ? " (verified)" : ""}${warningText}`;
		}
		return null;
	};

	return (
		<div className={`space-y-6 ${className}`}>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<Label className="text-[#3c2a14] text-base font-semibold">
						Enhanced NFT Gate Configuration
					</Label>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => dispatch({ type: "TOGGLE_ADVANCED" })}
						className="text-sm text-gray-600 hover:text-[#ff5e14]"
					>
						<Settings className="h-4 w-4 mr-1" />
						{showAdvanced ? "Hide Advanced" : "Show Advanced"}
					</Button>
				</div>

				{/* Rate limit countdown banner */}
				{resetIn > 0 && (
					<div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs">
						<Clock className="h-3 w-3" />
						<span>
							API rate limit active. Next request available in{" "}
							<strong>{resetIn}s</strong>.
						</span>
					</div>
				)}

				{/* NFT Address Input */}
				<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
					<div className="md:col-span-6">
						<Label htmlFor="nft-contract-address" className="text-sm text-[#3c2a14]">
							NFT Contract Address
						</Label>
						<div className="relative">
							<Input
								id="nft-contract-address"
								placeholder="0x... (paste NFT contract address)"
								className="bg-white border-gray-300 placeholder:text-[#8b7355] text-[#3c2a14] pr-8"
								value={nftAddress}
								onChange={(e) => {
									const input = e.target.value.trim();
									const sanitized = input.slice(
										0,
										VALIDATION_CONSTANTS.MAX_ADDRESS_LENGTH,
									);
									dispatch({ type: "SET_ADDRESS", payload: sanitized });
								}}
								maxLength={VALIDATION_CONSTANTS.MAX_ADDRESS_LENGTH}
								aria-invalid={inputErrors.length > 0}
								aria-describedby={inputErrors.length > 0 ? "nft-address-errors" : undefined}
							/>
							<div className="absolute right-2 top-1/2 transform -translate-y-1/2">
								{getValidationIcon()}
							</div>
						</div>
					</div>

					<div className="md:col-span-3">
						<Label className="text-sm text-[#3c2a14]">NFT Type</Label>
						<Select
							value={selectedType.toString()}
							onValueChange={(value) =>
								dispatch({
									type: "SET_TYPE",
									payload: Number(value) as NFTType,
								})
							}
						>
							<SelectTrigger className="bg-white border-gray-300">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">ERC721</SelectItem>
								<SelectItem value="2">ERC1155</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="md:col-span-3">
						<Label className="text-sm text-[#3c2a14] opacity-0">Add</Label>
						<Button
							type="button"
							onClick={handleAddNFT}
							disabled={!canAdd}
							className="w-full bg-[#ff5e14] hover:bg-[#e5531b] text-white disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<PlusCircle className="h-4 w-4 mr-2" />
							Add NFT Gate
						</Button>
					</div>
				</div>

				{/* Validation Message */}
				{(debouncedAddress || resetIn > 0) && (
					<div
						id="nft-address-errors"
						role="status"
						className={`text-xs px-3 py-2 rounded ${
							isValid && typeMatches && !isDuplicate
								? "bg-green-50 text-green-700 border border-green-200"
								: error || !typeMatches || isDuplicate || resetIn > 0
									? "bg-red-50 text-red-700 border border-red-200"
									: "bg-gray-50 text-gray-600 border border-gray-200"
						}`}
					>
						<div className="flex items-center gap-1">
							{resetIn > 0 ? (
								<Clock className="h-4 w-4 text-amber-500" />
							) : (
								getValidationIcon()
							)}
							{getValidationMessage()}
						</div>
					</div>
				)}

				{/* Debounce loading indicator */}
				{nftAddress.trim() && !debouncedAddress && inputErrors.length === 0 && (
					<div className="flex items-center gap-2 text-xs text-gray-500">
						<Loader2 className="h-3 w-3 animate-spin" />
						<span>Waiting for input...</span>
					</div>
				)}

				{/* Collection Preview */}
				{collectionPreview && isValid && typeMatches && (
					<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
						<div className="flex items-center gap-2 mb-3">
							<Info className="h-4 w-4 text-blue-500" />
							<span className="text-sm font-medium text-[#3c2a14]">
								Collection Preview
							</span>
						</div>
						<NFTCard
							preview={collectionPreview}
							type={detectedType || "ERC721"}
						/>
					</div>
				)}

				{/* Advanced Configuration */}
				{showAdvanced && (
					<Card className="border-gray-200">
						<CardHeader>
							<CardTitle className="text-base">
								Advanced Gate Configuration
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Quantity-based Gating (ERC1155 only) */}
							{selectedType === NFTType.ERC1155 && (
								<div className="space-y-4">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="enableQuantity"
											checked={enableQuantityGating}
											onCheckedChange={(checked) =>
												dispatch({
													type: "SET_QUANTITY_GATING",
													payload: checked === true,
												})
											}
										/>
										<Label
											htmlFor="enableQuantity"
											className="text-sm font-medium"
										>
											Enable Quantity-Based Gating
										</Label>
									</div>

									{enableQuantityGating && (
										<div className="ml-6 space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
											<div>
												<Label className="text-sm">
													Minimum Quantity Required
												</Label>
												<div className="flex items-center gap-4 mt-2">
													<Slider
														aria-label="Minimum quantity required"
														value={[minQuantity]}
														onValueChange={(value) =>
															dispatch({
																type: "SET_MIN_QUANTITY",
																payload: sanitizeInput.quantity(value[0]),
															})
														}
														max={Math.min(
															100,
															VALIDATION_CONSTANTS.MAX_QUANTITY,
														)}
														min={VALIDATION_CONSTANTS.MIN_QUANTITY}
														step={1}
														className="flex-1"
													/>
													<span className="text-sm font-mono w-12">
														{minQuantity}
													</span>
												</div>
											</div>

											<div>
												<Label className="text-sm">
													Maximum Quantity (Optional)
												</Label>
												<div className="flex items-center gap-4 mt-2">
													<Slider
														aria-label="Maximum quantity allowed"
														value={[maxQuantity]}
														onValueChange={(value) =>
															dispatch({
																type: "SET_MAX_QUANTITY",
																payload: sanitizeInput.quantity(value[0]),
															})
														}
														max={Math.min(
															1000,
															VALIDATION_CONSTANTS.MAX_QUANTITY,
														)}
														min={minQuantity + 1}
														step={1}
														className="flex-1"
													/>
													<span className="text-sm font-mono w-12">
														{maxQuantity}
													</span>
												</div>
												<p className="text-xs text-gray-600 mt-1">
													Users must own between {minQuantity} and {maxQuantity}{" "}
													tokens
												</p>
											</div>
										</div>
									)}
								</div>
							)}

							<Separator />

							{/* Trait-Based Gating (disabled — coming soon) */}
							<div className="space-y-4">
								<div className="flex items-center space-x-2">
									<Checkbox
										id="enableTraits"
										checked={false}
										disabled={true}
									/>
									<Label
										htmlFor="enableTraits"
										className="text-sm font-medium text-gray-400"
									>
										Enable Trait-Based Requirements
										<Badge variant="secondary" className="ml-2 text-xs">
											Coming Soon
										</Badge>
									</Label>
								</div>
							</div>

							<Separator />

							{/* Analytics */}
							<div className="flex items-center space-x-2">
								<Checkbox
									id="enableAnalytics"
									checked={enableAnalytics}
									onCheckedChange={(checked) =>
										dispatch({
											type: "SET_ANALYTICS",
											payload: checked === true,
										})
									}
								/>
								<Label htmlFor="enableAnalytics" className="text-sm">
									Enable withdrawal analytics for this gate
								</Label>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Loading state for preview */}
			{isLoadingPreview && debouncedAddress && (
				<div className="flex items-center justify-center p-4 text-sm text-gray-600">
					<Loader2 className="h-4 w-4 animate-spin mr-2" />
					Loading collection preview...
				</div>
			)}
		</div>
	);
};

/**
 * Display component for configured NFT gates
 */
export const EnhancedNFTGatesList: React.FC<{
	gates: EnhancedNFTGate[];
	onRemove: (index: number) => void;
	className?: string;
}> = ({ gates, onRemove, className = "" }) => {
	if (gates.length === 0) return null;

	return (
		<div className={`space-y-3 ${className}`}>
			<Label className="text-[#3c2a14] text-base font-semibold">
				Configured NFT Gates ({gates.length})
			</Label>

			{gates.map((gate, index) => (
				<Card key={`${gate.address}-${index}`} className="border border-gray-200">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-3 flex-1">
								{gate.image && (
									<div className="relative w-10 h-10">
										<Image
											src={gate.image || ""}
											alt={gate.name || "NFT"}
											fill
											sizes="40px"
											className="rounded object-cover"
											onError={(e) => {
												e.currentTarget.style.display = "none";
											}}
										/>
									</div>
								)}

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<h4 className="text-sm font-medium text-[#3c2a14] truncate">
											{gate.name || "Unknown Collection"}
										</h4>
										<Badge
											variant={
												gate.type === NFTType.ERC721 ? "default" : "secondary"
											}
											className="text-xs"
										>
											{gate.type === NFTType.ERC721 ? "ERC721" : "ERC1155"}
										</Badge>
										{gate.verified && (
											<Shield className="h-3 w-3 text-green-500" />
										)}
									</div>

									<p className="text-xs text-gray-500 truncate mb-2">
										{gate.address}
									</p>

									<div className="flex items-center gap-4 text-xs">
										{gate.enableQuantityGating && gate.minQuantity && (
											<span className="text-blue-600">
												Qty: {gate.minQuantity}
												{gate.maxQuantity ? `-${gate.maxQuantity}` : "+"}
											</span>
										)}
										{gate.enableTraitGating && (
											<span className="text-purple-600">Trait Gating</span>
										)}
										{gate.enableAnalytics && (
											<span className="text-green-600">Analytics</span>
										)}
										{gate.floorPrice && (
											<span className="text-gray-600">
												Floor: {gate.floorPrice} ETH
											</span>
										)}
									</div>
								</div>
							</div>

							<Button
								variant="ghost"
								size="sm"
								onClick={() => onRemove(index)}
								className="text-red-500 hover:text-red-700 hover:bg-red-50"
								aria-label={`Remove ${gate.name || "NFT"} gate`}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
};
