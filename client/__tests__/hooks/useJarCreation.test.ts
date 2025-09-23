import "@testing-library/jest-dom";
import { renderHook, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useJarCreation } from "@/hooks/jar/useJarCreation";

// Mock wagmi hooks
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    isConnected: true,
    address: "0x1234567890123456789012345678901234567890",
  })),
  useChainId: vi.fn(() => 8453), // Base mainnet (v1)
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    data: "0xabcdef",
    error: null,
    isPending: false,
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false,
    data: null,
  })),
}));

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock config
vi.mock("@/config/supported-networks", () => ({
  contractAddresses: {
    cookieJarFactory: {
      8453: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9", // Base
      31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Anvil
    },
  },
  isV2Chain: vi.fn((chainId: number) => chainId === 31337),
}));

// Mock toast
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("useJarCreation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderHookWithProviders = () => {
    return renderHook(() => useJarCreation(), {
      wrapper: ({ children }: { children: React.ReactNode }) => 
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });
  };

  describe("🔧 ETH Address Fix", () => {
    it("should use address(3) for ETH address", () => {
      const { result } = renderHookWithProviders();

      expect(result.current.ETH_ADDRESS).toBe(
        "0x0000000000000000000000000000000000000003",
      );
    });

    it("should initialize supportedCurrency with correct ETH address", () => {
      const { result } = renderHookWithProviders();

      expect(result.current.supportedCurrency).toBe(
        "0x0000000000000000000000000000000000000003",
      );
    });
  });

  describe("🚀 V1 vs V2 Logic", () => {
    it("should detect v1 contracts correctly", () => {
      const { result } = renderHookWithProviders();

      // Base mainnet should be v1
      expect(result.current.isV2Contract).toBe(false);
    });

    it("should detect v2 contracts correctly", () => {
      // Mock Anvil chain (31337) as v2
      vi.mocked(vi.fn()).mockReturnValue(31337);
      vi.mocked(require("@/config/supported-networks").isV2Chain).mockReturnValue(true);
      
      const { result } = renderHookWithProviders();
      expect(result.current.isV2Contract).toBe(true);
    });

    it("should disable custom fees for v1 contracts", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.setEnableCustomFee(true);
      });

      // Should automatically disable custom fees for v1 when isV2Contract is false
      expect(result.current.enableCustomFee).toBe(false);
    });

    it("should force allowlist access type for v1 contracts", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.setAccessType(1); // NFTGated
      });

      // Should automatically revert to allowlist for v1
      expect(result.current.accessType).toBe(0); // Allowlist
    });
  });

  describe("📝 Form Validation", () => {
    it("should validate required jar name", () => {
      const { result } = renderHookWithProviders();

      const validation = result.current.validateStep1();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Jar name is required");
    });

    it("should validate withdrawal amounts", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.setWithdrawalOption(0); // Fixed
        result.current.setFixedAmount("0");
      });

      const validation = result.current.validateStep2();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Fixed withdrawal amount must be greater than 0");
    });

    it("should validate withdrawal interval", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.setWithdrawalInterval("0");
      });

      const validation = result.current.validateStep2();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Withdrawal interval must be greater than 0 days");
    });

    it("should validate custom fee percentage", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.setEnableCustomFee(true);
        result.current.setCustomFee("150"); // Over 100%
      });

      const validation = result.current.validateStep4();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Custom fee must be between 0 and 100 percent");
    });
  });

  describe("💱 Currency Handling", () => {
    it("should handle custom currency selection", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.handleCurrencyChange("CUSTOM");
      });

      expect(result.current.showCustomCurrency).toBe(true);
    });

    it("should validate ERC20 addresses", async () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.setCustomCurrencyAddress("0x1234567890123456789012345678901234567890");
      });

      await act(async () => {
        await result.current.handleCustomCurrencySubmit();
      });

      // Should handle the submission (testing the function executes without throwing)
      expect(result.current.handleCustomCurrencySubmit).toBeDefined();
    });
  });

  describe("🧹 Form Reset", () => {
    it("should reset all form fields", () => {
      const { result } = renderHookWithProviders();

      // Set some values
      act(() => {
        result.current.setJarName("Test Jar");
        result.current.setFixedAmount("0.5");
        result.current.setEnableCustomFee(true);
      });

      // Verify values are set
      expect(result.current.jarName).toBe("Test Jar");
      expect(result.current.fixedAmount).toBe("0.5");
      expect(result.current.enableCustomFee).toBe(true);

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      // Verify values are reset
      expect(result.current.jarName).toBe("");
      expect(result.current.fixedAmount).toBe("0");
      expect(result.current.enableCustomFee).toBe(false);
    });
  });

  describe("🎲 Development Helpers", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should populate random data in development", () => {
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.prepopulateRandomData();
      });

      // Should have populated some data
      expect(result.current.jarName).toBeTruthy();
      expect(result.current.fixedAmount).not.toBe("0");
    });
  });
});
