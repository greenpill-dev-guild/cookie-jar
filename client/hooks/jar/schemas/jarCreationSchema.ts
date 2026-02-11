import { isAddress } from "viem";
import { z } from "zod";

/**
 * Access control types supported by Cookie Jars.
 * Values must match the smart contract's AccessType enum.
 */
export enum AccessType {
	Allowlist = 0,
	NFTGated = 1,
	POAP = 2,
	Unlock = 3,
	Hypercert = 4,
	Hats = 5,
}

/** Withdrawal amount options for Cookie Jars */
export enum WithdrawalTypeOptions {
	Fixed = 0,
	Variable = 1,
}

/** NFT token standards supported */
export enum NFTType {
	None = 0,
	ERC721 = 1,
	ERC1155 = 2,
}

/** Protocol-specific configuration for access control */
export const protocolConfigSchema = z.object({
	accessType: z.enum([
		"Allowlist",
		"NFT",
		"POAP",
		"Unlock",
		"Hypercert",
		"Hats",
	]),
	nftAddresses: z.array(z.string()).optional(),
	nftTypes: z.array(z.number()).optional(),
	poapEventId: z.number().optional(),
	poapContractAddress: z.string().optional(),
	unlockAddress: z.string().optional(),
	hypercertAddress: z.string().optional(),
	hypercertMinBalance: z.number().optional(),
	hypercertMaxBalance: z.number().optional(),
	hatsId: z.number().optional(),
	hatsAddress: z.string().optional(),
});

export type ProtocolConfig = z.infer<typeof protocolConfigSchema>;

/**
 * Maps ProtocolSelector's string method names to the contract's AccessType enum.
 * Used by StepContent to bridge the ProtocolSelector's output format
 * with the form schema's numeric enum values.
 */
export const METHOD_TO_ACCESS_TYPE: Record<string, AccessType> = {
	Allowlist: AccessType.Allowlist,
	NFT: AccessType.NFTGated,
	POAP: AccessType.POAP,
	Unlock: AccessType.Unlock,
	Hypercert: AccessType.Hypercert,
	Hats: AccessType.Hats,
};

/**
 * Complete jar creation form schema.
 *
 * Uses Zod for TypeScript type inference and per-field validation.
 * Cross-field conditional validation (e.g. fixedAmount required only when
 * withdrawalOption is Fixed) is handled by imperative validateStep functions
 * in useJarCreation, because Zod's superRefine doesn't compose well with
 * RHF's per-step trigger() in multi-step forms.
 */
export const jarCreationSchema = z.object({
	// ── Step 1: Basic Config ──
	jarName: z.string().min(1, "Jar name is required"),
	jarOwnerAddress: z.string().refine(
		(val) =>
			!val ||
			val === "0x0000000000000000000000000000000000000000" ||
			isAddress(val),
		"Must be a valid Ethereum address",
	),
	supportedCurrency: z.string(),
	metadata: z.string(),
	imageUrl: z.string(),
	externalLink: z.string(),
	showCustomCurrency: z.boolean(),
	customCurrencyAddress: z.string(),

	// ── Step 2: Withdrawal Settings ──
	withdrawalOption: z.nativeEnum(WithdrawalTypeOptions),
	fixedAmount: z.string(),
	maxWithdrawal: z.string(),
	withdrawalInterval: z.string(),
	strictPurpose: z.boolean(),
	emergencyWithdrawalEnabled: z.boolean(),
	oneTimeWithdrawal: z.boolean(),

	// ── Step 3: Access Control ──
	accessType: z.nativeEnum(AccessType),
	nftAddresses: z.array(z.string()),
	nftTypes: z.array(z.number()),
	protocolConfig: protocolConfigSchema,

	// ── Step 4: Advanced Settings ──
	enableCustomFee: z.boolean(),
	customFee: z.string(),
	streamingEnabled: z.boolean(),
	requireStreamApproval: z.boolean(),
	maxStreamRate: z.string(),
	minStreamDuration: z.string(),
	autoSwapEnabled: z.boolean(),
});

export type JarCreationFormData = z.infer<typeof jarCreationSchema>;

/** Field groups for per-step trigger() validation */
export const STEP_FIELDS: Record<number, (keyof JarCreationFormData)[]> = {
	1: [
		"jarName",
		"jarOwnerAddress",
		"supportedCurrency",
		"showCustomCurrency",
		"customCurrencyAddress",
	],
	2: [
		"withdrawalOption",
		"fixedAmount",
		"maxWithdrawal",
		"withdrawalInterval",
	],
	3: ["accessType", "nftAddresses", "nftTypes"],
	4: ["enableCustomFee", "customFee"],
};
