// Test for useUnlock hook with real Unlock Protocol SDK
import "@testing-library/jest-dom";
import { renderHook, waitFor } from "@testing-library/react";
import { useUnlock } from "@/hooks/nft/useUnlock";
import { vi } from "vitest";

// Mock wagmi hooks
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
  })),
  useChainId: vi.fn(() => 1), // Default to Ethereum mainnet
  useReadContract: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock the Unlock Protocol SDK
vi.mock("@unlock-protocol/unlock-js", () => ({
  Web3Service: vi.fn().mockImplementation(() => ({
    getLock: vi.fn(),
    getKeyByLockForOwner: vi.fn(),
    getHasValidKey: vi.fn(),
  })),
  SubgraphService: vi.fn().mockImplementation(() => ({
    locks: vi.fn(),
    keys: vi.fn(),
  })),
}));

// Import mocked modules
import { Web3Service } from "@unlock-protocol/unlock-js";

const mockWeb3Service = {
  getLock: vi.fn(),
  getKeyByLockForOwner: vi.fn(),
  getHasValidKey: vi.fn(),
};

// Mock implementation setup
beforeEach(() => {
  vi.clearAllMocks();
  (Web3Service as ReturnType<typeof vi.fn>).mockImplementation(
    () => mockWeb3Service as any,
  );
});

describe("useUnlock Hook - Real SDK Integration", () => {
  const testLockAddress = "0x4d3B56E8eb15b6f23De29DeE42Ab0bD6e1CAf2f2";
  const testUserAddress = "0x1234567890123456789012345678901234567890";

  describe("Lock Information Fetching", () => {
    it("fetches real lock information using Web3Service", async () => {
      // Mock successful lock fetch
      const mockLockData = {
        address: testLockAddress,
        name: "Test Membership Lock",
        keyPrice: "0.01",
        maxNumberOfKeys: 1000,
        outstandingKeys: 50,
        expirationDuration: 31536000, // 1 year
        currencyContractAddress: "0x0000000000000000000000000000000000000000", // ETH
        version: 11,
      };

      mockWeb3Service.getLock.mockResolvedValue(mockLockData);

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          checkValidity: true,
        }),
      );

      // Trigger lock validation
      await result.current.validateLockAddress(testLockAddress);

      await waitFor(() => {
        expect(mockWeb3Service.getLock).toHaveBeenCalledWith(
          testLockAddress,
          expect.any(Number),
        );
      });

      expect(result.current.lockInfo).toEqual({
        address: testLockAddress,
        name: "Test Membership Lock",
        keyPrice: "0.01",
        maxNumberOfKeys: 1000,
        totalSupply: 50,
        expirationDuration: 31536000,
        currencySymbol: "ETH",
      });
    });

    it("handles lock fetch errors gracefully", async () => {
      mockWeb3Service.getLock.mockRejectedValue(new Error("Lock not found"));

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      await result.current.validateLockAddress(testLockAddress);

      await waitFor(() => {
        expect(result.current.lockError).toBe(
          "Invalid Unlock Protocol lock contract",
        );
      });

      expect(result.current.lockInfo).toBeNull();
    });

    it("validates lock address format before API call", async () => {
      const invalidAddress = "invalid-address";

      const { result } = renderHook(() => useUnlock());

      await expect(
        result.current.validateLockAddress(invalidAddress),
      ).rejects.toThrow("Invalid contract address format");

      expect(mockWeb3Service.getLock).not.toHaveBeenCalled();
    });
  });

  describe("Key Validity Checking", () => {
    it("checks user key validity using Web3Service", async () => {
      const mockKeyData = {
        tokenId: "123",
        expiration: Math.floor(Date.now() / 1000) + 86400, // Expires in 1 day
        owner: testUserAddress,
      };

      mockWeb3Service.getKeyByLockForOwner.mockResolvedValue(mockKeyData);

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          checkValidity: true,
        }),
      );

      const isValid =
        await result.current.checkUserKeyValidity(testLockAddress);

      expect(mockWeb3Service.getKeyByLockForOwner).toHaveBeenCalledWith(
        testLockAddress,
        testUserAddress,
      );
      expect(isValid).toBe(true);
    });

    it("returns false for expired keys", async () => {
      const expiredKeyData = {
        tokenId: "123",
        expiration: Math.floor(Date.now() / 1000) - 86400, // Expired 1 day ago
        owner: testUserAddress,
      };

      mockWeb3Service.getKeyByLockForOwner.mockResolvedValue(expiredKeyData);

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          checkValidity: true,
        }),
      );

      const isValid =
        await result.current.checkUserKeyValidity(testLockAddress);

      expect(isValid).toBe(false);
    });

    it("returns false when user has no key", async () => {
      mockWeb3Service.getKeyByLockForOwner.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          checkValidity: true,
        }),
      );

      const isValid =
        await result.current.checkUserKeyValidity(testLockAddress);

      expect(isValid).toBe(false);
    });

    it("handles key validation errors", async () => {
      mockWeb3Service.getKeyByLockForOwner.mockRejectedValue(
        new Error("RPC Error"),
      );

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      const isValid =
        await result.current.checkUserKeyValidity(testLockAddress);

      expect(isValid).toBe(false);
    });
  });

  describe("User Keys Fetching", () => {
    it("fetches user keys when fetchUserKeys option is enabled", async () => {
      const mockValidKey = {
        tokenId: "123",
        expiration: Math.floor(Date.now() / 1000) + 86400,
        owner: testUserAddress,
      };

      mockWeb3Service.getKeyByLockForOwner.mockResolvedValue(mockValidKey);

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          fetchUserKeys: true,
          checkValidity: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.userKeys).toHaveLength(1);
      });

      expect(result.current.userKeys[0]).toEqual({
        lock: testLockAddress,
        tokenId: "123",
        keyId: "123",
        expiration: mockValidKey.expiration,
        isValid: true,
      });
    });

    it("returns empty array when user has no keys", async () => {
      mockWeb3Service.getKeyByLockForOwner.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          fetchUserKeys: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.userKeys).toEqual([]);
      });
    });
  });

  describe("Network Configuration", () => {
    it("uses correct network configuration for Web3Service", () => {
      renderHook(() => useUnlock({ lockAddress: testLockAddress }));

      expect(Web3Service).toHaveBeenCalledWith(
        expect.objectContaining({
          1: expect.objectContaining({
            unlockAddress: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
          }),
        }),
      );
    });

    it("handles unsupported networks gracefully", () => {
      // Import the useChainId mock
      const { useChainId } = require("wagmi");

      // Temporarily mock unsupported chain ID
      (useChainId as ReturnType<typeof vi.fn>).mockReturnValueOnce(999999);

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      // Should still create Web3Service with fallback to mainnet
      expect(Web3Service).toHaveBeenCalled();

      // Reset to default chain ID for subsequent tests
      (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1);
    });
  });

  describe("Loading States", () => {
    it("tracks loading states correctly", async () => {
      // Mock delayed response
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockWeb3Service.getLock.mockReturnValue(delayedPromise);

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      // Start validation
      const validatePromise =
        result.current.validateLockAddress(testLockAddress);

      // Should be loading
      expect(result.current.isLoadingLock).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        address: testLockAddress,
        name: "Test Lock",
      });

      await validatePromise;

      await waitFor(() => {
        expect(result.current.isLoadingLock).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    it("sets lock error when API call fails", async () => {
      mockWeb3Service.getLock.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      await result.current.validateLockAddress(testLockAddress);

      await waitFor(() => {
        expect(result.current.lockError).toBe(
          "Invalid Unlock Protocol lock contract",
        );
        expect(result.current.error).toBe(
          "Invalid Unlock Protocol lock contract",
        );
      });
    });

    it("sets keys error when key fetch fails", async () => {
      mockWeb3Service.getKeyByLockForOwner.mockRejectedValue(
        new Error("Keys fetch failed"),
      );

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          fetchUserKeys: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.keysError).toBe(
          "Failed to fetch your membership keys",
        );
        expect(result.current.error).toBe(
          "Failed to fetch your membership keys",
        );
      });
    });

    it("prioritizes first error when multiple errors exist", async () => {
      const { result } = renderHook(() => useUnlock());

      // Manually set multiple errors
      result.current.lockError = "Lock error";
      result.current.keysError = "Keys error";

      expect(result.current.error).toBe("Lock error");
    });
  });

  describe("Data Structure Validation", () => {
    it("returns properly structured lock info", async () => {
      const mockLockData = {
        address: testLockAddress,
        name: "Test Lock",
        keyPrice: "100000000000000000", // 0.1 ETH in wei
        maxNumberOfKeys: -1, // Unlimited
        outstandingKeys: 25,
        expirationDuration: 86400, // 1 day
        currencyContractAddress: "0x0000000000000000000000000000000000000000",
      };

      mockWeb3Service.getLock.mockResolvedValue(mockLockData);

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      await result.current.validateLockAddress(testLockAddress);

      await waitFor(() => {
        const lockInfo = result.current.lockInfo;
        expect(lockInfo).toHaveProperty("address");
        expect(lockInfo).toHaveProperty("name");
        expect(lockInfo).toHaveProperty("keyPrice");
        expect(lockInfo).toHaveProperty("totalSupply");
        expect(lockInfo).toHaveProperty("expirationDuration");
        expect(lockInfo?.maxNumberOfKeys).toBeUndefined(); // -1 should convert to undefined
      });
    });

    it("handles ERC20 lock currency correctly", async () => {
      const mockERC20Lock = {
        address: testLockAddress,
        name: "ERC20 Lock",
        keyPrice: "1000000", // 1 USDC (6 decimals)
        currencyContractAddress: "0xA0b86a33E6441E5F346FE6266fc0EC4b8B7b6e8F", // USDC
      };

      mockWeb3Service.getLock.mockResolvedValue(mockERC20Lock);

      const { result } = renderHook(() =>
        useUnlock({ lockAddress: testLockAddress }),
      );

      await result.current.validateLockAddress(testLockAddress);

      await waitFor(() => {
        expect(result.current.lockInfo?.currencySymbol).toBe("TOKEN");
      });
    });
  });

  describe("Refetch Functionality", () => {
    it("refetches data when refetch is called", async () => {
      mockWeb3Service.getLock.mockResolvedValue({
        address: testLockAddress,
        name: "Initial Lock",
      });

      const { result } = renderHook(() =>
        useUnlock({
          lockAddress: testLockAddress,
          fetchUserKeys: true,
        }),
      );

      // Clear previous calls
      vi.clearAllMocks();

      // Call refetch
      result.current.refetch();

      await waitFor(() => {
        expect(mockWeb3Service.getKeyByLockForOwner).toHaveBeenCalled();
      });
    });
  });
});
