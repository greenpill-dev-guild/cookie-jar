import { cookieJarAbi } from "@jar-core/generated";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	encodeAbiParameters,
	encodeEventTopics,
	encodeFunctionData,
	erc20Abi,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
	getBlockNumber: vi.fn(),
	getBlock: vi.fn(),
	getLogs: vi.fn(),
	getTransaction: vi.fn(),
	getTransactionReceipt: vi.fn(),
}));
const usePublicClient = vi.hoisted(() => vi.fn(() => client));
vi.mock("wagmi", () => ({ usePublicClient }));

import { useJarWithdrawalHistory } from "@jar-core/hooks/jar/useJarWithdrawalHistory";

const JAR = "0xfCA00fC7E287419F200840364fd9b7DC84E83e01";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const RECIPIENT = "0x1234567890123456789012345678901234567890";
const CLAIM_1 = `0x${"1".repeat(64)}` as const;
const CLAIM_2 = `0x${"2".repeat(64)}` as const;
const DEPOSIT = `0x${"3".repeat(64)}` as const;

afterEach(cleanup);

describe("useJarWithdrawalHistory", () => {
	it("starts at the jar creation timestamp and returns both claims without deposit fees", async () => {
		client.getBlockNumber.mockResolvedValue(100n);
		client.getBlock.mockImplementation(async ({ blockNumber }) => ({
			timestamp: blockNumber * 10n,
		}));
		client.getLogs.mockResolvedValue([
			{
				transactionHash: DEPOSIT,
				blockNumber: 95n,
				logIndex: 18,
				args: { value: 20_000n, to: RECIPIENT },
			},
			{
				transactionHash: CLAIM_1,
				blockNumber: 97n,
				args: { value: 1_000_000n, to: RECIPIENT },
			},
			{
				transactionHash: CLAIM_2,
				blockNumber: 98n,
				args: { value: 980_000n, to: RECIPIENT },
			},
		]);
		client.getTransaction.mockImplementation(async ({ hash }) => ({
			input:
				hash === DEPOSIT
					? "0xabcdef" // Safe batch calldata is not a direct jar call.
					: encodeFunctionData({
							abi: cookieJarAbi,
							functionName: "withdrawWithErc1155",
							args: [
								hash === CLAIM_1 ? 1_000_000n : 980_000n,
								hash === CLAIM_1 ? "First claim note" : "Second claim note",
							],
						}),
		}));
		client.getTransactionReceipt.mockResolvedValue({
			logs: [
				{
					address: USDC,
					logIndex: 18,
					topics: encodeEventTopics({
						abi: erc20Abi,
						eventName: "Transfer",
						args: { from: JAR, to: RECIPIENT },
					}),
					data: encodeAbiParameters([{ type: "uint256" }], [20_000n]),
				},
				{
					address: JAR,
					logIndex: 20,
					topics: encodeEventTopics({
						abi: cookieJarAbi,
						eventName: "FeeCollected",
						args: { feeCollector: RECIPIENT, token: USDC },
					}),
					data: encodeAbiParameters([{ type: "uint256" }], [20_000n]),
				},
			],
		});
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const params = {
			jarAddress: JAR,
			currency: USDC,
			chainId: 42161,
			createdAt: 900n,
		} as const;
		const { result } = renderHook(() => useJarWithdrawalHistory(params), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			),
		});
		await waitFor(() => expect(result.current.records).toHaveLength(2));
		expect(usePublicClient).toHaveBeenCalledWith({ chainId: 42161 });
		expect(client.getLogs).toHaveBeenCalledWith(
			expect.objectContaining({ fromBlock: 90n, toBlock: 100n })
		);
		expect(
			result.current.records.map(({ amount, purpose }) => ({ amount, purpose }))
		).toEqual([
			{ amount: 980_000n, purpose: "Second claim note" },
			{ amount: 1_000_000n, purpose: "First claim note" },
		]);
	});
});
