import { cookieJarAbi } from "@jar-core/generated";
import { type Address, decodeEventLog, erc20Abi, type Log } from "viem";

type ReceiptLog = Pick<Log, "address" | "data" | "topics" | "logIndex">;

/** Match each jar fee event to its preceding token transfer, including Safe batches. */
export function depositFeeLogIndexes(
	logs: readonly ReceiptLog[],
	jarAddress: Address
): Set<number> {
	const jar = jarAddress.toLowerCase();
	const indexes = new Set<number>();
	for (let i = 0; i < logs.length; i++) {
		const event = logs[i];
		if (event.address.toLowerCase() !== jar) continue;
		let feeEvent;
		try {
			feeEvent = decodeEventLog({
				abi: cookieJarAbi,
				data: event.data,
				topics: event.topics,
			});
		} catch {
			continue; // Other jar events do not identify fee transfers.
		}
		if (feeEvent.eventName !== "FeeCollected") continue;
		const fee = feeEvent.args;
		for (let j = i - 1; j >= 0; j--) {
			const transfer = logs[j];
			if (
				transfer.logIndex === null ||
				indexes.has(transfer.logIndex) ||
				transfer.address.toLowerCase() !== fee.token.toLowerCase()
			)
				continue;
			let transferEvent;
			try {
				transferEvent = decodeEventLog({
					abi: erc20Abi,
					data: transfer.data,
					topics: transfer.topics,
				});
			} catch {
				continue;
			}
			if (transferEvent.eventName !== "Transfer") continue;
			const args = transferEvent.args;
			if (
				args.from.toLowerCase() === jar &&
				args.to.toLowerCase() === fee.feeCollector.toLowerCase() &&
				args.value === fee.amount
			) {
				indexes.add(transfer.logIndex);
				break;
			}
		}
	}
	return indexes;
}
