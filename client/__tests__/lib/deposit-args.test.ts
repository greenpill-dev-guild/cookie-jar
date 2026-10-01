import { ETH_ADDRESS } from "@jar-core/lib/blockchain/constants";
import {
	buildDepositCall,
	withdrawFunctionFor,
} from "@jar-core/lib/jar/deposit-args";
import { describe, expect, it } from "vitest";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

describe("buildDepositCall", () => {
	it("uses deposit(0) with value for native currency on V2", () => {
		expect(
			buildDepositCall({ isV2: true, currency: ETH_ADDRESS, amount: 5n })
		).toEqual({ functionName: "deposit", args: [0n], value: 5n });
	});

	it("uses deposit(amount) for tokens on V2", () => {
		expect(
			buildDepositCall({ isV2: true, currency: USDC, amount: 4_800_000_000n })
		).toEqual({ functionName: "deposit", args: [4_800_000_000n] });
	});

	it("keeps the V1 entry points", () => {
		expect(
			buildDepositCall({ isV2: false, currency: ETH_ADDRESS, amount: 1n })
		).toEqual({ functionName: "depositETH", args: [], value: 1n });
		expect(
			buildDepositCall({ isV2: false, currency: USDC, amount: 1n })
		).toEqual({
			functionName: "depositCurrency",
			args: [1n],
		});
	});
});

describe("withdrawFunctionFor", () => {
	it("maps every access type to its V2 entry point", () => {
		expect(withdrawFunctionFor("Allowlist", true)).toBe(
			"withdrawAllowlistMode"
		);
		expect(withdrawFunctionFor(0, true)).toBe("withdrawAllowlistMode");
		expect(withdrawFunctionFor("Hats", true)).toBe("withdrawWithErc1155");
		expect(withdrawFunctionFor(2, true)).toBe("withdrawWithErc1155");
		expect(withdrawFunctionFor("POAP", true)).toBe("withdrawWithErc721");
		expect(withdrawFunctionFor(1, true)).toBe("withdrawWithErc721");
		expect(withdrawFunctionFor(undefined, true)).toBe("withdrawAllowlistMode");
	});

	it("falls back to the V1 allowlist function", () => {
		expect(withdrawFunctionFor("Hats", false)).toBe("withdrawWhitelistMode");
	});
});
