import { describe, expect, it } from "vitest";
import {
	factoryFallbackApplies,
	pickFeaturedJar,
} from "@jar-core/lib/jar/pick-featured-jar";

const ENV_JAR = "0x1111111111111111111111111111111111111111" as const;
const SEEDED = [
	"0x2222222222222222222222222222222222222222",
	"0x3333333333333333333333333333333333333333",
] as const;

describe("factoryFallbackApplies", () => {
	it("is limited to the local Anvil chain", () => {
		expect(factoryFallbackApplies(31337)).toBe(true);
		expect(factoryFallbackApplies(42161)).toBe(false);
		expect(factoryFallbackApplies(8453)).toBe(false);
	});
});

describe("pickFeaturedJar", () => {
	it("uses the configured address on any chain", () => {
		for (const chainId of [31337, 42161]) {
			expect(
				pickFeaturedJar({
					envAddress: ENV_JAR,
					chainId,
					index: 0,
					jars: SEEDED,
				})
			).toEqual({ address: ENV_JAR, source: "env" });
		}
	});

	it("falls back to the seeded jar at the index on Anvil", () => {
		expect(pickFeaturedJar({ chainId: 31337, index: 1, jars: SEEDED })).toEqual(
			{ address: SEEDED[1], source: "factory" }
		);
	});

	it("shows nothing on a live chain without a configured address", () => {
		expect(pickFeaturedJar({ chainId: 42161, index: 0, jars: SEEDED })).toEqual(
			{ source: "none" }
		);
	});

	it("reports none when the index is out of range or the list is missing", () => {
		expect(pickFeaturedJar({ chainId: 31337, index: 5, jars: SEEDED })).toEqual(
			{ source: "none" }
		);
		expect(pickFeaturedJar({ chainId: 31337, index: 0 })).toEqual({
			source: "none",
		});
	});
});
