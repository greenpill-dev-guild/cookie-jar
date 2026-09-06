"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { type Address, decodeEventLog, erc20Abi, isAddress } from "viem";
import {
	useAccount,
	usePublicClient,
	useReadContract,
	useReadContracts,
	useWaitForTransactionReceipt,
} from "wagmi";
import { FEATURED_JAR } from "@/config/featured-jar";
import { contractAddresses, isV2Chain } from "@/config/supported-networks";
import { cookieJarFactoryAbi } from "@/generated";
import { useTransactionWithRetry } from "@/hooks/app/useTransactionWithRetry";
import { ETH_ADDRESS } from "@/lib/blockchain/constants";
import { cookieJarFactoryV1Abi } from "@/lib/blockchain/cookie-jar-v1-abi";
import {
	DEFAULT_CREATION_VALUES,
	daysToSeconds,
	parseTokenAmount,
	STIPEND_PRESET,
} from "@/lib/jar/creation-values";
import { useToast } from "../app/useToast";
import {
	buildV2CreateCookieJarArgs,
	FACTORY_DEFAULT_FEE_SENTINEL,
	getAccessConfigValidationError,
	getFeePercentageOnDeposit,
} from "./createV2CreateArgs";
import {
	AccessType,
	type JarCreationFormData,
	jarCreationSchema,
	NFTType,
	type ProtocolConfig,
	WithdrawalTypeOptions,
} from "./schemas/jarCreationSchema";

export { AccessType, WithdrawalTypeOptions, NFTType };
export type { ProtocolConfig, JarCreationFormData };

type Submission = {
	values: JarCreationFormData;
	chainId: number;
	factoryAddress: Address;
	isV2: boolean;
};

export function useJarCreation() {
	const router = useRouter();
	const account = useAccount();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const form = useForm<JarCreationFormData>({
		resolver: zodResolver(jarCreationSchema as any),
		defaultValues: {
			...DEFAULT_CREATION_VALUES,
			chainId: FEATURED_JAR.chainId,
		},
		mode: "onTouched",
	});
	const values = form.watch();
	const chainId = values.chainId;
	const factoryAddress = contractAddresses.cookieJarFactory[chainId];
	const isV2Contract = isV2Chain(chainId);
	const publicClient = usePublicClient({ chainId });
	const native = values.supportedCurrency === ETH_ADDRESS;
	const token = useReadContracts({
		contracts: [
			{
				chainId,
				address: values.supportedCurrency as Address,
				abi: erc20Abi,
				functionName: "symbol",
			},
			{
				chainId,
				address: values.supportedCurrency as Address,
				abi: erc20Abi,
				functionName: "decimals",
			},
		],
		query: { enabled: !native && isAddress(values.supportedCurrency) },
	});
	const tokenDecimals = native
		? 18
		: token.data?.[1]?.status === "success"
			? Number(token.data[1].result)
			: undefined;
	const tokenSymbol = native
		? "Native token"
		: token.data?.[0]?.status === "success"
			? String(token.data[0].result)
			: undefined;
	const tokenReady = tokenDecimals !== undefined && !!tokenSymbol;
	const defaultFee = useReadContract({
		chainId,
		address: factoryAddress,
		abi: cookieJarFactoryAbi,
		functionName: "DEFAULT_FEE_PERCENTAGE",
		query: { enabled: !!factoryAddress && isV2Contract },
	});
	let effectiveFee: bigint | undefined;
	try {
		const fee = getFeePercentageOnDeposit(values);
		effectiveFee = fee === FACTORY_DEFAULT_FEE_SENTINEL ? defaultFee.data : fee;
	} catch {
		/* Validation below explains invalid fees. */
	}
	const [formErrors, setFormErrors] = useState<string[]>([]);
	const [presetApplied, setPresetApplied] = useState(false);
	const [busy, setBusy] = useState(false);
	const busyRef = useRef(false);
	const [submission, setSubmission] = useState<Submission>();
	const handledReceipt = useRef<string>();
	const [newJarPreview, setNewJarPreview] = useState<{
		address: string;
		name: string;
		currency: string;
	} | null>(null);
	// Creation is non-idempotent: never automatically repeat a wallet write.
	const transaction = useTransactionWithRetry({ maxRetries: 0 });
	const receiptQuery = useWaitForTransactionReceipt({
		hash: transaction.hash,
		chainId: submission?.chainId ?? chainId,
	});

	function validation(step?: number) {
		const v = form.getValues();
		const errors: string[] = [];
		if (step === undefined || step === 1) {
			if (!v.jarName.trim()) errors.push("Jar name is required.");
			if (!isAddress(v.jarOwnerAddress) || /^0x0{40}$/i.test(v.jarOwnerAddress))
				errors.push("Enter a non-zero owner address.");
			if (!factoryAddress)
				errors.push("No factory is configured on this network.");
			if (!isAddress(v.supportedCurrency))
				errors.push("Enter a valid currency address.");
			if (!tokenReady)
				errors.push("Wait for valid token metadata before continuing.");
		}
		if (step === undefined || step === 2) {
			try {
				const amount = parseTokenAmount(
					v.withdrawalOption === WithdrawalTypeOptions.Fixed
						? v.fixedAmount
						: v.maxWithdrawal,
					tokenDecimals
				);
				if (amount === 0n)
					errors.push("The claim amount must be greater than zero.");
				daysToSeconds(v.withdrawalInterval);
			} catch (error) {
				errors.push((error as Error).message);
			}
		}
		if (step === undefined || step === 3) {
			const error = getAccessConfigValidationError(v);
			if (error) errors.push(error);
			if (
				v.accessType === AccessType.Hats &&
				v.protocolConfig.hatsAddress &&
				!isAddress(v.protocolConfig.hatsAddress)
			)
				errors.push("Enter a valid Hats contract address.");
		}
		if (step === undefined || step === 4) {
			try {
				parseTokenAmount(v.minDeposit, tokenDecimals);
				getFeePercentageOnDeposit(v);
			} catch (error) {
				errors.push((error as Error).message);
			}
			if (isV2Contract && effectiveFee === undefined)
				errors.push("Wait for the deposit fee to load.");
		}
		return { isValid: errors.length === 0, errors };
	}

	function applyStipendPreset() {
		if (busyRef.current) return;
		form.reset(structuredClone(STIPEND_PRESET));
		setPresetApplied(true);
		setFormErrors([]);
	}

	async function confirmSubmit() {
		if (busyRef.current) return;
		const result = validation();
		if (!account.isConnected || !account.address)
			result.errors.push("Connect your wallet to create the jar.");
		if (account.chainId !== chainId)
			result.errors.push(
				"Switch your wallet to the selected network before creating the jar."
			);
		if (!publicClient)
			result.errors.push("The selected network is unavailable.");
		setFormErrors(result.errors);
		if (
			result.errors.length ||
			!account.address ||
			!factoryAddress ||
			!publicClient
		)
			return;
		busyRef.current = true;
		setBusy(true);
		transaction.reset();
		const submitted: Submission = {
			values: structuredClone(form.getValues()),
			chainId,
			factoryAddress,
			isV2: isV2Contract,
		};
		setSubmission(submitted);
		const v = submitted.values;
		try {
			const parseAmount = (text: string) =>
				parseTokenAmount(text, tokenDecimals);
			const metadata = JSON.stringify({
				name: v.jarName,
				description: v.metadata,
				image: v.imageUrl,
				link: v.externalLink,
			});
			const call = isV2Contract
				? {
						address: factoryAddress,
						abi: cookieJarFactoryAbi,
						functionName: "createCookieJar" as const,
						args: buildV2CreateCookieJarArgs({
							values: {
								...v,
								fixedAmount: v.withdrawalOption === 0 ? v.fixedAmount : "0",
								maxWithdrawal: v.withdrawalOption === 1 ? v.maxWithdrawal : "0",
							},
							metadata,
							parseAmount,
						}),
					}
				: {
						address: factoryAddress,
						abi: cookieJarFactoryV1Abi,
						functionName: "createCookieJar" as const,
						args: [
							v.jarOwnerAddress as Address,
							v.supportedCurrency as Address,
							v.accessType,
							v.nftAddresses as Address[],
							v.nftTypes,
							v.withdrawalOption,
							parseAmount(v.withdrawalOption === 0 ? v.fixedAmount : "0"),
							parseAmount(v.withdrawalOption === 1 ? v.maxWithdrawal : "0"),
							daysToSeconds(v.withdrawalInterval),
							v.strictPurpose,
							v.emergencyWithdrawalEnabled,
							v.oneTimeWithdrawal,
							[] as Address[],
							metadata,
						] as const,
					};
			await publicClient.simulateContract({
				...call,
				account: account.address,
			} as Parameters<typeof publicClient.simulateContract>[0]);
			await transaction.writeContract({
				...call,
				account: account.address,
				chainId,
			});
		} catch (error) {
			setFormErrors([(error as Error).message]);
			setBusy(false);
			busyRef.current = false;
		}
	}

	useEffect(() => {
		// Only fill an untouched, empty owner. A connection must never replace the Safe or a deliberate edit.
		if (
			account.address &&
			!form.getValues("jarOwnerAddress") &&
			!form.getFieldState("jarOwnerAddress").isDirty
		)
			form.setValue("jarOwnerAddress", account.address);
	}, [account.address, form]);

	useEffect(() => {
		if (receiptQuery.error?.message?.toLowerCase().includes("revert")) {
			setFormErrors(["Creation reverted. Review the settings and try again."]);
			setBusy(false);
			busyRef.current = false;
		}
	}, [receiptQuery.error]);
	useEffect(() => {
		const receipt = receiptQuery.data;
		if (
			!submission ||
			!receipt ||
			handledReceipt.current === receipt.transactionHash
		)
			return;
		handledReceipt.current = receipt.transactionHash;
		setBusy(false);
		busyRef.current = false;
		if (receipt.status !== "success") {
			setFormErrors(["Creation reverted. Review the settings and try again."]);
			return;
		}
		let jarAddress: Address | undefined;
		for (const entry of receipt.logs) {
			if (
				entry.address.toLowerCase() !== submission.factoryAddress.toLowerCase()
			)
				continue;
			try {
				const decoded = decodeEventLog({
					abi: submission.isV2 ? cookieJarFactoryAbi : cookieJarFactoryV1Abi,
					data: entry.data,
					topics: entry.topics,
				});
				if (decoded.eventName === "JarCreated")
					jarAddress = decoded.args.jarAddress;
				if (decoded.eventName === "CookieJarCreated")
					jarAddress = decoded.args.cookieJarAddress;
			} catch {
				/* Other factory logs are not creation receipts. */
			}
		}
		queryClient.invalidateQueries({
			queryKey: [
				"cookie-jar-factory",
				submission.chainId,
				submission.factoryAddress,
			],
		});
		if (!jarAddress) {
			setFormErrors([
				"Transaction confirmed, but the new jar address was not found. Check the transaction before creating another jar.",
			]);
			return;
		}
		setNewJarPreview({
			address: jarAddress,
			name: submission.values.jarName,
			currency: submission.values.supportedCurrency,
		});
		toast({
			title: "Jar created",
			description:
				"Your jar is ready. Deposit through its Deposit tab to fund it.",
		});
		router.push(`/jar/${jarAddress}?chainId=${submission.chainId}`);
	}, [receiptQuery.data, submission, queryClient, router, toast]);

	return {
		form,
		chainId,
		factoryAddress,
		isV2Contract,
		tokenDecimals,
		tokenSymbol,
		tokenReady,
		effectiveFee,
		isCreating: busy && !transaction.hash,
		isWaitingForTx: busy && !!transaction.hash,
		busy,
		confirmationError: receiptQuery.error
			? "Unable to read transaction confirmation. Keep this review open and retry the confirmation check."
			: undefined,
		retryConfirmation: receiptQuery.refetch,
		submittedHash: transaction.hash,
		txConfirmed: receiptQuery.isSuccess,
		receipt: receiptQuery.data,
		createError: transaction.error ?? receiptQuery.error,
		isFormError: formErrors.length > 0,
		formErrors,
		newJarPreview,
		confirmSubmit,
		applyStipendPreset,
		presetApplied,
		presetCustomized:
			presetApplied &&
			JSON.stringify(values) !== JSON.stringify(STIPEND_PRESET),
		resetForm: () => {
			if (!busyRef.current) {
				form.reset({ ...DEFAULT_CREATION_VALUES, chainId });
				setPresetApplied(false);
			}
		},
		validateStep1: () => validation(1),
		validateStep2: () => validation(2),
		validateStep3: () => validation(3),
		validateStep4: () => validation(4),
		validateAll: () => validation(),
		ETH_ADDRESS,
	};
}
