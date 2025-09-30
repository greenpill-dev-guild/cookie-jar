import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStreamingActions } from "@/hooks/jar/useStreamingActions";
import * as SuperfluidFrameworkHook from "@/hooks/blockchain/useSuperfluidFramework";
import { useAccount, useWalletClient } from "wagmi";
import React from "react";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
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

describe("useStreamingActions", () => {
  const mockCreateFlow = vi.fn().mockResolvedValue({
    hash: "0xhash",
    wait: vi.fn().mockResolvedValue({ status: 1 }),
  });
  
  const mockUpdateFlow = vi.fn().mockResolvedValue({
    hash: "0xhash",
    wait: vi.fn().mockResolvedValue({ status: 1 }),
  });
  
  const mockDeleteFlow = vi.fn().mockResolvedValue({
    hash: "0xhash",
    wait: vi.fn().mockResolvedValue({ status: 1 }),
  });

  const mockCfaV1 = {
    createFlow: mockCreateFlow,
    updateFlow: mockUpdateFlow,
    deleteFlow: mockDeleteFlow,
  };

  const mockSigner = {
    getAddress: vi.fn().mockResolvedValue("0xuser"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Superfluid Framework
    vi.spyOn(SuperfluidFrameworkHook, "useSuperfluidFramework").mockReturnValue({
      data: {
        cfaV1: mockCfaV1,
      } as any,
      isLoading: false,
      error: null,
      refetch: vi.fn() as any,
      isSuccess: true,
      isError: false,
      status: "success",
    } as any);

    // Mock wagmi hooks
    vi.mocked(useAccount).mockReturnValue({
      address: "0xuser" as `0x${string}`,
      isConnected: true,
    } as any);

    vi.mocked(useWalletClient).mockReturnValue({
      data: mockSigner as any,
      isLoading: false,
      error: null,
    } as any);
  });

  describe("createSuperStream", () => {
    it("should create a stream successfully", async () => {
      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.createSuperStream(
          "0xtoken",
          "1000000000000000"
        );
      });

      await waitFor(() => {
        expect(mockCreateFlow).toHaveBeenCalledWith({
          superToken: "0xtoken",
          sender: "0xuser",
          receiver: "0xjar",
          flowRate: "1000000000000000",
        });
      });
    });

    it("should set isCreating to true during creation", async () => {
      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      let createPromise: Promise<void>;
      
      await act(async () => {
        createPromise = result.current.createSuperStream(
          "0xtoken",
          "1000000000000000"
        );
        
        // Should be true immediately after calling
        expect(result.current.isCreating).toBe(true);
      });

      await act(async () => {
        await createPromise!;
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });

    it("should handle creation errors", async () => {
      const mockError = new Error("Creation failed");
      mockCreateFlow.mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(
          result.current.createSuperStream("0xtoken", "1000000000000000")
        ).rejects.toThrow("Creation failed");
      });

      expect(result.current.isCreating).toBe(false);
    });
  });

  describe("updateSuperStream", () => {
    it("should update a stream successfully", async () => {
      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.updateSuperStream(
          "0xtoken",
          "2000000000000000"
        );
      });

      await waitFor(() => {
        expect(mockUpdateFlow).toHaveBeenCalledWith({
          superToken: "0xtoken",
          sender: "0xuser",
          receiver: "0xjar",
          flowRate: "2000000000000000",
        });
      });
    });

    it("should set isUpdating to true during update", async () => {
      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      let updatePromise: Promise<void>;
      
      await act(async () => {
        updatePromise = result.current.updateSuperStream(
          "0xtoken",
          "2000000000000000"
        );
        
        expect(result.current.isUpdating).toBe(true);
      });

      await act(async () => {
        await updatePromise!;
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });

    it("should handle update errors", async () => {
      const mockError = new Error("Update failed");
      mockUpdateFlow.mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(
          result.current.updateSuperStream("0xtoken", "2000000000000000")
        ).rejects.toThrow("Update failed");
      });

      expect(result.current.isUpdating).toBe(false);
    });
  });

  describe("deleteSuperStream", () => {
    it("should delete a stream successfully", async () => {
      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.deleteSuperStream("0xtoken");
      });

      await waitFor(() => {
        expect(mockDeleteFlow).toHaveBeenCalledWith({
          superToken: "0xtoken",
          sender: "0xuser",
          receiver: "0xjar",
        });
      });
    });

    it("should set isDeleting to true during deletion", async () => {
      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      let deletePromise: Promise<void>;
      
      await act(async () => {
        deletePromise = result.current.deleteSuperStream("0xtoken");
        
        expect(result.current.isDeleting).toBe(true);
      });

      await act(async () => {
        await deletePromise!;
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });

    it("should handle deletion errors", async () => {
      const mockError = new Error("Deletion failed");
      mockDeleteFlow.mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(
          result.current.deleteSuperStream("0xtoken")
        ).rejects.toThrow("Deletion failed");
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe("error scenarios", () => {
    it("should handle missing Superfluid Framework", async () => {
      vi.spyOn(SuperfluidFrameworkHook, "useSuperfluidFramework").mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn() as any,
        isSuccess: false,
        isError: false,
        status: "success",
      } as any);

      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(
          result.current.createSuperStream("0xtoken", "1000000000000000")
        ).rejects.toThrow();
      });
    });

    it("should handle missing wallet connection", async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any);

      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(
          result.current.createSuperStream("0xtoken", "1000000000000000")
        ).rejects.toThrow();
      });
    });

    it("should handle missing signer", async () => {
      vi.mocked(useWalletClient).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(
        () => useStreamingActions("0xjar" as `0x${string}`),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await expect(
          result.current.createSuperStream("0xtoken", "1000000000000000")
        ).rejects.toThrow();
      });
    });
  });
});
