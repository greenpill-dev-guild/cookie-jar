import { parseUnits } from "viem";
import type { JarCreationFormData } from "@/hooks/jar/schemas/jarCreationSchema";
import { ETH_ADDRESS, HATS_PROTOCOL_ADDRESS } from "@/lib/blockchain/constants";

/** Decimal text is checked before parseUnits, which otherwise rounds excess precision. */
export function parseTokenAmount(
	value: string,
	decimals: number | undefined
): bigint {
	if (
		decimals === undefined ||
		!Number.isInteger(decimals) ||
		decimals < 0 ||
		decimals > 255
	) {
		throw new Error("Wait for the token decimals to load.");
	}
	const text = value.trim();
	if (!/^(?:\d+\.?\d*|\.\d+)$/.test(text))
		throw new Error("Enter a valid decimal amount.");
	if ((text.split(".")[1]?.length ?? 0) > decimals)
		throw new Error(`Use at most ${decimals} decimal places.`);
	const amount = parseUnits(text, decimals);
	if (amount > 2n ** 256n - 1n) throw new Error("Amount is too large.");
	return amount;
}

export function daysToSeconds(value: string): bigint {
	if (!/^\d+$/.test(value) || BigInt(value) < 1n)
		throw new Error("Enter a whole number of days greater than zero.");
	const seconds = BigInt(value) * 86400n;
	if (seconds > 2n ** 256n - 1n) throw new Error("Interval is too large.");
	return seconds;
}

export const DEFAULT_CREATION_VALUES: JarCreationFormData = {
	chainId: 42161,
	jarName: "",
	jarOwnerAddress: "",
	supportedCurrency: ETH_ADDRESS,
	metadata: "",
	imageUrl: "",
	externalLink: "",
	showCustomCurrency: false,
	customCurrencyAddress: "",
	withdrawalOption: 0,
	fixedAmount: "0",
	maxWithdrawal: "0",
	withdrawalInterval: "28",
	strictPurpose: true,
	emergencyWithdrawalEnabled: true,
	oneTimeWithdrawal: false,
	accessType: 0,
	nftAddresses: [],
	nftTypes: [],
	protocolConfig: { accessType: "Allowlist" },
	minDeposit: "0",
	enableCustomFee: false,
	customFee: "",
	streamingEnabled: false,
	requireStreamApproval: true,
	maxStreamRate: "1.0",
	minStreamDuration: "1",
	autoSwapEnabled: false,
};

// Launch-window values from docs/DEPLOYMENT.md. Applying this preset is an explicit user action.
export const STIPEND_PRESET: JarCreationFormData = {
	...DEFAULT_CREATION_VALUES,
	jarName: "Green Goods Stipend Jar",
	jarOwnerAddress: "0xe09315A86ED0A39862158f5631b928145987fE05",
	supportedCurrency: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
	metadata:
		"Monthly stipend for Green Goods contributors, backed by Linear-tracked accepted work. Include a Linear link in your note.",
	imageUrl: "https://cookies.greengoods.app/opengraph-image",
	externalLink:
		"https://github.com/greenpill-dev-guild/.github/blob/main/routines/scoped-work-compensation.md",
	showCustomCurrency: true,
	customCurrencyAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
	withdrawalOption: 1,
	maxWithdrawal: "800",
	minDeposit: "1",
	enableCustomFee: true,
	customFee: "0",
	accessType: 5,
	protocolConfig: {
		accessType: "Hats",
		method: "Hats",
		hatsAddress: HATS_PROTOCOL_ADDRESS,
		hatsId:
			"0x0000005c00010000000000000000000000000000000000000000000000000000",
	},
};
