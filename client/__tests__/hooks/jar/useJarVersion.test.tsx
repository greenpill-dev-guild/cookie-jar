import { renderHook, waitFor } from '@testing-library/react';
import type { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useIsV2Jar,
  useJarFeatures,
  useJarVersion,
} from '@/hooks/jar/useJarVersion';

// Mock wagmi
const mockReadContract = vi.fn();
const mockGetCode = vi.fn();
const mockPublicClient = {
  readContract: mockReadContract,
  getCode: mockGetCode,
};

vi.mock('wagmi', () => ({
  usePublicClient: () => mockPublicClient,
}));

// Test wrapper component for React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useJarVersion', () => {
  const mockJarAddress =
    '0x1234567890123456789012345678901234567890' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('v2 jar detection', () => {
    it('should detect v2 jar when getSuperfluidConfig exists', async () => {
      mockReadContract.mockResolvedValueOnce({
        superfluidEnabled: true,
        autoAcceptStreams: false,
        acceptedSuperTokens: [],
        minFlowRate: 1000000000000000000n,
        useDistributionPool: false,
        distributionPool: '0x0000000000000000000000000000000000000000',
      });

      const { result } = renderHook(() => useJarVersion(mockJarAddress), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version).toBe('v2');
      expect(result.current.hasStreamingSupport).toBe(true);
      expect(result.current.hasSuperfluidSupport).toBe(true);
      expect(result.current.hasMultiTokenSupport).toBe(true);
      expect(result.current.error).toBeUndefined();
    });

    it('should detect v2 jar when multiTokenConfig exists but Superfluid does not', async () => {
      // First call fails (Superfluid doesn't exist)
      mockReadContract.mockRejectedValueOnce(new Error('Function not found'));

      // Second call succeeds (multiTokenConfig exists)
      mockReadContract.mockResolvedValueOnce({
        enabled: false,
        maxSlippagePercent: 500n,
        minSwapAmount: 0n,
        defaultFee: 3000n,
      });

      const { result } = renderHook(() => useJarVersion(mockJarAddress), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version).toBe('v2');
      expect(result.current.hasStreamingSupport).toBe(true);
      expect(result.current.hasSuperfluidSupport).toBe(true);
      expect(result.current.hasMultiTokenSupport).toBe(true);
    });
  });

  describe('v1 jar detection', () => {
    it('should detect v1 jar when neither function exists', async () => {
      // Both calls fail - v1 jar
      mockReadContract.mockRejectedValue(new Error('Function not found'));

      const { result } = renderHook(() => useJarVersion(mockJarAddress), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version).toBe('v1');
      expect(result.current.hasStreamingSupport).toBe(false);
      expect(result.current.hasSuperfluidSupport).toBe(false);
      expect(result.current.hasMultiTokenSupport).toBe(false);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockReadContract.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useJarVersion(mockJarAddress), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version).toBe('v1'); // Fallback to v1 on error
      expect(result.current.error).toBeUndefined(); // Errors are handled internally
    });

    it('should handle missing jar address', async () => {
      const { result } = renderHook(() => useJarVersion('' as Address), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.version).toBe('unknown');
    });
  });

  describe('loading states', () => {
    it('should show loading state during detection', async () => {
      let resolvePromise: (value: any) => void = () => {};
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockReadContract.mockReturnValue(mockPromise);

      const { result } = renderHook(() => useJarVersion(mockJarAddress), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.version).toBe('unknown');

      // Resolve the promise
      resolvePromise?.({
        superfluidEnabled: true,
        autoAcceptStreams: false,
        acceptedSuperTokens: [],
        minFlowRate: 1000000000000000000n,
        useDistributionPool: false,
        distributionPool: '0x0000000000000000000000000000000000000000',
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version).toBe('v2');
    });
  });
});

describe('useIsV2Jar', () => {
  const mockJarAddress =
    '0x1234567890123456789012345678901234567890' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for v2 jars', async () => {
    mockReadContract.mockResolvedValue({
      superfluidEnabled: true,
      autoAcceptStreams: false,
      acceptedSuperTokens: [],
      minFlowRate: 1000000000000000000n,
      useDistributionPool: false,
      distributionPool: '0x0000000000000000000000000000000000000000',
    });

    const { result } = renderHook(() => useIsV2Jar(mockJarAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false for v1 jars', async () => {
    mockReadContract.mockRejectedValue(new Error('Function not found'));

    const { result } = renderHook(() => useIsV2Jar(mockJarAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('useJarFeatures', () => {
  const mockJarAddress =
    '0x1234567890123456789012345678901234567890' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct feature flags for v2 jars', async () => {
    mockReadContract.mockResolvedValue({
      superfluidEnabled: true,
      autoAcceptStreams: false,
      acceptedSuperTokens: [],
      minFlowRate: 1000000000000000000n,
      useDistributionPool: false,
      distributionPool: '0x0000000000000000000000000000000000000000',
    });

    const { result } = renderHook(() => useJarFeatures(mockJarAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.streaming).toBe(true);
    expect(result.current.superfluid).toBe(true);
    expect(result.current.multiToken).toBe(true);
  });

  it('should return correct feature flags for v1 jars', async () => {
    mockReadContract.mockRejectedValue(new Error('Function not found'));

    const { result } = renderHook(() => useJarFeatures(mockJarAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.streaming).toBe(false);
    expect(result.current.superfluid).toBe(false);
    expect(result.current.multiToken).toBe(false);
  });

  it('should handle loading states', async () => {
    let resolvePromise: (value: any) => void = () => {};
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockReadContract.mockReturnValue(mockPromise);

    const { result } = renderHook(() => useJarFeatures(mockJarAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.streaming).toBe(false);

    // Resolve the promise
    resolvePromise?.({
      superfluidEnabled: true,
      autoAcceptStreams: false,
      acceptedSuperTokens: [],
      minFlowRate: 1000000000000000000n,
      useDistributionPool: false,
      distributionPool: '0x0000000000000000000000000000000000000000',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.streaming).toBe(true);
  });
});

describe('Integration tests', () => {
  const mockJarAddress =
    '0x1234567890123456789012345678901234567890' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work consistently across all hooks', async () => {
    // Mock v2 jar with Superfluid
    mockReadContract.mockResolvedValue({
      superfluidEnabled: true,
      autoAcceptStreams: false,
      acceptedSuperTokens: [],
      minFlowRate: 1000000000000000000n,
      useDistributionPool: false,
      distributionPool: '0x0000000000000000000000000000000000000000',
    });

    const versionResult = renderHook(() => useJarVersion(mockJarAddress), {
      wrapper: createWrapper(),
    });

    const isV2Result = renderHook(() => useIsV2Jar(mockJarAddress), {
      wrapper: createWrapper(),
    });

    const featuresResult = renderHook(() => useJarFeatures(mockJarAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(versionResult.result.current.isLoading).toBe(false);
      expect(featuresResult.result.current.isLoading).toBe(false);
    });

    // All hooks should agree
    expect(versionResult.result.current.version).toBe('v2');
    expect(isV2Result.result.current).toBe(true);
    expect(featuresResult.result.current.streaming).toBe(true);
    expect(featuresResult.result.current.superfluid).toBe(true);
    expect(featuresResult.result.current.multiToken).toBe(true);
  });
});
