"use client";

import { isV2Chain } from "@jar-core/config/networks";
import { cookieJarAbi } from "@jar-core/generated";
import { useTransactionWithRetry } from "@jar-core/hooks/app/useTransactionWithRetry";
import { cookieJarV1Abi } from "@jar-core/lib/blockchain/cookie-jar-v1-abi";
import {
	ETH_ADDRESS,
	useTokenInfo,
} from "@jar-core/lib/blockchain/token-utils";
import { parseTokenAmount } from "@jar-core/lib/jar/creation-values";
import {
	buildDepositCall,
	withdrawFunctionFor,
} from "@jar-core/lib/jar/deposit-args";
import { useCallback, useEffect, useRef, useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { useToast } from "../app/useToast";

/**
 * Configuration for jar transactions
 */
export interface JarConfig {
	/** Currency address (ETH_ADDRESS for native ETH) */
	currency?: string;
	/** Cookie jar contract address */
	contractAddress?: `0x${string}`;
	/** Fixed withdrawal amount (if applicable) */
	fixedAmount?: bigint;
	/** Access type label or enum value, used to pick the claim function */
	accessType?: string | number;
	accessTypeIndex?: number;
}

interface PendingDeposit {
	identity: string;
	owner: `0x${string}`;
	currency: `0x${string}`;
	amount: bigint;
	previousApprovalHash?: string;
	phase: "checking" | "approving" | "depositing";
}

interface TransactionOptions {
	/** Enable retry logic for failed transactions */
	enableRetry?: boolean;
	/** Maximum number of retry attempts */
	maxRetries?: number;
	/** Delay between retries in milliseconds */
	retryDelay?: number;
	/** Chain the jar lives on (defaults to the wallet's chain) */
	chainId?: number;
}

/**
 * Custom hook to handle Cookie Jar transaction logic (deposits and withdrawals)
 *
 * Manages all transaction-related state and logic including deposits, withdrawals,
 * approvals for ERC-20 tokens, and transaction status tracking. Automatically
 * handles differences between v1 and v2 contracts and ETH vs ERC-20 currencies.
 * Supports configurable retry logic for improved reliability.
 *
 * @param config - Jar configuration with currency and contract info
 * @param addressString - Cookie jar contract address
 * @param options - Transaction configuration options
 * @returns Object with transaction state, handlers, and status flags
 *
 * @example
 * ```tsx
 * const {
 *   amount,
 *   setAmount,
 *   onSubmit,
 *   withdrawAmount,
 *   handleWithdrawAllowlist,
 *   isApprovalPending,
 *   tokenSymbol
 * } = useJarTransactions(config, jarAddress, { enableRetry: true });
 *
 * // Handle deposit
 * <input value={amount} onChange={e => setAmount(e.target.value)} />
 * <button onClick={() => onSubmit(amount)}>Deposit</button>
 *
 * // Handle withdrawal
 * <button onClick={handleWithdrawAllowlist}>Withdraw</button>
 * ```
 */
export const useJarTransactions = (
	config: JarConfig | undefined,
	addressString: `0x${string}`,
	options: TransactionOptions = {}
) => {
	const { toast } = useToast();
	const walletChainId = useChainId();
	const account = useAccount();
	const {
		enableRetry = false,
		maxRetries = 3,
		retryDelay = 2000,
		chainId: chainIdOverride,
	} = options;
	const chainId = chainIdOverride ?? walletChainId;

	// Transaction state
	const [amount, setAmount] = useState("");
	const [withdrawAmount, setWithdrawAmount] = useState<string>("");
	const [withdrawPurpose, setWithdrawPurpose] = useState<string>("");
	const [gateAddress, setGateAddress] = useState<string>("");
	const [tokenId, setTokenId] = useState<string>("");
	const publicClient = usePublicClient({ chainId });
	const pendingDeposit = useRef<PendingDeposit>();
	const identity = `${account.isConnected}:${account.address?.toLowerCase()}:${account.chainId}:${chainId}:${addressString.toLowerCase()}:${config?.currency?.toLowerCase()}`;
	const identityRef = useRef(identity);
	identityRef.current = identity;
	const [transactionStep, setTransactionStep] = useState<
		"idle" | "checking" | "approving" | "depositing" | "withdrawing"
	>("idle");
	const clearDeposit = useCallback(() => {
		pendingDeposit.current = undefined;
		setTransactionStep("idle");
	}, []);
	useEffect(() => {
		if (
			pendingDeposit.current &&
			pendingDeposit.current.identity !== identity
		) {
			clearDeposit();
			depositETH.reset();
			depositCurrency.reset();
			approve.reset();
		}
	}, [identity, clearDeposit]);
	useEffect(
		() => () => {
			pendingDeposit.current = undefined;
		},
		[]
	);

	// Version-aware ABI and function selection
	const isV2 = isV2Chain(chainId);
	const abi = isV2 ? cookieJarAbi : cookieJarV1Abi;
	const withdrawAllowlistFunction = isV2
		? "withdrawAllowlistMode"
		: "withdrawWhitelistMode";
	const claimFunction = withdrawFunctionFor(
		config?.accessTypeIndex ?? config?.accessType,
		isV2
	);

	// Get token information
	const isERC20 = !!config?.currency && config.currency !== ETH_ADDRESS;
	const {
		symbol: tokenSymbol,
		decimals: tokenDecimals,
		error: tokenError,
	} = useTokenInfo(
		(isERC20 && config?.currency
			? config.currency
			: ETH_ADDRESS) as `0x${string}`,
		chainId
	);

	const tokenDecimalValue = isERC20 ? tokenDecimals : 18;
	const verifiedDecimals =
		isERC20 && tokenError ? undefined : tokenDecimalValue;
	let depositError = "";
	try {
		if (amount && parseTokenAmount(amount, verifiedDecimals) === 0n)
			depositError = "Enter an amount greater than zero.";
	} catch (error) {
		depositError = (error as Error).message;
	}
	if (!account.isConnected) depositError = "Connect your wallet to deposit.";
	else if (account.chainId !== chainId)
		depositError = "Switch to the jar network to deposit.";

	// Enhanced transaction hooks with retry logic
	const depositETH = useTransactionWithRetry({ maxRetries: 0 });
	const depositCurrency = useTransactionWithRetry({ maxRetries: 0 });
	const approve = useTransactionWithRetry({ maxRetries: 0 });

	const withdrawAllowlist = useTransactionWithRetry({
		maxRetries: enableRetry ? maxRetries : 1,
		retryDelay: enableRetry ? retryDelay : 0,
	});

	const withdrawNFT = useTransactionWithRetry({
		maxRetries: enableRetry ? maxRetries : 1,
		retryDelay: enableRetry ? retryDelay : 0,
	});

	const transactionError = [
		approve.error,
		depositETH.error,
		depositCurrency.error,
		withdrawAllowlist.error,
		withdrawNFT.error,
	].find(Boolean)?.message as string | undefined;
	useEffect(() => {
		if (
			(approve.error?.message?.toLowerCase().includes("revert") &&
				transactionStep === "approving") ||
			((depositETH.error?.message?.toLowerCase().includes("revert") ||
				depositCurrency.error?.message?.toLowerCase().includes("revert")) &&
				transactionStep === "depositing")
		) {
			clearDeposit();
		}
	}, [
		approve.error,
		depositETH.error,
		depositCurrency.error,
		transactionStep,
		clearDeposit,
	]);
	const retryConfirmation = async () => {
		for (const transaction of [
			approve,
			depositETH,
			depositCurrency,
			withdrawAllowlist,
			withdrawNFT,
		]) {
			if (transaction.hash && transaction.error)
				await transaction.retryConfirmation();
		}
	};
	const isCurrentDeposit = (pending: PendingDeposit) =>
		pendingDeposit.current === pending &&
		identityRef.current === pending.identity;
	const readAllowance = async (pending: PendingDeposit) => {
		if (!publicClient)
			throw new Error("Unable to check token approval. Please try again.");
		return publicClient.readContract({
			address: pending.currency,
			abi: erc20Abi,
			functionName: "allowance",
			args: [pending.owner, addressString],
		});
	};
	const sendDeposit = async (pending: PendingDeposit) => {
		if (!isCurrentDeposit(pending)) return;
		pending.phase = "depositing";
		setTransactionStep("depositing");
		const call = buildDepositCall({
			isV2,
			currency: pending.currency,
			amount: pending.amount,
		});
		await (pending.currency === ETH_ADDRESS
			? depositETH
			: depositCurrency
		).writeContract({
			address: addressString,
			abi,
			functionName: call.functionName,
			args: call.args,
			account: pending.owner,
			...(call.value === undefined ? {} : { value: call.value }),
			chainId,
		});
	};
	const reportDepositError = (error: unknown, pending: PendingDeposit) => {
		if (!isCurrentDeposit(pending)) return;
		toast({
			title: "Deposit failed",
			description: (error as Error).message,
			variant: "destructive",
		});
		clearDeposit();
	};

	// A Safe proposal is not an executed approval. Read actual allowance after the receipt.
	useEffect(() => {
		const pending = pendingDeposit.current;
		if (
			!pending ||
			pending.phase !== "approving" ||
			!approve.isSuccess ||
			!approve.hash ||
			approve.hash === pending.previousApprovalHash ||
			!isCurrentDeposit(pending)
		)
			return;
		pending.phase = "checking";
		setTransactionStep("checking");
		void (async () => {
			try {
				const allowance = await readAllowance(pending);
				if (!isCurrentDeposit(pending)) return;
				if (allowance < pending.amount) {
					pending.phase = "approving";
					pending.previousApprovalHash = approve.hash;
					setTransactionStep("approving");
					return;
				}
				await sendDeposit(pending);
			} catch (error) {
				if (!isCurrentDeposit(pending)) return;
				if (pending.phase === "depositing") {
					reportDepositError(error, pending);
					return;
				}
				pending.phase = "approving";
				pending.previousApprovalHash = approve.hash;
				setTransactionStep("approving");
				toast({
					title: "Approval check failed",
					description: "Check approval again once the network is available.",
					variant: "destructive",
				});
			}
		})();
	});

	// Allows a multisig user to resume after execution in Safe, without proposing approval again.
	const checkApproval = async () => {
		const pending = pendingDeposit.current;
		if (!pending || pending.phase !== "approving") return;
		pending.phase = "checking";
		setTransactionStep("checking");
		try {
			const allowance = await readAllowance(pending);
			if (!isCurrentDeposit(pending)) return;
			if (allowance >= pending.amount) {
				approve.reset();
				clearDeposit();
				toast({
					title: "Token approval confirmed",
					description: "You can now deposit the funds.",
				});
			} else {
				pending.phase = "approving";
				setTransactionStep("approving");
				toast({
					title: "Waiting for approval execution",
					description:
						"Execute the approval in your multisig, then check again.",
				});
			}
		} catch {
			if (!isCurrentDeposit(pending)) return;
			pending.phase = "approving";
			setTransactionStep("approving");
			toast({
				title: "Approval check failed",
				description: "Check approval again once the network is available.",
				variant: "destructive",
			});
		}
	};

	const onSubmit = async (value: string) => {
		if (!config?.currency || pendingDeposit.current) return;
		let pending: PendingDeposit | undefined;
		try {
			const amountBigInt = parseTokenAmount(value, verifiedDecimals);
			if (amountBigInt <= 0n)
				throw new Error("Enter an amount greater than zero.");
			if (
				!account.isConnected ||
				!account.address ||
				account.chainId !== chainId
			)
				throw new Error("Connect your wallet on the jar network to deposit.");
			pending = {
				identity,
				owner: account.address,
				currency: config.currency as `0x${string}`,
				amount: amountBigInt,
				phase: "checking",
				previousApprovalHash: approve.hash,
			};
			depositETH.reset();
			depositCurrency.reset();
			approve.reset();
			pendingDeposit.current = pending;
			setTransactionStep("checking");
			if (pending.currency === ETH_ADDRESS) {
				await sendDeposit(pending);
				return;
			}
			const allowance = await readAllowance(pending);
			if (!isCurrentDeposit(pending)) return;
			if (allowance >= amountBigInt) {
				await sendDeposit(pending);
				return;
			}
			pending.phase = "approving";
			setTransactionStep("approving");
			await approve.writeContract({
				address: pending.currency,
				abi: erc20Abi,
				functionName: "approve",
				account: pending.owner,
				args: [addressString, amountBigInt],
				chainId,
			});
		} catch (error) {
			if (pending) reportDepositError(error, pending);
			else
				toast({
					title: "Deposit failed",
					description: (error as Error).message,
					variant: "destructive",
				});
		}
	};

	// Allowlist withdrawal handlers
	const handleWithdrawAllowlist = useCallback(async () => {
		if (!config?.contractAddress || !config?.fixedAmount) return;

		try {
			setTransactionStep("withdrawing");
			await withdrawAllowlist.writeContract({
				address: config.contractAddress,
				abi,
				functionName: claimFunction,
				args: [config.fixedAmount, withdrawPurpose],
				chainId,
			});
		} catch {
			setTransactionStep("idle");
		}
	}, [
		config?.contractAddress,
		config?.fixedAmount,
		withdrawAllowlist,
		abi,
		claimFunction,
		withdrawPurpose,
		chainId,
	]);

	const handleWithdrawAllowlistVariable = useCallback(
		async (variableAmount?: bigint) => {
			if (!config?.contractAddress) return;

			try {
				const amountToWithdraw =
					variableAmount ?? parseTokenAmount(withdrawAmount, verifiedDecimals);
				if (amountToWithdraw <= 0n)
					throw new Error("Enter an amount greater than zero.");
				setTransactionStep("withdrawing");
				await withdrawAllowlist.writeContract({
					address: config.contractAddress,
					abi,
					functionName: claimFunction,
					args: [amountToWithdraw, withdrawPurpose],
					chainId,
				});
			} catch {
				setTransactionStep("idle");
			}
		},
		[
			config?.contractAddress,
			config?.currency,
			withdrawAmount,
			verifiedDecimals,
			withdrawAllowlist,
			abi,
			claimFunction,
			withdrawPurpose,
			chainId,
		]
	);

	// NFT withdrawal handlers
	const handleWithdrawNFT = useCallback(
		async (withdrawalAmount?: bigint) => {
			if (!config?.contractAddress || !gateAddress) return;

			const amountToWithdraw =
				withdrawalAmount || config?.fixedAmount || BigInt(0);

			try {
				setTransactionStep("withdrawing");
				await withdrawNFT.writeContract({
					address: config.contractAddress,
					abi,
					chainId,
					functionName: "withdrawNFTMode",
					args: [
						amountToWithdraw,
						withdrawPurpose,
						gateAddress as `0x${string}`,
						BigInt(tokenId || "0"),
					],
				});
			} catch {
				setTransactionStep("idle");
			}
		},
		[
			config?.contractAddress,
			config?.fixedAmount,
			gateAddress,
			tokenId,
			withdrawPurpose,
			withdrawNFT,
			chainId,
			abi,
		]
	);

	const handleWithdrawNFTVariable = useCallback(
		async (variableAmount?: bigint) => {
			if (!config?.contractAddress || !gateAddress) return;

			try {
				const amountToWithdraw =
					variableAmount ?? parseTokenAmount(withdrawAmount, verifiedDecimals);
				if (amountToWithdraw <= 0n)
					throw new Error("Enter an amount greater than zero.");
				setTransactionStep("withdrawing");
				await withdrawNFT.writeContract({
					address: config.contractAddress,
					abi,
					chainId,
					functionName: "withdrawNFTMode",
					args: [
						amountToWithdraw,
						withdrawPurpose,
						gateAddress as `0x${string}`,
						BigInt(tokenId || "0"),
					],
				});
			} catch {
				setTransactionStep("idle");
			}
		},
		[
			config?.contractAddress,
			config?.currency,
			withdrawAmount,
			verifiedDecimals,
			gateAddress,
			tokenId,
			withdrawPurpose,
			withdrawNFT,
			chainId,
			abi,
		]
	);

	const handledDeposit = useRef<string>();
	const handledWithdrawal = useRef<string>();
	// Handle deposit completion
	useEffect(() => {
		const confirmed = depositETH.isSuccess
			? depositETH.hash
			: depositCurrency.isSuccess
				? depositCurrency.hash
				: undefined;
		if (
			confirmed &&
			transactionStep === "depositing" &&
			handledDeposit.current !== confirmed
		) {
			handledDeposit.current = confirmed;
			toast({
				title: "Deposit Successful",
				description: `Successfully deposited ${amount} ${tokenSymbol}`,
			});

			setAmount("");
			clearDeposit();
		}
	}, [
		depositETH.hash,
		depositCurrency.hash,
		depositETH.isSuccess,
		depositCurrency.isSuccess,
		amount,
		tokenSymbol,
		toast,
		transactionStep,
		clearDeposit,
	]);

	// Handle withdrawal completion
	useEffect(() => {
		const confirmed = withdrawAllowlist.isSuccess
			? withdrawAllowlist.hash
			: withdrawNFT.isSuccess
				? withdrawNFT.hash
				: undefined;
		if (confirmed && handledWithdrawal.current !== confirmed) {
			handledWithdrawal.current = confirmed;
			toast({
				title: "Withdrawal Successful",
				description: withdrawPurpose
					? `Successfully withdrew for: ${withdrawPurpose}`
					: "Successfully withdrew funds",
			});

			setWithdrawAmount("");
			setWithdrawPurpose("");
			setTransactionStep("idle");
		}
	}, [
		withdrawAllowlist.hash,
		withdrawNFT.hash,
		withdrawAllowlist.isSuccess,
		withdrawNFT.isSuccess,
		withdrawPurpose,
		toast,
	]);

	// Reset all transactions
	const resetTransactions = useCallback(() => {
		depositETH.reset();
		depositCurrency.reset();
		approve.reset();
		withdrawAllowlist.reset();
		withdrawNFT.reset();
		clearDeposit();
	}, [
		depositETH,
		depositCurrency,
		approve,
		withdrawAllowlist,
		withdrawNFT,
		clearDeposit,
	]);

	// Combined loading states
	const isApprovalPending = approve.isPending || approve.isLoading;
	const isDepositPending =
		depositETH.isPending ||
		depositCurrency.isPending ||
		depositETH.isLoading ||
		depositCurrency.isLoading ||
		transactionStep === "checking" ||
		transactionStep === "approving" ||
		transactionStep === "depositing";
	const isWithdrawPending =
		withdrawAllowlist.isPending ||
		withdrawNFT.isPending ||
		withdrawAllowlist.isLoading ||
		withdrawNFT.isLoading;

	return {
		// State
		transactionError,
		retryConfirmation,
		amount,
		depositError,
		setAmount,
		withdrawAmount,
		setWithdrawAmount,
		withdrawPurpose,
		setWithdrawPurpose,
		gateAddress,
		setGateAddress,
		tokenId,
		setTokenId,
		transactionStep,

		// Token info
		claimFunction,
		withdrawAllowlistFunction,
		tokenSymbol,
		tokenDecimals: tokenDecimalValue,
		verifiedDecimals,

		// Transaction handlers
		onSubmit,
		checkApproval,
		handleWithdrawAllowlist,
		handleWithdrawAllowlistVariable,
		handleWithdrawNFT,
		handleWithdrawNFTVariable,
		resetTransactions,

		// Status flags
		isApprovalPending,
		isDepositPending,
		isWithdrawPending,

		// Individual transaction states (for advanced usage)
		depositETH,
		depositCurrency,
		approve,
		withdrawAllowlist,
		withdrawNFT,

		// Retry capabilities
		canRetryDeposit: false,
		canRetryWithdrawal:
			withdrawAllowlist.retryState.canRetry || withdrawNFT.retryState.canRetry,
		retryDeposit: () => {
			void retryConfirmation();
		},
		retryWithdrawal: () => {
			if (withdrawAllowlist.retryState.canRetry) withdrawAllowlist.retry();
			if (withdrawNFT.retryState.canRetry) withdrawNFT.retry();
		},

		// For composing withdrawal sections
		config: {
			...config,
			isWithdrawPending,
		},
	};
};
