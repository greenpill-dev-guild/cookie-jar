export interface BlockRange {
	fromBlock: bigint;
	toBlock: bigint;
}

/**
 * Splits [fromBlock, toBlock] into inclusive ranges of at most `size` blocks.
 */
export function planChunks(
	fromBlock: bigint,
	toBlock: bigint,
	size: bigint
): BlockRange[] {
	if (size <= 0n) throw new Error("chunk size must be positive");
	const ranges: BlockRange[] = [];
	let cursor = fromBlock;
	while (cursor <= toBlock) {
		const end = cursor + size - 1n < toBlock ? cursor + size - 1n : toBlock;
		ranges.push({ fromBlock: cursor, toBlock: end });
		cursor = end + 1n;
	}
	return ranges;
}

const RANGE_ERROR =
	/block range|range too large|too many|exceed|limit|10k|10000/i;

/**
 * Public RPCs cap eth_getLogs ranges with vendor-specific errors; this recognises them.
 */
export function isRangeError(error: unknown): boolean {
	if (!error) return false;
	const message =
		error instanceof Error
			? `${error.message} ${(error as { details?: string }).details ?? ""}`
			: String(error);
	return RANGE_ERROR.test(message);
}

export interface ChunkedOptions {
	/** Blocks per request to start with. */
	initialSpan?: bigint;
	/** Smallest span before giving up on a range error. */
	minSpan?: bigint;
}

/**
 * Fetches logs over a large range by chunking, halving the span whenever the RPC rejects
 * the range. Any other error propagates.
 */
export async function getLogsChunked<T>(
	fetchRange: (fromBlock: bigint, toBlock: bigint) => Promise<T[]>,
	fromBlock: bigint,
	toBlock: bigint,
	options: ChunkedOptions = {}
): Promise<T[]> {
	const minSpan = options.minSpan ?? 500n;
	let span = options.initialSpan ?? 50_000n;
	const results: T[] = [];
	let cursor = fromBlock;

	while (cursor <= toBlock) {
		const end = cursor + span - 1n < toBlock ? cursor + span - 1n : toBlock;
		try {
			results.push(...(await fetchRange(cursor, end)));
			cursor = end + 1n;
		} catch (error) {
			if (!isRangeError(error) || span <= minSpan) throw error;
			span = span / 2n;
		}
	}
	return results;
}
