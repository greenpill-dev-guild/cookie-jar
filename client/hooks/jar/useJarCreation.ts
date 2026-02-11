"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { decodeEventLog, isAddress, parseEther } from "viem";
import {
	useAccount,
	useChainId,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";

import { contractAddresses, isV2Chain } from "@/config/supported-networks";
import { cookieJarFactoryAbi } from "@/generated";
import { cookieJarFactoryV1Abi } from "@/lib/blockchain/cookie-jar-v1-abi";
import { cookieJarFactoryV2Abi } from "@/lib/blockchain/cookie-jar-v2-abi";
import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";

import { useToast } from "../app/useToast";
import {
	AccessType,
	NFTType,
	WithdrawalTypeOptions,
	jarCreationSchema,
	type JarCreationFormData,
	type ProtocolConfig,
} from "./schemas/jarCreationSchema";

// Re-export for backward compatibility (used by StepContent, page, etc.)
export { AccessType, WithdrawalTypeOptions, NFTType };
export type { ProtocolConfig, JarCreationFormData };

/**
 * Custom hook for Cookie Jar creation workflow.
 *
 * Manages form state via React Hook Form + Zod, contract interactions,
 * transaction lifecycle, and step validation for the multi-step wizard.
 */
export const useJarCreation = () => {
	const router = useRouter();
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	// ── Form state (replaces 30+ individual useState calls) ──
	// Cast needed: @hookform/resolvers@3.3 types expect Zod 3.22 internals,
	// but bun resolved to Zod 3.25 which has incompatible _parse signature.
	// Runtime behavior is identical — this is purely a type-level conflict.
	const form = useForm<JarCreationFormData>({
		resolver: zodResolver(jarCreationSchema as any),
		defaultValues: {
			jarName: "",
			jarOwnerAddress: "0x0000000000000000000000000000000000000000",
			supportedCurrency: ETH_ADDRESS,
			metadata: "",
			imageUrl: "",
			externalLink: "",
			showCustomCurrency: false,
			customCurrencyAddress: "",
			withdrawalOption: WithdrawalTypeOptions.Fixed,
			fixedAmount: "0",
			maxWithdrawal: "0",
			withdrawalInterval: "0",
			strictPurpose: true,
			emergencyWithdrawalEnabled: true,
			oneTimeWithdrawal: false,
			accessType: AccessType.Allowlist,
			nftAddresses: [],
			nftTypes: [],
			protocolConfig: { accessType: "Allowlist" },
			enableCustomFee: false,
			customFee: "",
			streamingEnabled: false,
			requireStreamApproval: true,
			maxStreamRate: "1.0",
			minStreamDuration: "1",
			autoSwapEnabled: false,
		},
		mode: "onTouched",
	});

	// ── Non-form state ──
	const [isFormError, setIsFormError] = useState(false);
	const [formErrors, setFormErrors] = useState<string[]>([]);
	const [_isCreating, setIsCreating] = useState(false);
	const [newJarPreview, setNewJarPreview] = useState<{
		address: string;
		name: string;
		currency: string;
	} | null>(null);

	// ── Contract interaction ──
	const {
		writeContract,
		data: hash,
		error: createError,
		isPending,
	} = useWriteContract();
	const {
		isLoading: isWaitingForTx,
		isSuccess: txConfirmed,
		data: receipt,
	} = useWaitForTransactionReceipt({ hash });

	const factoryAddress = contractAddresses.cookieJarFactory[chainId] as
		| `0x${string}`
		| undefined;
	const isV2Contract = isV2Chain(chainId);

	// ── Helpers ──
	const parseAmount = (amount: string) => {
		try {
			return parseEther(amount || "0");
		} catch {
			return parseEther("0");
		}
	};

	// ── Step validation ──
	// These read from form.getValues() instead of individual state variables.
	// Cross-field conditional logic stays here because Zod can't handle
	// cross-step superRefine with RHF's trigger().

	const validateStep1 = useCallback((): {
		isValid: boolean;
		errors: string[];
	} => {
		const {
			jarName,
			jarOwnerAddress,
			supportedCurrency,
			showCustomCurrency,
			customCurrencyAddress,
		} = form.getValues();
		const errors: string[] = [];

		if (!jarName.trim()) {
			errors.push("Jar name is required");
		}

		if (jarOwnerAddress && !isAddress(jarOwnerAddress)) {
			errors.push("Jar owner address must be a valid Ethereum address");
		}

		if (!isAddress(supportedCurrency)) {
			if (showCustomCurrency && customCurrencyAddress) {
				if (!isAddress(customCurrencyAddress)) {
					errors.push("Custom currency must be a valid contract address");
				}
			} else if (supportedCurrency !== ETH_ADDRESS) {
				errors.push("Valid currency address is required");
			}
		}

		return { isValid: errors.length === 0, errors };
	}, [form]);

	const validateStep2 = useCallback((): {
		isValid: boolean;
		errors: string[];
	} => {
		const { withdrawalOption, fixedAmount, maxWithdrawal, withdrawalInterval } =
			form.getValues();
		const errors: string[] = [];

		if (withdrawalOption === WithdrawalTypeOptions.Fixed) {
			if (!fixedAmount || parseFloat(fixedAmount) <= 0) {
				errors.push("Fixed withdrawal amount must be greater than 0");
			}
		} else {
			if (!maxWithdrawal || parseFloat(maxWithdrawal) <= 0) {
				errors.push("Maximum withdrawal amount must be greater than 0");
			}
		}

		if (!withdrawalInterval || parseInt(withdrawalInterval, 10) <= 0) {
			errors.push("Withdrawal interval must be greater than 0 days");
		}

		return { isValid: errors.length === 0, errors };
	}, [form]);

	const validateStep3 = useCallback((): {
		isValid: boolean;
		errors: string[];
	} => {
		const { accessType, nftAddresses } = form.getValues();
		const errors: string[] = [];

		if (accessType === AccessType.NFTGated) {
			if (nftAddresses.length === 0) {
				errors.push(
					"At least one NFT address is required for NFT-gated access",
				);
			}

			for (const addr of nftAddresses) {
				if (!isAddress(addr)) {
					errors.push(`NFT address is not a valid Ethereum address`);
					break;
				}
			}
		}

		return { isValid: errors.length === 0, errors };
	}, [form]);

	const validateStep4 = useCallback((): {
		isValid: boolean;
		errors: string[];
	} => {
		const { enableCustomFee, customFee } = form.getValues();
		const errors: string[] = [];

		if (enableCustomFee) {
			if (
				!customFee ||
				parseFloat(customFee) < 0 ||
				parseFloat(customFee) > 100
			) {
				errors.push("Custom fee must be between 0 and 100 percent");
			}
		}

		return { isValid: errors.length === 0, errors };
	}, [form]);

	const validateAll = useCallback((): {
		isValid: boolean;
		errors: string[];
	} => {
		const step1 = validateStep1();
		const step2 = validateStep2();
		const step3 = validateStep3();
		const step4 = validateStep4();

		const allErrors = [
			...step1.errors,
			...step2.errors,
			...step3.errors,
			...step4.errors,
		];

		return { isValid: allErrors.length === 0, errors: allErrors };
	}, [validateStep1, validateStep2, validateStep3, validateStep4]);

	// ── Form submission ──
	const confirmSubmit = useCallback(() => {
		const values = form.getValues();
		const { isValid, errors } = validateAll();

		if (!isValid) {
			setFormErrors(errors);
			setIsFormError(true);
			return;
		}

		setFormErrors([]);
		setIsFormError(false);

		const effectiveNftAddresses =
			values.accessType === AccessType.NFTGated ? values.nftAddresses : [];
		const effectiveNftTypes =
			values.accessType === AccessType.NFTGated ? values.nftTypes : [];

		const finalMetadata = isV2Contract
			? JSON.stringify({
					version: "2.0",
					name: values.jarName,
					description: values.metadata,
					image: values.imageUrl,
					external_url: values.externalLink,
				})
			: values.jarName || values.metadata || "Cookie Jar";

		try {
			if (!factoryAddress) {
				throw new Error(
					`No contract address found for the current network (Chain ID: ${chainId}). Please switch to a supported network.`,
				);
			}

			if (isV2Contract) {
				const feeBps =
					values.enableCustomFee && values.customFee !== ""
						? Math.round(parseFloat(values.customFee) * 100)
						: 0;

				const params = {
					cookieJarOwner: values.jarOwnerAddress as `0x${string}`,
					supportedCurrency: values.supportedCurrency as `0x${string}`,
					accessType: values.accessType,
					withdrawalOption: values.withdrawalOption,
					fixedAmount: parseAmount(values.fixedAmount),
					maxWithdrawal: parseAmount(values.maxWithdrawal),
					withdrawalInterval: BigInt(values.withdrawalInterval || "0"),
					strictPurpose: values.strictPurpose,
					emergencyWithdrawalEnabled: values.emergencyWithdrawalEnabled,
					oneTimeWithdrawal: values.oneTimeWithdrawal,
					metadata: finalMetadata,
					customFeePercentage: BigInt(feeBps),
					maxWithdrawalPerPeriod: BigInt(0),
				};

				const accessConfig = {
					nftAddresses:
						effectiveNftAddresses as readonly `0x${string}`[],
					nftTypes: effectiveNftTypes as readonly number[],
					allowlist: [] as readonly `0x${string}`[],
					poapReq: {
						eventId: BigInt(0),
						poapContract:
							"0x0000000000000000000000000000000000000000" as `0x${string}`,
					},
					unlockReq: {
						lockAddress:
							"0x0000000000000000000000000000000000000000" as `0x${string}`,
					},
					hypercertReq: {
						tokenContract:
							"0x0000000000000000000000000000000000000000" as `0x${string}`,
						tokenId: BigInt(0),
						minBalance: BigInt(1),
					},
					hatsReq: {
						hatId: BigInt(0),
						hatsContract:
							"0x0000000000000000000000000000000000000000" as `0x${string}`,
					},
				};

				writeContract({
					address: factoryAddress,
					abi: cookieJarFactoryV2Abi,
					functionName: "createCookieJar",
					args: [params, accessConfig],
				});
			} else {
				writeContract({
					address: factoryAddress,
					abi: cookieJarFactoryV1Abi,
					functionName: "createCookieJar",
					args: [
						values.jarOwnerAddress as `0x${string}`,
						values.supportedCurrency as `0x${string}`,
						values.accessType,
						effectiveNftAddresses as readonly `0x${string}`[],
						effectiveNftTypes,
						values.withdrawalOption,
						parseAmount(values.fixedAmount),
						parseAmount(values.maxWithdrawal),
						BigInt(values.withdrawalInterval || "0"),
						values.strictPurpose,
						values.emergencyWithdrawalEnabled,
						values.oneTimeWithdrawal,
						[] as readonly `0x${string}`[],
						finalMetadata,
					],
				});
			}

			setIsCreating(true);
		} catch (error) {
			console.error("Error creating jar:", error);
			toast({
				title: "Transaction Failed",
				description:
					error instanceof Error
						? error.message
						: "An unknown error occurred",
				variant: "destructive",
			});
		}
	}, [
		form,
		validateAll,
		isV2Contract,
		factoryAddress,
		chainId,
		writeContract,
		toast,
	]);

	// ── Confetti ──
	const triggerConfetti = async () => {
		try {
			const confettiModule = await import("canvas-confetti");
			const confetti = confettiModule.default;
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 },
			});
		} catch (error) {
			console.log("Confetti animation failed:", error);
		}
	};

	// ── Effects ──

	// Handle successful transaction
	useEffect(() => {
		if (txConfirmed && receipt) {
			const values = form.getValues();

			queryClient.invalidateQueries({
				queryKey: ["cookie-jar-factory", chainId, factoryAddress],
			});

			toast({
				title: "Cookie Jar Created!",
				description:
					"Your new jar has been deployed successfully. Visit /jars to see it in the list!",
			});

			triggerConfetti();

			try {
				let jarAddress: string | null = null;

				if (receipt.logs && receipt.logs.length > 0) {
					for (const log of receipt.logs) {
						try {
							const decodedLog = decodeEventLog({
								abi: isV2Contract
									? cookieJarFactoryAbi
									: cookieJarFactoryV1Abi,
								data: log.data,
								topics: log.topics,
								eventName: "CookieJarCreated",
							});

							if (decodedLog.eventName === "CookieJarCreated") {
								jarAddress = (decodedLog.args as any)?.cookieJarAddress;
								break;
							}
						} catch {
							// Log is not CookieJarCreated event, checking next
						}
					}
				}

				if (jarAddress && isAddress(jarAddress)) {
					setNewJarPreview({
						address: jarAddress,
						name: values.jarName || "New Cookie Jar",
						currency: values.supportedCurrency,
					});

					setTimeout(() => {
						router.push(`/jar/${jarAddress}`);
					}, 1000);

					setIsCreating(false);
					form.reset();
					return;
				}

				setTimeout(() => {
					router.push("/jars");
				}, 500);
			} catch (error) {
				console.error("Error extracting jar address:", error);
				setTimeout(() => {
					router.push("/jars");
				}, 500);
			}

			setIsCreating(false);
			form.reset();
		}
	}, [
		txConfirmed,
		receipt,
		router,
		isV2Contract,
		toast,
		form,
		queryClient,
		chainId,
		factoryAddress,
	]);

	// Handle transaction error
	useEffect(() => {
		if (createError) {
			console.error("Transaction error:", createError);

			toast({
				title: "Transaction Failed",
				description: createError.message || "Failed to create cookie jar",
				variant: "destructive",
			});

			setIsCreating(false);
			setIsFormError(true);
		}
	}, [createError, toast]);

	// Sync wallet address to form
	useEffect(() => {
		if (isConnected && address) {
			form.setValue("jarOwnerAddress", address);
		}
	}, [isConnected, address, form]);

	// Reset v2-only fields when switching to v1 chain
	useEffect(() => {
		if (!isV2Contract) {
			form.setValue("accessType", AccessType.Allowlist);
			form.setValue("enableCustomFee", false);
			form.setValue("customFee", "");
		}
	}, [isV2Contract, form]);

	return {
		// RHF form instance — wrap in <FormProvider {...form}>
		form,

		// Transaction state
		isCreating: isPending,
		isWaitingForTx,
		txConfirmed,
		receipt,
		createError,

		// Error state
		isFormError,
		formErrors,

		// Preview
		newJarPreview,

		// Actions
		confirmSubmit,
		resetForm: () => form.reset(),

		// Per-step validation
		validateStep1,
		validateStep2,
		validateStep3,
		validateStep4,
		validateAll,

		// Constants
		ETH_ADDRESS,
		factoryAddress,
		isV2Contract,
	};
};
