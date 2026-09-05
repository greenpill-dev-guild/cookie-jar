import { describe, expect, it } from "vitest";
import { buildV2CreateCookieJarArgs } from "@/hooks/jar/createV2CreateArgs";
import {
	daysToSeconds,
	parseTokenAmount,
	STIPEND_PRESET,
} from "@/lib/jar/creation-values";

describe("reviewed creation values", () => {
	it("encodes the documented USDC stipend without factory defaults", () => {
		const [config, access] = buildV2CreateCookieJarArgs({
			values: STIPEND_PRESET,
			metadata: "stipend",
			parseAmount: (amount) => parseTokenAmount(amount, 6),
		});
		expect(config.maxWithdrawal).toBe(800000000n);
		expect(config.minDeposit).toBe(1000000n);
		expect(config.withdrawalInterval).toBe(2419200n);
		expect(config.feePercentageOnDeposit).toBe(0n);
		expect(config.jarOwner).toBe("0xe09315A86ED0A39862158f5631b928145987fE05");
		expect(access.nftRequirement).toEqual({
			nftContract: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
			tokenId: BigInt(
				"0x0000005c00010000000000000000000000000000000000000000000000000000"
			),
			minBalance: 1n,
			isPoapEventGate: false,
		});
	});
	it.each(["abc", "-1", "1e3", "1.0000001", "", "Infinity"])(
		"rejects invalid six-decimal amount %s",
		(value) => {
			expect(() => parseTokenAmount(value, 6)).toThrow();
		}
	);
	it("preserves exact decimal amounts and rejects missing metadata", () => {
		expect(parseTokenAmount("0.1", 18)).toBe(100000000000000000n);
		expect(parseTokenAmount("0", 6)).toBe(0n);
		expect(() => parseTokenAmount("800", undefined)).toThrow();
		expect(() => parseTokenAmount("1", 0)).not.toThrow();
	});
	it.each(["1.5", "-1", "0", "28 days", ""])(
		"rejects invalid interval %s",
		(value) => {
			expect(() => daysToSeconds(value)).toThrow();
		}
	);
});
