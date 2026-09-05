/**
 * Access type helpers. The contract enum (CookieJarLib.AccessType) has exactly three
 * members; protocol gates such as Hats or POAP are ERC1155/ERC721 gates on a known contract.
 */
import {
	HATS_PROTOCOL_ADDRESS,
	POAP_TOKEN_ADDRESS,
} from "@/lib/blockchain/constants";

// Contract enum values
export const ACCESS_TYPES = {
	ALLOWLIST: 0,
	ERC721: 1,
	ERC1155: 2,
	/** @deprecated legacy UI-only values; never returned by the contract */
	NFT_GATED: 1,
	POAP: 101,
	UNLOCK: 102,
	HYPERCERT: 103,
	HATS: 104,
} as const;

export type AccessTypeValue = (typeof ACCESS_TYPES)[keyof typeof ACCESS_TYPES];

// Names indexed by contract enum value
export const ACCESS_TYPE_NAMES = ["Allowlist", "ERC721", "ERC1155"] as const;

const NFT_TYPE_NAMES = new Set([
	"ERC721",
	"ERC1155",
	"NFT-Gated",
	"Hats",
	"POAP",
]);

function sameAddress(a?: string, b?: string): boolean {
	return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/**
 * Display name for an access type as stored on-chain.
 */
export function getAccessTypeName(accessType: number): string {
	return ACCESS_TYPE_NAMES[accessType] || "Unknown";
}

/**
 * Display label that recognises well-known gate contracts (Hats, POAP).
 */
export function getAccessTypeLabel(
	accessType: number | undefined,
	nftContract?: string
): string {
	if (accessType === undefined) return "Unknown";
	if (accessType === ACCESS_TYPES.ERC1155) {
		return sameAddress(nftContract, HATS_PROTOCOL_ADDRESS) ? "Hats" : "ERC1155";
	}
	if (accessType === ACCESS_TYPES.ERC721) {
		return sameAddress(nftContract, POAP_TOKEN_ADDRESS) ? "POAP" : "ERC721";
	}
	return getAccessTypeName(accessType);
}

export function isAllowlistAccess(accessType: number | string): boolean {
	if (typeof accessType === "string") return accessType === "Allowlist";
	return accessType === ACCESS_TYPES.ALLOWLIST;
}

/**
 * True for any gate that checks token ownership (ERC721 or ERC1155, including Hats and POAP).
 */
export function isNFTAccess(accessType: number | string): boolean {
	if (typeof accessType === "string") return NFT_TYPE_NAMES.has(accessType);
	return (
		accessType === ACCESS_TYPES.ERC721 || accessType === ACCESS_TYPES.ERC1155
	);
}

export function isErc1155Access(accessType: number | string): boolean {
	if (typeof accessType === "string")
		return accessType === "ERC1155" || accessType === "Hats";
	return accessType === ACCESS_TYPES.ERC1155;
}

/**
 * Legacy protocol values only ever appear in old UI state; the contract never returns them.
 */
export function isProtocolAccess(accessType: number | string): boolean {
	if (typeof accessType === "string") {
		return ["Unlock", "Hypercert"].includes(accessType);
	}
	return accessType >= ACCESS_TYPES.POAP && accessType <= ACCESS_TYPES.HATS;
}
