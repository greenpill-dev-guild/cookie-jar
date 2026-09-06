import { describe, expect, it } from "vitest";
import {
	HATS_PROTOCOL_ADDRESS,
	POAP_TOKEN_ADDRESS,
} from "@jar-core/lib/blockchain/constants";
import {
	ACCESS_TYPES,
	getAccessTypeLabel,
	getAccessTypeName,
	isAllowlistAccess,
	isErc1155Access,
	isNFTAccess,
	isProtocolAccess,
} from "@jar-core/lib/jar/access-types";

describe("access types", () => {
	it("mirrors the contract enum", () => {
		expect(ACCESS_TYPES.ALLOWLIST).toBe(0);
		expect(ACCESS_TYPES.ERC721).toBe(1);
		expect(ACCESS_TYPES.ERC1155).toBe(2);
		expect(getAccessTypeName(0)).toBe("Allowlist");
		expect(getAccessTypeName(1)).toBe("ERC721");
		expect(getAccessTypeName(2)).toBe("ERC1155");
		expect(getAccessTypeName(7)).toBe("Unknown");
	});

	it("labels well-known gate contracts", () => {
		expect(getAccessTypeLabel(2, HATS_PROTOCOL_ADDRESS)).toBe("Hats");
		expect(getAccessTypeLabel(2, HATS_PROTOCOL_ADDRESS.toLowerCase())).toBe(
			"Hats"
		);
		expect(
			getAccessTypeLabel(2, "0x0000000000000000000000000000000000000001")
		).toBe("ERC1155");
		expect(getAccessTypeLabel(1, POAP_TOKEN_ADDRESS)).toBe("POAP");
		expect(getAccessTypeLabel(1)).toBe("ERC721");
		expect(getAccessTypeLabel(0)).toBe("Allowlist");
		expect(getAccessTypeLabel(undefined)).toBe("Unknown");
	});

	it("classifies gates", () => {
		expect(isAllowlistAccess(0)).toBe(true);
		expect(isAllowlistAccess("Allowlist")).toBe(true);
		expect(isNFTAccess(1)).toBe(true);
		expect(isNFTAccess(2)).toBe(true);
		expect(isNFTAccess("Hats")).toBe(true);
		expect(isNFTAccess(0)).toBe(false);
		expect(isErc1155Access("Hats")).toBe(true);
		expect(isErc1155Access(1)).toBe(false);
		expect(isProtocolAccess(2)).toBe(false);
		expect(isProtocolAccess(ACCESS_TYPES.UNLOCK)).toBe(true);
	});
});
