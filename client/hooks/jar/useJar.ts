"use client";

import { type ContractFunctionParameters, keccak256, toHex } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { contractAddresses, isV2Chain } from "@/config/supported-networks";
import { cookieJarAbi, cookieJarFactoryAbi } from "@/generated";
import { getAccessTypeLabel } from "@/lib/jar/access-types";

export interface NftRequirement {
	nftContract: `0x${string}`;
	tokenId: bigint;
	minBalance: bigint;
	isPoapEventGate: boolean;
}

/**
 * Parsed jar configuration. Fields are undefined until the matching read resolves.
 */
export interface CookieJarConfig {
	JAR_OWNER: `0x${string}`;
	contractAddress: `0x${string}`;
	chainId: number;
	/** Display label: Allowlist, ERC721, ERC1155, Hats, POAP */
	accessType?: string;
	/** Raw contract enum value */
	accessTypeIndex?: number;
	admin?: boolean;
	withdrawalOption?: string;
	fixedAmount?: bigint;
	maxWithdrawal?: bigint;
	withdrawalInterval?: bigint;
	strictPurpose?: boolean;
	emergencyWithdrawalEnabled?: boolean;
	oneTimeWithdrawal?: boolean;
	feeCollector?: `0x${string}`;
	allowlist?: boolean;
	/** V2 jars have no denylist role; kept for V1 compatibility */
	denylist: boolean;
	lastWithdrawalTime?: bigint;
	totalWithdrawn?: bigint;
	withdrawnInCurrentPeriod?: bigint;
	balance?: bigint;
	currency?: `0x${string}`;
	nftRequirement?: NftRequirement;
	feePercentageOnDeposit?: bigint;
	minDeposit?: bigint;
	metadata?: string;
	creator?: `0x${string}`;
	createdAt?: bigint;
	supportsProtocols: boolean;
}

interface CookieJarConfigReturn {
	config: CookieJarConfig;
	isLoading: boolean;
	hasError: boolean;
	errors: unknown[];
	refetch: () => void;
}

export interface ReadResult {
	result?: unknown;
	status?: "success" | "failure";
	error?: unknown;
}

const ZERO_ADDRESS =
	"0x0000000000000000000000000000000000000000" as `0x${string}`;
const WITHDRAWAL_OPTIONS = ["Fixed", "Variable"];

/**
 * Order of the batched reads in useCookieJarConfig. parseJarConfigResults relies on it.
 */
export const JAR_CONFIG_READS = [
	"ACCESS_TYPE",
	"hasRole:JAR_OWNER",
	"WITHDRAWAL_OPTION",
	"fixedAmount",
	"maxWithdrawal",
	"withdrawalInterval",
	"STRICT_PURPOSE",
	"EMERGENCY_WITHDRAWAL_ENABLED",
	"ONE_TIME_WITHDRAWAL",
	"feeCollector",
	"hasRole:JAR_ALLOWLISTED",
	"lastWithdrawalTime",
	"totalWithdrawn",
	"withdrawnInCurrentPeriod",
	"currencyHeldByJar",
	"CURRENCY",
	"nftRequirement",
	"FEE_PERCENTAGE_ON_DEPOSIT",
	"MIN_DEPOSIT",
	"factory:getJarInfo",
] as const;

/**
 * Pure mapping from the batched read results to the config object (exported for tests).
 */
export function parseJarConfigResults(
	results: ReadResult[],
	context: {
		address: `0x${string}`;
		chainId: number;
		jarOwnerRole: `0x${string}`;
	}
): CookieJarConfig {
	const at = (index: number): unknown => results[index]?.result;
	const accessTypeIndex =
		at(0) !== undefined ? Number(at(0) as number | bigint) : undefined;
	const nftTuple = at(16) as
		| readonly [`0x${string}`, bigint, bigint, boolean]
		| undefined;
	const nftRequirement: NftRequirement | undefined =
		nftTuple && nftTuple[0] && nftTuple[0] !== ZERO_ADDRESS
			? {
					nftContract: nftTuple[0],
					tokenId: nftTuple[1],
					minBalance: nftTuple[2],
					isPoapEventGate: nftTuple[3],
				}
			: undefined;
	const jarInfo = at(19) as
		| readonly [`0x${string}`, bigint, string]
		| undefined;
	const withdrawalOptionIndex = at(2);

	return {
		JAR_OWNER: context.jarOwnerRole,
		contractAddress: context.address,
		chainId: context.chainId,
		accessType:
			accessTypeIndex !== undefined
				? getAccessTypeLabel(accessTypeIndex, nftRequirement?.nftContract)
				: undefined,
		accessTypeIndex,
		admin: at(1) as boolean | undefined,
		withdrawalOption:
			withdrawalOptionIndex !== undefined
				? WITHDRAWAL_OPTIONS[Number(withdrawalOptionIndex as number | bigint)]
				: undefined,
		fixedAmount: at(3) as bigint | undefined,
		maxWithdrawal: at(4) as bigint | undefined,
		withdrawalInterval: at(5) as bigint | undefined,
		strictPurpose: at(6) as boolean | undefined,
		emergencyWithdrawalEnabled: at(7) as boolean | undefined,
		oneTimeWithdrawal: at(8) as boolean | undefined,
		feeCollector: at(9) as `0x${string}` | undefined,
		allowlist: at(10) as boolean | undefined,
		denylist: false,
		lastWithdrawalTime: at(11) as bigint | undefined,
		totalWithdrawn: at(12) as bigint | undefined,
		withdrawnInCurrentPeriod: at(13) as bigint | undefined,
		balance: at(14) as bigint | undefined,
		currency: at(15) as `0x${string}` | undefined,
		nftRequirement,
		feePercentageOnDeposit: at(17) as bigint | undefined,
		minDeposit: at(18) as bigint | undefined,
		metadata: jarInfo?.[2],
		creator: jarInfo?.[0],
		createdAt: jarInfo?.[1],
		supportsProtocols: accessTypeIndex !== undefined && accessTypeIndex >= 1,
	};
}

/**
 * Reads the full configuration of a Cookie Jar in one batched call.
 *
 * @param address - Jar contract address
 * @param chainIdOverride - Chain to read from (defaults to the wallet's chain)
 */
export const useCookieJarConfig = (
	address: `0x${string}`,
	chainIdOverride?: number
): CookieJarConfigReturn => {
	const { address: userAddress } = useAccount();
	const walletChainId = useChainId();
	const chainId = chainIdOverride ?? walletChainId;
	const user = userAddress || ZERO_ADDRESS;

	const JAR_OWNER = keccak256(toHex("JAR_OWNER")) as `0x${string}`;
	const allowlistRoleName = isV2Chain(chainId)
		? "JAR_ALLOWLISTED"
		: "JAR_WHITELISTED";
	const JAR_ALLOWLISTED = keccak256(toHex(allowlistRoleName)) as `0x${string}`;
	const factoryAddress = contractAddresses.cookieJarFactory[chainId];

	const jar = { address, abi: cookieJarAbi, chainId };
	const contracts: readonly (ContractFunctionParameters & {
		chainId?: number;
	})[] = [
		{ ...jar, functionName: "ACCESS_TYPE" },
		{ ...jar, functionName: "hasRole", args: [JAR_OWNER, user] },
		{ ...jar, functionName: "WITHDRAWAL_OPTION" },
		{ ...jar, functionName: "fixedAmount" },
		{ ...jar, functionName: "maxWithdrawal" },
		{ ...jar, functionName: "withdrawalInterval" },
		{ ...jar, functionName: "STRICT_PURPOSE" },
		{ ...jar, functionName: "EMERGENCY_WITHDRAWAL_ENABLED" },
		{ ...jar, functionName: "ONE_TIME_WITHDRAWAL" },
		{ ...jar, functionName: "feeCollector" },
		{ ...jar, functionName: "hasRole", args: [JAR_ALLOWLISTED, user] },
		{ ...jar, functionName: "lastWithdrawalTime", args: [user] },
		{ ...jar, functionName: "totalWithdrawn", args: [user] },
		{ ...jar, functionName: "withdrawnInCurrentPeriod", args: [user] },
		{ ...jar, functionName: "currencyHeldByJar" },
		{ ...jar, functionName: "CURRENCY" },
		{ ...jar, functionName: "nftRequirement" },
		{ ...jar, functionName: "FEE_PERCENTAGE_ON_DEPOSIT" },
		{ ...jar, functionName: "MIN_DEPOSIT" },
		{
			address: factoryAddress ?? ZERO_ADDRESS,
			abi: cookieJarFactoryAbi,
			chainId,
			functionName: "getJarInfo",
			args: [address],
		},
	];

	const { data, isLoading, isError, error, refetch } = useReadContracts({
		contracts: contracts as unknown as readonly ContractFunctionParameters[],
		allowFailure: true,
	});

	const config = parseJarConfigResults((data as ReadResult[]) ?? [], {
		address,
		chainId,
		jarOwnerRole: JAR_OWNER,
	});

	return {
		config,
		isLoading,
		hasError: isError,
		errors: error ? [error] : [],
		refetch,
	};
};
