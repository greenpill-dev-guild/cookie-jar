import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "0x1234567890123456789012345678901234567890";
const HATS = "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137";
const JAR = "0xF2d6629DeAe335f98AbE540098b64aD55D5fb0Bf" as const;

const state = {
	address: USER as string | undefined,
	hasOwnerRole: false,
	erc1155Balance: 0n as bigint | undefined,
	erc721Balance: 0n as bigint | undefined,
};

vi.mock("wagmi", () => ({
	useAccount: () => ({ address: state.address, isConnected: !!state.address }),
	useChainId: () => 42161,
	useReadContract: (params: {
		functionName: string;
		abi: readonly unknown[];
	}) => {
		if (params.functionName === "hasRole") return { data: state.hasOwnerRole };
		// the ERC1155 ABI carries a batch balance function; the ERC721 one does not
		const isErc1155 = params.abi.some(
			(item) => (item as { name?: string }).name === "balanceOfBatch"
		);
		return { data: isErc1155 ? state.erc1155Balance : state.erc721Balance };
	},
}));

vi.mock("@/generated", () => ({ cookieJarAbi: [] }));

import { useJarPermissions } from "@jar-core/hooks/jar/useJarPermissions";

const hatsJar = {
	accessType: "Hats",
	accessTypeIndex: 2,
	allowlist: false,
	feeCollector: "0xe09315A86ED0A39862158f5631b928145987fE05",
	nftRequirement: {
		nftContract: HATS as `0x${string}`,
		tokenId: 1n,
		minBalance: 1n,
		isPoapEventGate: false,
	},
};

describe("useJarPermissions", () => {
	beforeEach(() => {
		state.address = USER;
		state.hasOwnerRole = false;
		state.erc1155Balance = 0n;
		state.erc721Balance = 0n;
	});

	it("marks a hat wearer as eligible", () => {
		state.erc1155Balance = 1n;
		const { result } = renderHook(() => useJarPermissions(JAR, hatsJar));
		expect(result.current.eligibility).toBe("wears-hat");
		expect(result.current.isEligible).toBe(true);
		expect(result.current.showNFTGatedFunctions).toBe(true);
		expect(result.current.isHatGated).toBe(true);
	});

	it("rejects a wallet without the hat", () => {
		const { result } = renderHook(() => useJarPermissions(JAR, hatsJar));
		expect(result.current.eligibility).toBe("not-eligible");
		expect(result.current.isEligible).toBe(false);
	});

	it("respects a higher minimum balance", () => {
		state.erc1155Balance = 1n;
		const { result } = renderHook(() =>
			useJarPermissions(JAR, {
				...hatsJar,
				nftRequirement: { ...hatsJar.nftRequirement, minBalance: 2n },
			})
		);
		expect(result.current.requiredBalance).toBe(2n);
		expect(result.current.isEligible).toBe(false);
	});

	it("handles allowlist jars and admins", () => {
		state.hasOwnerRole = true;
		const { result } = renderHook(() =>
			useJarPermissions(JAR, {
				accessType: "Allowlist",
				accessTypeIndex: 0,
				allowlist: true,
				feeCollector: USER,
			})
		);
		expect(result.current.eligibility).toBe("allowlisted");
		expect(result.current.showUserFunctions).toBe(true);
		expect(result.current.isAdmin).toBe(true);
		expect(result.current.isFeeCollector).toBe(true);
	});

	it("reports a disconnected wallet", () => {
		state.address = undefined;
		const { result } = renderHook(() => useJarPermissions(JAR, hatsJar));
		expect(result.current.eligibility).toBe("disconnected");
	});
});
