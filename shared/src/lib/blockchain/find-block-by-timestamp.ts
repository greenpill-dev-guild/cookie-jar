/** Find the first block at or after a timestamp, including blocks sharing that second. */
export async function findFirstBlockAtTimestamp(
	getTimestamp: (blockNumber: bigint) => Promise<bigint>,
	timestamp: bigint,
	fromBlock: bigint,
	toBlock: bigint
): Promise<bigint> {
	let low = fromBlock;
	let high = toBlock + 1n;
	while (low < high) {
		const middle = low + (high - low) / 2n;
		if ((await getTimestamp(middle)) < timestamp) low = middle + 1n;
		else high = middle;
	}
	return low;
}
