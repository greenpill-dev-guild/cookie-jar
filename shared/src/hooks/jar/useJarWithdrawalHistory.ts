"use client";

import { cookieJarAbi } from "@jar-core/generated";
import { ETH_ADDRESS } from "@jar-core/lib/blockchain/constants";
import { findFirstBlockAtTimestamp } from "@jar-core/lib/blockchain/find-block-by-timestamp";
import { getLogsChunked } from "@jar-core/lib/blockchain/get-logs-chunked";
import { depositFeeLogIndexes } from "@jar-core/lib/jar/fee-transfer-logs";
import { useQuery } from "@tanstack/react-query";
import { decodeFunctionData, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";

export interface JarWithdrawalRecord {
	amount: bigint;
	purpose: string;
	recipient: `0x${string}`;
	txHash: `0x${string}`;
	blockNumber: bigint;
	kind: "claim" | "emergency";
}

export interface JarWithdrawalHistory {
	records: JarWithdrawalRecord[];
	/** ETH-currency jars leave no on-chain trail the client can read cheaply */
	isSupported: boolean;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

const TRANSFER_EVENT = parseAbiItem(
	"event Transfer(address indexed from, address indexed to, uint256 value)"
);
const CLAIM_FUNCTIONS = new Set([
	"withdraw",
	"withdrawAllowlistMode",
	"withdrawWithErc721",
	"withdrawWithErc1155",
]);
const MAX_RECORDS = 200;
const TX_BATCH = 10;

/**
 * Reconstructs withdrawals of an ERC20-currency jar from the token's Transfer logs
 * (from = jar) and the calldata of each transaction. The jar contract itself emits no
 * withdrawal event, so this is the only client-side record available.
 */
export function useJarWithdrawalHistory(params: {
	jarAddress?: `0x${string}`;
	currency?: `0x${string}`;
	chainId: number;
	fromBlock?: bigint;
	/** Factory-recorded creation timestamp, used to avoid scanning the chain from genesis. */
	createdAt?: bigint;
	enabled?: boolean;
}): JarWithdrawalHistory {
	const {
		jarAddress,
		currency,
		chainId,
		fromBlock,
		createdAt,
		enabled = true,
	} = params;
	const client = usePublicClient({ chainId });
	const isErc20 =
		!!currency && currency.toLowerCase() !== ETH_ADDRESS.toLowerCase();
	const canQuery = enabled && !!client && !!jarAddress && isErc20;

	const query = useQuery({
		queryKey: [
			"jar-withdrawals",
			chainId,
			jarAddress,
			currency,
			fromBlock?.toString() ?? "0",
			createdAt?.toString(),
		],
		enabled: canQuery,
		staleTime: 30_000,
		queryFn: async (): Promise<JarWithdrawalRecord[]> => {
			if (!client || !jarAddress || !currency) return [];
			const latest = await client.getBlockNumber();
			const start =
				createdAt && createdAt > 0n
					? await findFirstBlockAtTimestamp(
							async (blockNumber) =>
								(await client.getBlock({ blockNumber })).timestamp,
							createdAt,
							fromBlock ?? 0n,
							latest
						)
					: (fromBlock ?? 0n);
			const logs = await getLogsChunked(
				(from, to) =>
					client.getLogs({
						address: currency,
						event: TRANSFER_EVENT,
						args: { from: jarAddress },
						fromBlock: from,
						toBlock: to,
					}),
				start,
				latest
			);
			const recent = logs.slice(-MAX_RECORDS);
			const records: JarWithdrawalRecord[] = [];
			for (let i = 0; i < recent.length; i += TX_BATCH) {
				const batch = recent.slice(i, i + TX_BATCH);
				const decoded = await Promise.all(
					batch.map(async (log) => {
						const tx = await client.getTransaction({
							hash: log.transactionHash,
						});
						let functionName = "";
						let purpose = "";
						try {
							const call = decodeFunctionData({
								abi: cookieJarAbi,
								data: tx.input,
							});
							functionName = call.functionName;
							if (CLAIM_FUNCTIONS.has(functionName)) {
								purpose = String(call.args?.[1] ?? "");
							}
						} catch {
							// not a direct jar call (for example a multi-sig batch); keep the transfer
						}
						if (functionName === "") {
							const receipt = await client.getTransactionReceipt({
								hash: log.transactionHash,
							});
							if (
								depositFeeLogIndexes(receipt.logs, jarAddress).has(log.logIndex)
							)
								return null;
						}
						const kind: JarWithdrawalRecord["kind"] | null =
							functionName === "emergencyWithdraw"
								? "emergency"
								: CLAIM_FUNCTIONS.has(functionName) || functionName === ""
									? "claim"
									: null;
						if (!kind) return null; // deposit fee transfers and other internal moves
						return {
							amount: log.args.value ?? 0n,
							purpose,
							recipient: (log.args.to ?? jarAddress) as `0x${string}`,
							txHash: log.transactionHash,
							blockNumber: log.blockNumber,
							kind,
						};
					})
				);
				for (const record of decoded) if (record) records.push(record);
			}
			return records.reverse();
		},
	});

	return {
		records: query.data ?? [],
		isSupported: isErc20,
		isLoading: canQuery && query.isLoading,
		error: (query.error as Error | null) ?? null,
		refetch: () => {
			void query.refetch();
		},
	};
}
