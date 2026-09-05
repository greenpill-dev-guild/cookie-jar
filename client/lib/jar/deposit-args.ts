import { ETH_ADDRESS } from "@/lib/blockchain/constants";

export type WithdrawFunctionName =
	| "withdrawAllowlistMode"
	| "withdrawWithErc721"
	| "withdrawWithErc1155"
	| "withdrawWhitelistMode";

/**
 * Picks the jar function for a claim. V2 jars expose one entry point per access type;
 * V1 jars only know the allowlist path.
 */
export function withdrawFunctionFor(
	accessType: string | number | undefined,
	isV2: boolean
): WithdrawFunctionName {
	if (!isV2) return "withdrawWhitelistMode";
	if (accessType === 2 || accessType === "ERC1155" || accessType === "Hats") {
		return "withdrawWithErc1155";
	}
	if (
		accessType === 1 ||
		accessType === "ERC721" ||
		accessType === "POAP" ||
		accessType === "NFT-Gated"
	) {
		return "withdrawWithErc721";
	}
	return "withdrawAllowlistMode";
}

export interface DepositCall {
	functionName: "deposit" | "depositETH" | "depositCurrency";
	args: readonly bigint[];
	value?: bigint;
}

/**
 * Builds the deposit call. V2 jars have a single deposit(amount) that takes ETH as msg.value
 * with amount 0; V1 jars keep depositETH() and depositCurrency(amount).
 */
export function buildDepositCall(params: {
	isV2: boolean;
	currency: string;
	amount: bigint;
}): DepositCall {
	const isNative = params.currency.toLowerCase() === ETH_ADDRESS.toLowerCase();
	if (params.isV2) {
		return isNative
			? { functionName: "deposit", args: [0n], value: params.amount }
			: { functionName: "deposit", args: [params.amount] };
	}
	return isNative
		? { functionName: "depositETH", args: [], value: params.amount }
		: { functionName: "depositCurrency", args: [params.amount] };
}
