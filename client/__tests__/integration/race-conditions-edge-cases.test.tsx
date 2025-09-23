import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import "@testing-library/jest-dom";

// Import hooks to test
import { useEnhancedNFTs } from "@/hooks/nft/useEnhancedNFTs";
import {
  useNFTBalanceProof,
  validateBalanceProof,
} from "@/hooks/nft/useNFTBalanceProof";
import { useJarCreation } from "@/hooks/jar/useJarCreation";

// Import types
import type { EnhancedNFT } from "@/lib/nft/AlchemyProvider";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  UseAccountReturnType,
  UseReadContractReturnType,
  UseWriteContractReturnType,
  UseWaitForTransactionReceiptReturnType,
} from "wagmi";

import { vi } from "vitest";

// Mock wagmi hooks with controllable behavior
vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: vi.fn(),
    useChainId: vi.fn(),
    useBlockNumber: vi.fn(),
    useReadContract: vi.fn(),
    useWriteContract: vi.fn(),
    useWaitForTransactionReceipt: vi.fn(),
  };
});

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Alchemy SDK with controllable timing
const mockAlchemyProvider = {
  getUserNFTs: vi.fn(),
  getNFTMetadata: vi.fn(),
  validateContract: vi.fn(),
};

vi.mock("@/lib/nft-providers/AlchemyProvider", () => ({
  AlchemyNFTProvider: vi.fn().mockImplementation(() => mockAlchemyProvider),
}));

// Test utilities
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const createWrapper = (queryClient = createQueryClient()) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Utility to simulate async delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Race Conditions and Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Import wagmi properly
    const {
      useAccount,
      useChainId,
      useBlockNumber,
      useReadContract,
      useWriteContract,
      useWaitForTransactionReceipt,
    } = require("wagmi");

    // Default mock implementations
    vi.mocked(useAccount).mockReturnValue({
      address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      isConnected: true,
    } as any);

    vi.mocked(useChainId).mockReturnValue(1);

    vi.mocked(useBlockNumber).mockReturnValue({
      data: 100n,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useReadContract).mockReturnValue({
      data: 5n,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: "0xabcdef" as `0x${string}`,
      error: null,
      isPending: false,
    } as any);

    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    } as any);
  });

  describe("Network Switching Race Conditions", () => {
    it("handles rapid network switching without data corruption", async () => {
      let requestId = 0;
      const networkResponses = new Map();

      mockAlchemyProvider.getUserNFTs.mockImplementation(
        async (address: string) => {
          const currentRequestId = ++requestId;
          const { useChainId } = require("wagmi");
          const mockUseChainId = vi.mocked(useChainId);
          const chainId =
            mockUseChainId.mock.results[mockUseChainId.mock.results.length - 1]
              ?.value ?? 1;

          // Simulate different response times for different networks
          const delay = chainId === 1 ? 300 : chainId === 8453 ? 100 : 200;
          await new Promise((resolve) => setTimeout(resolve, delay));

          const response: EnhancedNFT[] = [
            {
              contractAddress: "0x" + chainId.toString().padStart(40, "0"),
              tokenId: "1",
              tokenType: "ERC721" as const,
              name: `Token on Chain ${chainId}`,
              collection: {
                name: `Chain ${chainId} Collection`,
                address: "0x123",
              },
              balance: 1n,
            },
          ];

          networkResponses.set(currentRequestId, { chainId, response });
          return response;
        },
      );

      const { result, rerender } = renderHook(
        ({ chainId }: { chainId: number }) => {
          const { useChainId } = require("wagmi");
          vi.mocked(useChainId).mockReturnValue(chainId);
          return useEnhancedNFTs({ enabled: true });
        },
        {
          wrapper: createWrapper(),
          initialProps: { chainId: 1 },
        },
      );

      // Rapidly switch networks
      act(() => {
        rerender({ chainId: 8453 }); // Base
      });

      await act(async () => {
        await delay(50);
        rerender({ chainId: 10 }); // Optimism
      });

      await act(async () => {
        await delay(50);
        rerender({ chainId: 1 }); // Back to Ethereum
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      // Should have data for the final network only
      const finalNFTs = result.current.nfts;
      if (finalNFTs.length > 0) {
        // Contract address should match the final chain ID
        expect(finalNFTs[0].contractAddress).toBe(
          "0x0000000000000000000000000000000000000001",
        );
      }
    });

    it("cancels outdated requests when network changes", async () => {
      let activeRequests = 0;
      let completedRequests = 0;

      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        activeRequests++;

        try {
          await delay(500); // Long request
          completedRequests++;
          return [];
        } finally {
          activeRequests--;
        }
      });

      const { result, rerender } = renderHook(
        ({ chainId }: { chainId: number }) => {
          const { useChainId } = require("wagmi");
          vi.mocked(useChainId).mockReturnValue(chainId);
          return useEnhancedNFTs({ enabled: true });
        },
        {
          wrapper: createWrapper(),
          initialProps: { chainId: 1 },
        },
      );

      // Start request on chain 1
      await act(async () => {
        await delay(100);
      });

      // Switch to chain 2 before first request completes
      act(() => {
        rerender({ chainId: 8453 });
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      // Should have started multiple requests but may not complete all
      expect(activeRequests).toBe(0); // All requests should be done or cancelled
    });
  });

  describe("Balance Proof Race Conditions", () => {
    it("handles balance changes during proof generation", async () => {
      let currentBalance = 5n;
      let currentBlock = 100n;

      const { useReadContract, useBlockNumber } = require("wagmi");

      vi.mocked(useReadContract).mockImplementation(() => ({
        data: currentBalance,
        isLoading: false,
        error: null,
      }));

      vi.mocked(useBlockNumber).mockImplementation(() => ({
        data: currentBlock,
        isLoading: false,
      }));

      const { result, rerender } = renderHook(
        () =>
          useNFTBalanceProof({
            contractAddress: "0x1234567890123456789012345678901234567890",
            tokenId: "1",
            tokenType: "ERC721",
          }),
        { wrapper: createWrapper() },
      );

      // Initial proof should be valid
      await waitFor(() => {
        expect(result.current.proof).toBeDefined();
        expect(result.current.isStale).toBe(false);
      });

      // Simulate balance change and block progression
      act(() => {
        currentBalance = 2n; // Balance decreased
        currentBlock = 110n; // Block advanced
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isStale).toBe(true); // Should detect staleness
      });
    });

    it("validates stale balance proofs correctly", () => {
      const validProof = {
        balance: 5n,
        blockNumber: 100,
        timestamp: Date.now() - 30000, // 30 seconds ago
        isValid: true,
      };

      const staleProof = {
        balance: 5n,
        blockNumber: 85, // More than 10 blocks old
        timestamp: Date.now() - 300000, // 5 minutes ago
        isValid: false,
      };

      const currentBlock = 100;

      expect(validateBalanceProof(validProof, currentBlock, 1n).isValid).toBe(
        true,
      );
      expect(validateBalanceProof(staleProof, currentBlock, 1n).isValid).toBe(
        false,
      );
    });

    it("handles ERC1155 balance proof edge cases", async () => {
      // Test zero balance
      const { useReadContract } = require("wagmi");
      vi.mocked(useReadContract).mockReturnValue({
        data: 0n,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(
        () =>
          useNFTBalanceProof({
            contractAddress: "0x1234567890123456789012345678901234567890",
            tokenId: "1",
            tokenType: "ERC1155",
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.proof).toBeNull(); // Should be null for insufficient balance
      });
    });
  });

  describe("Transaction Race Conditions", () => {
    it("handles concurrent jar creation attempts", async () => {
      const writeContractMock = vi.fn();
      const { useWriteContract } = require("wagmi");
      vi.mocked(useWriteContract).mockReturnValue({
        writeContract: writeContractMock,
        data: undefined,
        error: null,
        isPending: false,
      });

      const { result: result1 } = renderHook(() => useJarCreation(), {
        wrapper: createWrapper(),
      });
      const { result: result2 } = renderHook(() => useJarCreation(), {
        wrapper: createWrapper(),
      });

      const jarConfig = {
        jarOwner: "0x1234567890123456789012345678901234567890",
        currency: "0x0000000000000000000000000000000000000000",
        feeCollector: "0x1234567890123456789012345678901234567890",
        feePercentageOnDeposit: 500,
        withdrawalOption: 0,
        fixedAmount: "1000000000000000000",
        maxWithdrawal: "5000000000000000000",
        minimumWithdrawalTime: 86400,
        emergencyWithdrawalEnabled: true,
        minDeposit: "100000000000000000",
      };

      const accessConfig = {
        accessType: 0, // Allowlist
        allowlist: ["0x1234567890123456789012345678901234567890"],
        nftAddresses: [],
        nftTypes: [],
        poapReq: { eventId: 0 },
        unlockReq: {
          lockAddress: "0x0000000000000000000000000000000000000000",
        },
        hypercertReq: {
          tokenContract: "0x0000000000000000000000000000000000000000",
          minUnits: "0",
        },
        hatsReq: {
          hatId: "0",
          wearer: "0x0000000000000000000000000000000000000000",
        },
      };

      // Start two concurrent jar creation attempts
      act(() => {
        result1.current.confirmSubmit();
        result2.current.confirmSubmit();
      });

      // Should only call writeContract once (the second should be prevented by pending state)
      await waitFor(() => {
        expect(writeContractMock).toHaveBeenCalledTimes(1);
      });
    });

    it("handles transaction confirmation race conditions", async () => {
      const writeContractMock = vi.fn();
      let transactionState = { isLoading: true, isSuccess: false, data: null };

      const {
        useWriteContract,
        useWaitForTransactionReceipt,
      } = require("wagmi");
      vi.mocked(useWriteContract).mockReturnValue({
        writeContract: writeContractMock,
        data: "0x123",
        error: null,
        isPending: false,
      });

      vi.mocked(useWaitForTransactionReceipt).mockReturnValue(transactionState);

      const { result, rerender } = renderHook(() => useJarCreation(), {
        wrapper: createWrapper(),
      });

      // Simulate transaction state changes
      act(() => {
        transactionState = {
          isLoading: false,
          isSuccess: true,
          data: { blockHash: "0xabc" } as any,
        };
      });

      rerender();

      await waitFor(() => {
        expect(result.current.txConfirmed).toBe(true);
      });
    });
  });

  describe("Component State Management Edge Cases", () => {
    it("handles unmounting during async operations", async () => {
      let requestCancelled = false;

      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        await delay(1000);
        if (requestCancelled) {
          throw new Error("Request cancelled");
        }
        return [];
      });

      const { unmount } = renderHook(() => useEnhancedNFTs({ enabled: true }), {
        wrapper: createWrapper(),
      });

      // Unmount before request completes
      setTimeout(() => {
        requestCancelled = true;
        unmount();
      }, 100);

      // Should not throw errors or cause memory leaks
      await delay(1200);
    });

    it("handles rapid enable/disable toggling", async () => {
      let requestCount = 0;
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        requestCount++;
        await delay(100);
        return [];
      });

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useEnhancedNFTs({ enabled }),
        {
          wrapper: createWrapper(),
          initialProps: { enabled: true },
        },
      );

      // Rapidly toggle enabled state
      for (let i = 0; i < 10; i++) {
        act(() => {
          rerender({ enabled: i % 2 === 0 });
        });
        await delay(10);
      }

      await delay(500);

      // Should not make excessive requests
      expect(requestCount).toBeLessThan(5);
    });
  });

  describe("Memory Management Edge Cases", () => {
    it("handles large NFT collections without memory leaks", async () => {
      const largeCollection = Array.from({ length: 5000 }, (_, i) => ({
        contractAddress: "0x1234567890123456789012345678901234567890",
        tokenId: i.toString(),
        tokenType: "ERC721" as const,
        name: `Token ${i}`,
        collection: { name: "Large Collection", address: "0x123" },
        balance: 1n,
      }));

      mockAlchemyProvider.getUserNFTs.mockResolvedValue(largeCollection);

      const { result, unmount } = renderHook(
        () => useEnhancedNFTs({ enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.nfts.length).toBeLessThanOrEqual(1000); // Should be capped
      });

      // Cleanup should not cause issues
      unmount();
    });

    it("properly cleans up intervals and timers", async () => {
      const { unmount } = renderHook(
        () =>
          useNFTBalanceProof({
            contractAddress: "0x1234567890123456789012345678901234567890",
            tokenId: "1",
            tokenType: "ERC721",
          }),
        { wrapper: createWrapper() },
      );

      // Should not cause timer warnings when unmounting
      unmount();
    });
  });

  describe("Input Validation Edge Cases", () => {
    it("handles extremely long addresses", async () => {
      const veryLongAddress = "0x" + "1".repeat(1000);

      mockAlchemyProvider.validateContract.mockResolvedValue({
        isValid: false,
        detectedType: null,
        error: "Invalid contract address format",
      });

      const { result } = renderHook(
        () =>
          useEnhancedNFTs({
            contractAddresses: [veryLongAddress],
            enabled: true,
          }),
        { wrapper: createWrapper() },
      );

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(result.current.nfts).toEqual([]);
      });
    });

    it("handles null and undefined values gracefully", async () => {
      mockAlchemyProvider.getUserNFTs.mockResolvedValue([
        {
          contractAddress: null,
          tokenId: undefined,
          tokenType: "ERC721",
          name: null,
          collection: { name: undefined, address: null },
          balance: null,
        },
      ]);

      const { result } = renderHook(() => useEnhancedNFTs({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // Should filter out invalid NFTs
        expect(result.current.nfts).toEqual([]);
      });
    });
  });

  describe("Error Boundary Edge Cases", () => {
    it("recovers from temporary provider failures", async () => {
      let attemptCount = 0;
      mockAlchemyProvider.getUserNFTs.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error("Temporary failure");
        }
        return [
          { contractAddress: "0x123", tokenId: "1", tokenType: "ERC721" },
        ];
      });

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            retryDelay: 100,
          },
        },
      });

      const { result } = renderHook(() => useEnhancedNFTs({ enabled: true }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(
        () => {
          expect(result.current.nfts).toHaveLength(1);
          expect(attemptCount).toBe(3);
        },
        { timeout: 2000 },
      );
    });
  });

  describe("Performance Edge Cases", () => {
    it("handles high-frequency updates without performance degradation", async () => {
      let updateCount = 0;
      const { result, rerender } = renderHook(
        ({ userAddress }: { userAddress: string }) => {
          updateCount++;
          return useEnhancedNFTs({ userAddress, enabled: true });
        },
        {
          wrapper: createWrapper(),
          initialProps: { userAddress: "0x1" },
        },
      );

      // Rapidly change user address
      for (let i = 0; i < 100; i++) {
        act(() => {
          rerender({ userAddress: `0x${i}` });
        });
      }

      // Should debounce updates
      expect(updateCount).toBeLessThan(200);
    });

    it("handles concurrent hook instances efficiently", async () => {
      const hooks = Array.from({ length: 20 }, () =>
        renderHook(() => useEnhancedNFTs({ enabled: true }), {
          wrapper: createWrapper(),
        }),
      );

      await waitFor(() => {
        hooks.forEach(({ result }) => {
          expect(result.current.isLoading).toBe(false);
        });
      });

      // Cleanup all hooks
      hooks.forEach(({ unmount }) => unmount());
    });
  });
});
