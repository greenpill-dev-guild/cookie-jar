import type { cookieJarFactoryAbi } from "@/generated";
import { isAddress, type ContractFunctionArgs } from "viem";
import {
	HATS_PROTOCOL_ADDRESS,
	POAP_TOKEN_ADDRESS,
	ZERO_ADDRESS,
} from "@/lib/blockchain/constants";
import { AccessType, NFTType, type JarCreationFormData } from "./schemas/jarCreationSchema";

export const FACTORY_DEFAULT_FEE_SENTINEL = (2n ** 256n) - 1n;

export enum ContractAccessType {
	Allowlist = 0,
	ERC721 = 1,
	ERC1155 = 2,
}

export type FactoryCreateCookieJarArgs = ContractFunctionArgs<
	typeof cookieJarFactoryAbi,
	"nonpayable",
	"createCookieJar"
>;
export type JarConfigArg = FactoryCreateCookieJarArgs[0];
export type AccessConfigArg = FactoryCreateCookieJarArgs[1];
export type MultiTokenConfigArg = FactoryCreateCookieJarArgs[2];

function toAddressOrZero(value: unknown): `0x${string}` {
	return typeof value === "string" && isAddress(value)
		? (value as `0x${string}`)
		: (ZERO_ADDRESS as `0x${string}`);
}

function toBigIntOr(defaultValue: bigint, value: unknown): bigint {
	if (typeof value === "bigint") return value;
	if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
	if (typeof value === "string" && value.trim().length > 0) {
		try {
			return BigInt(value);
		} catch {
			return defaultValue;
		}
	}
	return defaultValue;
}

function protocolValue(
	protocolConfig: JarCreationFormData["protocolConfig"],
	keys: string[],
): unknown {
	const raw = protocolConfig as unknown as Record<string, unknown>;
	for (const key of keys) {
		if (raw[key] !== undefined && raw[key] !== null && raw[key] !== "") {
			return raw[key];
		}
	}
	return undefined;
}

export function getFeePercentageOnDeposit(values: JarCreationFormData): bigint {
	if (!values.enableCustomFee) {
		return FACTORY_DEFAULT_FEE_SENTINEL;
	}
	const customFeePercent = values.customFee?.trim();
	if (!customFeePercent) {
		return FACTORY_DEFAULT_FEE_SENTINEL;
	}
	const feeBps = Math.round(Number.parseFloat(customFeePercent) * 100);
	return BigInt(Number.isFinite(feeBps) ? Math.max(0, feeBps) : 0);
}

function resolveAccessConfig(values: JarCreationFormData): {
	accessType: ContractAccessType;
	nftRequirement: AccessConfigArg["nftRequirement"];
} {
	const protocolConfig = values.protocolConfig;

	if (values.accessType === AccessType.Allowlist) {
		return {
			accessType: ContractAccessType.Allowlist,
			nftRequirement: {
				nftContract: ZERO_ADDRESS as `0x${string}`,
				tokenId: 0n,
				minBalance: 0n,
			},
		};
	}

	if (values.accessType === AccessType.NFTGated) {
		const nftAddress = toAddressOrZero(values.nftAddresses[0]);
		const nftType = values.nftTypes[0];
		return {
			accessType:
				nftType === NFTType.ERC1155
					? ContractAccessType.ERC1155
					: ContractAccessType.ERC721,
			nftRequirement: {
				nftContract: nftAddress,
				tokenId: 0n,
				minBalance: nftType === NFTType.ERC1155 ? 1n : 0n,
			},
		};
	}

	if (values.accessType === AccessType.POAP) {
		const eventId = toBigIntOr(
			0n,
			protocolValue(protocolConfig, ["poapEventId", "eventId"]),
		);
		return {
			accessType: ContractAccessType.ERC721,
			nftRequirement: {
				nftContract: toAddressOrZero(
					protocolValue(protocolConfig, ["poapContractAddress"]),
				),
				// Encode POAP event-level gate in existing struct fields.
				// tokenId carries POAP event id, minBalance>0 marks event-mode enforcement.
				tokenId: eventId,
				minBalance: 1n,
			},
		};
	}

	if (values.accessType === AccessType.Unlock) {
		return {
			accessType: ContractAccessType.ERC721,
			nftRequirement: {
				nftContract: toAddressOrZero(
					protocolValue(protocolConfig, ["unlockAddress"]),
				),
				tokenId: 0n,
				minBalance: 0n,
			},
		};
	}

	if (values.accessType === AccessType.Hypercert) {
		return {
			accessType: ContractAccessType.ERC1155,
			nftRequirement: {
				nftContract: toAddressOrZero(
					protocolValue(protocolConfig, [
						"hypercertAddress",
						"hypercertContract",
					]),
				),
				tokenId: toBigIntOr(
					0n,
					protocolValue(protocolConfig, [
						"hypercertTokenId",
						"hypercertId",
						"tokenId",
					]),
				),
				minBalance: toBigIntOr(
					1n,
					protocolValue(protocolConfig, ["hypercertMinBalance"]),
				),
			},
		};
	}

	// Hats maps to ERC-1155: tokenId == hatId, minBalance == 1.
	return {
		accessType: ContractAccessType.ERC1155,
		nftRequirement: {
			nftContract: toAddressOrZero(
				protocolValue(protocolConfig, ["hatsAddress", "hatsContract"]),
			),
			tokenId: toBigIntOr(0n, protocolValue(protocolConfig, ["hatsId", "hatId"])),
			minBalance: 1n,
		},
	};
}

export function getAccessConfigValidationError(
	values: JarCreationFormData,
): string | null {
	const protocolConfig = values.protocolConfig;

	if (values.accessType === AccessType.NFTGated) {
		if (!values.nftAddresses.length) {
			return "At least one NFT address is required for NFT-gated access";
		}
		if (!isAddress(values.nftAddresses[0])) {
			return "NFT address must be a valid Ethereum address";
		}
		return null;
	}

	if (values.accessType === AccessType.POAP) {
		const eventId = toBigIntOr(
			0n,
			protocolValue(protocolConfig, ["poapEventId", "eventId"]),
		);
		if (eventId <= 0n) {
			return "POAP event is required";
		}
		const poapContractAddress = protocolValue(protocolConfig, [
			"poapContractAddress",
		]);
		if (poapContractAddress !== undefined && !isAddress(String(poapContractAddress))) {
			return "POAP contract address must be a valid Ethereum address";
		}
		return null;
	}

	if (values.accessType === AccessType.Unlock) {
		const unlockAddress = protocolValue(protocolConfig, ["unlockAddress"]);
		if (!unlockAddress || !isAddress(String(unlockAddress))) {
			return "Unlock contract address is required";
		}
		return null;
	}

	if (values.accessType === AccessType.Hypercert) {
		const hypercertAddress = protocolValue(protocolConfig, [
			"hypercertAddress",
			"hypercertContract",
		]);
		if (!hypercertAddress || !isAddress(String(hypercertAddress))) {
			return "Hypercert contract address is required";
		}
		const hypercertTokenId = toBigIntOr(
			0n,
			protocolValue(protocolConfig, ["hypercertTokenId", "hypercertId", "tokenId"]),
		);
		if (hypercertTokenId <= 0n) {
			return "Hypercert token ID is required";
		}
		return null;
	}

	if (values.accessType === AccessType.Hats) {
		const hatsId = toBigIntOr(0n, protocolValue(protocolConfig, ["hatsId", "hatId"]));
		if (hatsId <= 0n) {
			return "Hat ID is required";
		}
		return null;
	}

	return null;
}

export function buildV2CreateCookieJarArgs(input: {
	values: JarCreationFormData;
	metadata: string;
	parseAmount: (amount: string) => bigint;
}): FactoryCreateCookieJarArgs {
	const { values, metadata, parseAmount } = input;

	const { accessType, nftRequirement } = resolveAccessConfig(values);
	const feePercentageOnDeposit = getFeePercentageOnDeposit(values);
	const protocolConfig = values.protocolConfig;

	const multiTokenConfig: MultiTokenConfigArg = {
		enabled: values.autoSwapEnabled,
		maxSlippagePercent: 500n,
		minSwapAmount: 0n,
		defaultFee: 3000,
	};

	const poapContractCandidate = protocolValue(protocolConfig, [
		"poapContractAddress",
	]);
	const poapContractAddress = poapContractCandidate
		? toAddressOrZero(poapContractCandidate)
		: (POAP_TOKEN_ADDRESS as `0x${string}`);

	const hatsContractCandidate = protocolValue(protocolConfig, [
		"hatsAddress",
		"hatsContract",
	]);
	const hatsContractAddress = hatsContractCandidate
		? toAddressOrZero(hatsContractCandidate)
		: (HATS_PROTOCOL_ADDRESS as `0x${string}`);

	const normalizedNftRequirement = { ...nftRequirement };
	if (values.accessType === AccessType.POAP) {
		normalizedNftRequirement.nftContract = poapContractAddress;
	}
	if (values.accessType === AccessType.Hats && normalizedNftRequirement.nftContract === ZERO_ADDRESS) {
		normalizedNftRequirement.nftContract = hatsContractAddress;
	}

	const jarConfig: JarConfigArg = {
		jarOwner: values.jarOwnerAddress as `0x${string}`,
		supportedCurrency: values.supportedCurrency as `0x${string}`,
		feeCollector: ZERO_ADDRESS as `0x${string}`,
		accessType,
		withdrawalOption: values.withdrawalOption,
		strictPurpose: values.strictPurpose,
		emergencyWithdrawalEnabled: values.emergencyWithdrawalEnabled,
		oneTimeWithdrawal: values.oneTimeWithdrawal,
		fixedAmount: parseAmount(values.fixedAmount),
		maxWithdrawal: parseAmount(values.maxWithdrawal),
		withdrawalInterval: BigInt(values.withdrawalInterval || "0"),
		minDeposit: 0n,
		feePercentageOnDeposit,
		maxWithdrawalPerPeriod: 0n,
		metadata,
		multiTokenConfig,
	};

	const accessConfig: AccessConfigArg = {
		allowlist: [] as readonly `0x${string}`[],
		nftRequirement: normalizedNftRequirement,
	};

	const args: FactoryCreateCookieJarArgs = [
		jarConfig,
		accessConfig,
		multiTokenConfig,
	];
	return args;
}
