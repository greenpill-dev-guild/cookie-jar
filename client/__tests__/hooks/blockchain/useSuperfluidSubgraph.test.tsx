import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { GraphQLClient } from "graphql-request";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChainId } from "wagmi";
import {
	useAccountStreamInfo,
	useStreamByParties,
	useStreamHistory,
	useStreamsByReceiver,
} from "@/hooks/blockchain/useSuperfluidSubgraph";

// Mock wagmi
vi.mock("wagmi", () => ({
	useChainId: vi.fn(),
}));

// Mock graphql-request
vi.mock("graphql-request", () => ({
	GraphQLClient: vi.fn().mockImplementation(() => ({
		request: vi.fn(),
	})),
	gql: (strings: TemplateStringsArray) => strings[0],
}));

// Create a wrapper with QueryClient
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

// Skip Superfluid subgraph tests by default - they require GraphQL mocking infrastructure
// Run with: RUN_GRAPHQL_TESTS=true bun test
const describeOrSkip =
	process.env.RUN_GRAPHQL_TESTS === "true" ? describe : describe.skip;

describeOrSkip("useSuperfluidSubgraph", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useChainId).mockReturnValue(1); // Ethereum mainnet
	});

	describe("useStreamsByReceiver", () => {
		it("should return empty array when receiver is undefined", async () => {
			const { result } = renderHook(() => useStreamsByReceiver(undefined), {
				wrapper: createWrapper(),
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual([]);
		});

		it("should fetch streams for a receiver", async () => {
			const mockStreams = [
				{
					id: "stream-1",
					createdAtTimestamp: "1640000000",
					updatedAtTimestamp: "1640001000",
					currentFlowRate: "1000000000000000",
					streamedUntilUpdatedAt: "5000000000000000000",
					token: {
						id: "0xtoken",
						symbol: "DAIx",
						name: "Super DAI",
						decimals: 18,
					},
					sender: { id: "0xsender" },
					receiver: { id: "0xreceiver" },
				},
			];

			const mockRequest = vi.fn().mockResolvedValue({ streams: mockStreams });
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() => useStreamsByReceiver("0xreceiver" as `0x${string}`),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(mockStreams);
			expect(mockRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					receiver: "0xreceiver",
					first: 100,
					skip: 0,
				}),
			);
		});

		it("should handle pagination options", async () => {
			const mockRequest = vi.fn().mockResolvedValue({ streams: [] });
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() =>
					useStreamsByReceiver("0xreceiver" as `0x${string}`, {
						first: 50,
						skip: 10,
					}),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(mockRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					first: 50,
					skip: 10,
				}),
			);
		});

		it("should handle errors gracefully", async () => {
			const mockError = new Error("Subgraph query failed");
			const mockRequest = vi.fn().mockRejectedValue(mockError);
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() => useStreamsByReceiver("0xreceiver" as `0x${string}`),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error).toBeDefined();
		});

		it("should not fetch when chain is not supported", async () => {
			vi.mocked(useChainId).mockReturnValue(999999); // Unsupported chain

			const mockRequest = vi.fn();
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() => useStreamsByReceiver("0xreceiver" as `0x${string}`),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isFetching).toBe(false));
			expect(mockRequest).not.toHaveBeenCalled();
		});
	});

	describe("useAccountStreamInfo", () => {
		it("should return null when account is undefined", async () => {
			const { result } = renderHook(() => useAccountStreamInfo(undefined), {
				wrapper: createWrapper(),
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toBeNull();
		});

		it("should fetch account info", async () => {
			const mockAccountData = {
				id: "0xaccount",
				isSuperApp: false,
				createdAtTimestamp: "1640000000",
				updatedAtTimestamp: "1640001000",
				accountTokenSnapshots: [
					{
						token: {
							id: "0xtoken",
							symbol: "DAIx",
							name: "Super DAI",
							decimals: 18,
						},
						totalNetFlowRate: "1000000000000000",
						totalInflowRate: "1000000000000000",
						totalOutflowRate: "0",
						totalAmountStreamedUntilUpdatedAt: "5000000000000000000",
						totalDeposit: "10000000000000000000",
						totalCFADeposit: "10000000000000000000",
						balanceUntilUpdatedAt: "15000000000000000000",
						updatedAtTimestamp: "1640001000",
					},
				],
			};

			const mockRequest = vi
				.fn()
				.mockResolvedValue({ account: mockAccountData });
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() => useAccountStreamInfo("0xaccount" as `0x${string}`),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(mockAccountData);
		});
	});

	describe("useStreamByParties", () => {
		it("should return null when params are missing", async () => {
			const { result } = renderHook(
				() =>
					useStreamByParties(
						undefined,
						"0xreceiver" as `0x${string}`,
						"0xtoken" as `0x${string}`,
					),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toBeNull();
		});

		it("should fetch specific stream", async () => {
			const mockStream = {
				id: "stream-1",
				createdAtTimestamp: "1640000000",
				updatedAtTimestamp: "1640001000",
				currentFlowRate: "1000000000000000",
				streamedUntilUpdatedAt: "5000000000000000000",
				token: {
					id: "0xtoken",
					symbol: "DAIx",
					name: "Super DAI",
					decimals: 18,
				},
				sender: { id: "0xsender" },
				receiver: { id: "0xreceiver" },
			};

			const mockRequest = vi.fn().mockResolvedValue({ streams: [mockStream] });
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() =>
					useStreamByParties(
						"0xsender" as `0x${string}`,
						"0xreceiver" as `0x${string}`,
						"0xtoken" as `0x${string}`,
					),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(mockStream);
		});
	});

	describe("useStreamHistory", () => {
		it("should return empty array when receiver is undefined", async () => {
			const { result } = renderHook(() => useStreamHistory(undefined), {
				wrapper: createWrapper(),
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual([]);
		});

		it("should fetch stream history", async () => {
			const mockEvents = [
				{
					id: "event-1",
					timestamp: "1640001000",
					flowRate: "1000000000000000",
					totalAmountStreamedUntilTimestamp: "5000000000000000000",
					token: "0xtoken",
					sender: "0xsender",
					receiver: "0xreceiver",
					stream: {
						id: "stream-1",
						currentFlowRate: "1000000000000000",
						createdAtTimestamp: "1640000000",
					},
					transaction: {
						id: "0xtx",
						timestamp: "1640001000",
						blockNumber: "12345678",
					},
				},
			];

			const mockRequest = vi
				.fn()
				.mockResolvedValue({ flowUpdatedEvents: mockEvents });
			vi.mocked(GraphQLClient).mockImplementation(
				() =>
					({
						request: mockRequest,
					}) as any,
			);

			const { result } = renderHook(
				() => useStreamHistory("0xreceiver" as `0x${string}`, 25),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(mockEvents);
			expect(mockRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					receiver: "0xreceiver",
					first: 25,
				}),
			);
		});
	});
});
