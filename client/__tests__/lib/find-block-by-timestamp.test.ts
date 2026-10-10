import { findFirstBlockAtTimestamp } from "@jar-core/lib/blockchain/find-block-by-timestamp";
import { describe, expect, it, vi } from "vitest";

describe("findFirstBlockAtTimestamp", () => {
	it("includes every block sharing the creation timestamp", async () => {
		const times = [10n, 20n, 20n, 20n, 30n];
		expect(
			await findFirstBlockAtTimestamp(
				async (block) => times[Number(block)],
				20n,
				0n,
				4n
			)
		).toBe(1n);
	});

	it("finds a recent jar with logarithmic reads instead of scanning all blocks", async () => {
		const getTimestamp = vi.fn(async (block: bigint) => block * 10n);
		expect(
			await findFirstBlockAtTimestamp(
				getTimestamp,
				5_000_000_000n,
				0n,
				513_000_000n
			)
		).toBe(500_000_000n);
		expect(getTimestamp.mock.calls.length).toBeLessThanOrEqual(30);
	});

	it("respects a supplied lower bound and returns an empty range for a future timestamp", async () => {
		const getTimestamp = async (block: bigint) => block * 10n;
		expect(await findFirstBlockAtTimestamp(getTimestamp, 10n, 5n, 10n)).toBe(
			5n
		);
		expect(await findFirstBlockAtTimestamp(getTimestamp, 110n, 5n, 10n)).toBe(
			11n
		);
	});

	it("surfaces RPC failures rather than claiming that history is empty", async () => {
		await expect(
			findFirstBlockAtTimestamp(
				async () => {
					throw new Error("RPC unavailable");
				},
				20n,
				0n,
				4n
			)
		).rejects.toThrow("RPC unavailable");
	});
});
