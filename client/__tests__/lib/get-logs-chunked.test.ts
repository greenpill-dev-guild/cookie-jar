import {
	getLogsChunked,
	isRangeError,
	planChunks,
} from "@jar-core/lib/blockchain/get-logs-chunked";
import { describe, expect, it, vi } from "vitest";

describe("planChunks", () => {
	it("splits an inclusive range into fixed-size chunks", () => {
		expect(planChunks(0n, 9n, 4n)).toEqual([
			{ fromBlock: 0n, toBlock: 3n },
			{ fromBlock: 4n, toBlock: 7n },
			{ fromBlock: 8n, toBlock: 9n },
		]);
		expect(planChunks(5n, 5n, 100n)).toEqual([{ fromBlock: 5n, toBlock: 5n }]);
		expect(planChunks(6n, 5n, 100n)).toEqual([]);
	});
});

describe("isRangeError", () => {
	it("recognises the usual RPC range complaints", () => {
		expect(
			isRangeError(new Error("query returned more than 10000 results"))
		).toBe(true);
		expect(isRangeError(new Error("block range is too large"))).toBe(true);
		expect(isRangeError(new Error("Log response size exceeded"))).toBe(true);
		expect(isRangeError(new Error("execution reverted"))).toBe(false);
		expect(isRangeError(undefined)).toBe(false);
	});
});

describe("getLogsChunked", () => {
	it("halves the span on range errors and keeps every log in order", async () => {
		const calls: Array<[bigint, bigint]> = [];
		const fetchRange = vi.fn(async (from: bigint, to: bigint) => {
			calls.push([from, to]);
			if (to - from + 1n > 4n) throw new Error("block range too large");
			const logs: string[] = [];
			for (let b = from; b <= to; b++) logs.push(`log-${b}`);
			return logs;
		});

		const logs = await getLogsChunked(fetchRange, 0n, 9n, {
			initialSpan: 16n,
			minSpan: 1n,
		});

		expect(logs).toEqual(Array.from({ length: 10 }, (_, i) => `log-${i}`));
		expect(calls[0]).toEqual([0n, 9n]); // rejected
		expect(calls[1]).toEqual([0n, 7n]); // rejected
		expect(calls[2]).toEqual([0n, 3n]); // accepted
	});

	it("propagates non-range errors", async () => {
		await expect(
			getLogsChunked(
				async () => {
					throw new Error("execution reverted");
				},
				0n,
				10n
			)
		).rejects.toThrow("execution reverted");
	});
});
