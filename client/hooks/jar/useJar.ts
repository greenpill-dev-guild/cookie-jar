"use client";

import { keccak256, toHex } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { isV2Chain } from "@/config/supported-networks";
import { cookieJarAbi } from "@/generated";

/**
 * Return type for useCookieJarConfig hook
 */
interface CookieJarConfigReturn {
	/** Parsed jar configuration data */
	config: any;
	/** Whether the configuration is loading */
	isLoading: boolean;
	/** Whether an error occurred */
	hasError: boolean;
	/** Array of any errors that occurred */
	errors: any[];
	/** Function to refetch the configuration */
	refetch: () => void;
}

/**
 * Custom hook to read all Cookie Jar configuration from the smart contract
 *
 * Fetches comprehensive jar configuration including access control settings,
 * withdrawal parameters, balances, and user-specific data. Uses optimized
 * batch contract reads for better performance and automatically handles
 * v1/v2 contract differences.
 *
 * @param address - Cookie Jar contract address to fetch configuration for
 * @returns Object with configuration data, loading state, and refetch function
 *
 * @example
 * ```tsx
 * const { config, isLoading, hasError, refetch } = useCookieJarConfig(jarAddress);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (hasError) return <div>Error loading jar</div>;
 *
 * return (
 *   <div>
 *     <h1>{config.metadata}</h1>
 *     <p>Balance: {config.balance}</p>
 *     <p>Access: {config.accessType}</p>
 *   </div>
 * );
 * ```
 */
export const useCookieJarConfig = (
	address: `0x${string}`,
): CookieJarConfigReturn => {
	const { address: userAddress } = useAccount();
	const chainId = useChainId();

	const JAR_OWNER = keccak256(toHex("JAR_OWNER")) as `0x${string}`;

	// Use correct role names based on contract version
	const allowlistRoleName = isV2Chain(chainId)
		? "JAR_ALLOWLISTED"
		: "JAR_WHITELISTED";
	const JAR_ALLOWLISTED = keccak256(toHex(allowlistRoleName)) as `0x${string}`;

	const denylistRoleName = isV2Chain(chainId)
		? "JAR_DENYLISTED"
		: "JAR_BLACKLISTED";
	const JAR_DENYLISTED = keccak256(toHex(denylistRoleName)) as `0x${string}`;

	// Contract calls - only using functions that actually exist
	const contracts = [
		{ address, abi: cookieJarAbi, functionName: "ACCESS_TYPE" },
		{
			address,
			abi: cookieJarAbi,
			functionName: "hasRole",
			args: [
				JAR_OWNER,
				userAddress ||
					("0x0000000000000000000000000000000000000000" as `0x${string}`),
			],
		},
		{ address, abi: cookieJarAbi, functionName: "WITHDRAWAL_OPTION" },
		{ address, abi: cookieJarAbi, functionName: "fixedAmount" },
		{ address, abi: cookieJarAbi, functionName: "maxWithdrawal" },
		{ address, abi: cookieJarAbi, functionName: "withdrawalInterval" },
		{ address, abi: cookieJarAbi, functionName: "STRICT_PURPOSE" },
		{
			address,
			abi: cookieJarAbi,
			functionName: "EMERGENCY_WITHDRAWAL_ENABLED",
		},
		{ address, abi: cookieJarAbi, functionName: "ONE_TIME_WITHDRAWAL" },
		{ address, abi: cookieJarAbi, functionName: "feeCollector" },
		{
			address,
			abi: cookieJarAbi,
			functionName: "hasRole",
			args: [
				JAR_ALLOWLISTED,
				userAddress ||
					("0x0000000000000000000000000000000000000000" as `0x${string}`),
			],
		},
		{
			address,
			abi: cookieJarAbi,
			functionName: "hasRole",
			args: [
				JAR_DENYLISTED,
				userAddress ||
					("0x0000000000000000000000000000000000000000" as `0x${string}`),
			],
		},
		// Public mappings that actually exist in the contract
		{
			address,
			abi: cookieJarAbi,
			functionName: "lastWithdrawalTime",
			args: [
				userAddress ||
					("0x0000000000000000000000000000000000000000" as `0x${string}`),
			],
		},
		{
			address,
			abi: cookieJarAbi,
			functionName: "totalWithdrawn",
			args: [
				userAddress ||
					("0x0000000000000000000000000000000000000000" as `0x${string}`),
			],
		},
		{
			address,
			abi: cookieJarAbi,
			functionName: "withdrawnInCurrentPeriod",
			args: [
				userAddress ||
					("0x0000000000000000000000000000000000000000" as `0x${string}`),
			],
		},
		{ address, abi: cookieJarAbi, functionName: "currencyHeldByJar" },
		{ address, abi: cookieJarAbi, functionName: "CURRENCY" },
	];

	const { data, isLoading, isError, error, refetch } = useReadContracts({
		contracts,
		allowFailure: true,
	});

	const WithdrawalTypeOptions = ["Fixed", "Variable"];

	// Simple access type mapping to avoid TypeScript issues
	const getAccessTypeName = (typeIndex: unknown): string => {
		switch (typeIndex) {
			case 0:
				return "Allowlist";
			case 1:
				return "NFT-Gated";
			case 2:
				return "POAP";
			case 3:
				return "Unlock";
			case 4:
				return "Hypercert";
			case 5:
				return "Hats";
			default:
				return "Unknown";
		}
	};

	// Extract results to variables to break complex type inference
	const results: any[] = (data as any) || [];
	const r0 = results[0]?.result; // accessType
	const r1 = results[1]?.result; // hasRole (JAR_OWNER)
	const r2 = results[2]?.result; // withdrawalOption
	const r3 = results[3]?.result; // fixedAmount
	const r4 = results[4]?.result; // maxWithdrawal
	const r5 = results[5]?.result; // withdrawalInterval
	const r6 = results[6]?.result; // strictPurpose
	const r7 = results[7]?.result; // emergencyWithdrawalEnabled
	const r8 = results[8]?.result; // oneTimeWithdrawal
	const r9 = results[9]?.result; // feeCollector
	const r10 = results[10]?.result; // hasRole (JAR_ALLOWLISTED)
	const r11 = results[11]?.result; // hasRole (JAR_DENYLISTED)
	const r12 = results[12]?.result; // lastWithdrawalTime
	const r13 = results[13]?.result; // totalWithdrawn
	const r14 = results[14]?.result; // withdrawnInCurrentPeriod
	const r15 = results[15]?.result; // currencyHeldByJar
	const r16 = results[16]?.result; // currency

	const accessTypeString = r0 !== undefined ? getAccessTypeName(r0) : undefined;

	// Create config object with pre-extracted values
	const config = {
		JAR_OWNER,
		contractAddress: address,
		accessType: accessTypeString,
		admin: r1 as boolean | undefined,
		withdrawalOption:
			r2 !== undefined ? WithdrawalTypeOptions[r2 as number] : undefined,
		fixedAmount: r3 as bigint | undefined,
		maxWithdrawal: r4 as bigint | undefined,
		withdrawalInterval: r5 as bigint | undefined,
		strictPurpose: r6 as boolean | undefined,
		emergencyWithdrawalEnabled: r7 as boolean | undefined,
		oneTimeWithdrawal: r8 as boolean | undefined,
		feeCollector: r9 as `0x${string}` | undefined,
		allowlist: r10 as boolean | undefined,
		denylist: r11 as boolean | undefined,
		lastWithdrawalTime: r12 as bigint | undefined, // Public mapping
		totalWithdrawn: r13 as bigint | undefined, // Public mapping
		withdrawnInCurrentPeriod: r14 as bigint | undefined, // Public mapping
		balance: r15 as bigint | undefined,
		currency: r16 as `0x${string}` | undefined,
		metadata: undefined as string | undefined,
		supportsProtocols: r0 !== undefined && (r0 as number) >= 2,
	};

	return {
		config,
		isLoading,
		hasError: isError,
		errors: error ? [error] : [],
		refetch,
	};
};
