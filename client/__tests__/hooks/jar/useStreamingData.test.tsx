import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStreamingData } from "@/hooks/jar/useStreamingData";
import * as SuperfluidFrameworkHook from "@/hooks/blockchain/useSuperfluidFramework";
import * as SuperfluidSubgraphHook from "@/hooks/blockchain/useSuperfluidSubgraph";
import React from "react";

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

describe("useStreamingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Superfluid Framework
    vi.spyOn(SuperfluidFrameworkHook, "useSuperfluidFramework").mockReturnValue({
      data: {} as any,
      isLoading: false,
      error: null,
      refetch: vi.fn() as any,
      isSuccess: true,
      isError: false,
      status: "success",
    } as any);
  });

  it("should return empty streams when no subgraph data", async () => {
    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.streams).toEqual([]));
  });

  it("should transform subgraph streams correctly", async () => {
    const mockSubgraphStreams = [
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
        receiver: { id: "0xjar" },
      },
    ];

    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: mockSubgraphStreams,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.streams).toHaveLength(1);
      expect(result.current.streams[0]).toMatchObject({
        id: "stream-1",
        sender: "0xsender",
        token: "0xtoken",
        tokenSymbol: "DAIx",
        isActive: true,
      });
    });
  });

  it("should handle multiple streams", async () => {
    const mockSubgraphStreams = [
      {
        id: "stream-1",
        createdAtTimestamp: "1640000000",
        updatedAtTimestamp: "1640001000",
        currentFlowRate: "1000000000000000",
        streamedUntilUpdatedAt: "5000000000000000000",
        token: {
          id: "0xtoken1",
          symbol: "DAIx",
          name: "Super DAI",
          decimals: 18,
        },
        sender: { id: "0xsender1" },
        receiver: { id: "0xjar" },
      },
      {
        id: "stream-2",
        createdAtTimestamp: "1640000000",
        updatedAtTimestamp: "1640001000",
        currentFlowRate: "2000000000000000",
        streamedUntilUpdatedAt: "10000000000000000000",
        token: {
          id: "0xtoken2",
          symbol: "USDCx",
          name: "Super USDC",
          decimals: 6,
        },
        sender: { id: "0xsender2" },
        receiver: { id: "0xjar" },
      },
    ];

    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: mockSubgraphStreams,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.streams).toHaveLength(2);
      expect(result.current.streams[0].tokenSymbol).toBe("DAIx");
      expect(result.current.streams[1].tokenSymbol).toBe("USDCx");
    });
  });

  it("should correctly identify inactive streams", async () => {
    const mockSubgraphStreams = [
      {
        id: "stream-inactive",
        createdAtTimestamp: "1640000000",
        updatedAtTimestamp: "1640001000",
        currentFlowRate: "0", // Inactive
        streamedUntilUpdatedAt: "5000000000000000000",
        token: {
          id: "0xtoken",
          symbol: "DAIx",
          name: "Super DAI",
          decimals: 18,
        },
        sender: { id: "0xsender" },
        receiver: { id: "0xjar" },
      },
    ];

    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: mockSubgraphStreams,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.streams[0].isActive).toBe(false);
      expect(result.current.streams[0].ratePerSecond).toBe(0n);
    });
  });

  describe("formatStreamRate", () => {
    it("should format rate per second correctly", async () => {
      vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(
        () => useStreamingData("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const formatted = result.current.formatStreamRate(
          BigInt("1000000000000000"), // 0.001 tokens per second
          18
        );
        expect(formatted).toBe("0.001/second");
      });
    });

    it("should format rate per day for small rates", async () => {
      vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(
        () => useStreamingData("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const formatted = result.current.formatStreamRate(
          BigInt("11574074074074"), // Very small rate
          18
        );
        expect(formatted).toContain("/day");
      });
    });
  });

  describe("calculateClaimable", () => {
    it("should calculate claimable amount for active stream", async () => {
      vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(
        () => useStreamingData("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const mockStream = {
          id: "stream-1",
          sender: "0xsender",
          token: "0xtoken",
          tokenSymbol: "DAIx",
          ratePerSecond: BigInt("1000000000000000"), // 0.001 tokens/sec
          totalStreamed: BigInt("5000000000000000000"), // 5 tokens
          isActive: true,
          lastUpdated: Date.now() - 10000, // 10 seconds ago
          flowRate: BigInt("1000000000000000"),
        };

        const claimable = result.current.calculateClaimable(mockStream);
        
        // Should be approximately totalStreamed + (ratePerSecond * elapsed seconds)
        expect(claimable).toBeGreaterThan(BigInt("5000000000000000000"));
      });
    });

    it("should return totalStreamed for inactive stream", async () => {
      vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(
        () => useStreamingData("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const mockStream = {
          id: "stream-1",
          sender: "0xsender",
          token: "0xtoken",
          ratePerSecond: BigInt("0"), // Inactive
          totalStreamed: BigInt("5000000000000000000"),
          isActive: false,
          lastUpdated: Date.now() - 10000,
          flowRate: BigInt("0"),
        };

        const claimable = result.current.calculateClaimable(mockStream);
        expect(claimable).toBe(BigInt("5000000000000000000"));
      });
    });
  });

  it("should combine loading states correctly", async () => {
    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoadingStreams).toBe(true);
  });

  it("should handle subgraph errors", async () => {
    const mockError = new Error("Subgraph unavailable");
    
    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.streamsError).toBeDefined();
    });
  });

  it("should provide streaming configuration", async () => {
    vi.spyOn(SuperfluidSubgraphHook, "useStreamsByReceiver").mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useStreamingData("0xjar" as `0x${string}`),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.streamingConfig).toMatchObject({
        streamingEnabled: true,
        requireStreamApproval: expect.any(Boolean),
        maxStreamRate: expect.any(BigInt),
        minStreamDuration: expect.any(Number),
      });
    });
  });
});
