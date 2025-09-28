import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { WagmiProvider } from 'wagmi';
import React from 'react';
import config from '../../../config/wagmi.config';
import { usePOAPs, POAPEvent, UserPOAP } from '../../../hooks/nft/usePOAPs';

vi.mock('../../../lib/nft/protocols/POAPProvider', () => ({
  poapProvider: {
    getUserPOAPs: vi.fn(),
    getEvent: vi.fn(),
    searchEvents: vi.fn(),
    userHasEvent: vi.fn(),
  },
  POAPEvent: {},
  POAPToken: {},
}));

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: vi.fn(() => ({ 
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true 
    })),
    useChainId: vi.fn(() => 1),
  };
});

const mockPOAPEvents: POAPEvent[] = [
  {
    id: 12345,
    name: 'ETH Denver 2024',
    description: 'Attended ETH Denver 2024',
    image_url: 'https://example.com/poap1.png',
    start_date: '2024-02-01',
    end_date: '2024-02-04',
    supply: 5000,
    created_date: '2024-01-01',
    city: 'Denver',
    country: 'USA',
    event_url: 'https://ethdenver.com',
  },
  {
    id: 12346,
    name: 'Web3 Workshop NYC',
    description: 'Participated in Web3 development workshop',
    image_url: 'https://example.com/poap2.png',
    start_date: '2024-01-15',
    end_date: '2024-01-15',
    supply: 100,
    created_date: '2024-01-01',
    city: 'New York',
    country: 'USA',
    event_url: 'https://web3workshop.com',
  },
];

const mockUserPOAPs: UserPOAP[] = [
  {
    tokenId: '987654',
    owner: '0x1234567890123456789012345678901234567890',
    event: mockPOAPEvents[0],
    created: '2024-02-03T10:00:00Z',
    supply: 5000,
    chain: 'ethereum',
  },
  {
    tokenId: '987655',
    owner: '0x1234567890123456789012345678901234567890',
    event: mockPOAPEvents[1],
    created: '2024-01-15T14:30:00Z',
    supply: 100,
    chain: 'ethereum',
  },
];

const createWrapper = () => {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(WagmiProvider, { config: config as any }, children);
  };
};

describe('usePOAPs (Enhanced with Real SDK)', () => {
  beforeEach(() => {
    mockPoapProvider.getUserPOAPs.mockResolvedValue({
      events: mockPOAPEvents,
      tokens: mockUserPOAPs,
      totalResults: 2,
      hasNextPage: false,
    });
    
    mockPoapProvider.getEvent.mockImplementation((eventId: number) => {
      const event = mockPOAPEvents.find(e => e.id === eventId);
      return Promise.resolve(event || null);
    });
    
    mockPoapProvider.searchEvents.mockResolvedValue({
      events: mockPOAPEvents,
      tokens: [],
      totalResults: 2,
      hasNextPage: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePOAPs(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userPOAPs).toEqual([]);
      expect(result.current.eventInfo).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should accept configuration options', () => {
      const { result } = renderHook(() => usePOAPs({
        eventId: '12345',
        fetchUserPOAPs: false,
        withMetadata: true,
      }), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('user POAP fetching', () => {
    it('should fetch user POAPs when enabled', async () => {
      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPs).toHaveLength(2);
        expect(result.current.isLoadingUserPOAPs).toBe(false);
      });

      expect(mockPoapProvider.getUserPOAPs).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        { limit: 50 }
      );

      expect(result.current.userPOAPs[0]).toEqual(expect.objectContaining({
        tokenId: '987654',
        event: expect.objectContaining({
          id: 12345,
          name: 'ETH Denver 2024',
        }),
      }));
    });

    it('should handle user POAP fetch errors', async () => {
      mockPoapProvider.getUserPOAPs.mockRejectedValue(new Error('POAP API Error'));

      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPsError).toContain('Failed to fetch your POAP collection');
        expect(result.current.userPOAPs).toEqual([]);
      });
    });

    it('should use cache for repeated requests', async () => {
      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPs).toHaveLength(2);
      });

      // Clear the mock and refetch - should use cache
      vi.clearAllMocks();
      
      act(() => {
        result.current.refetch();
      });

      // Should not call API again due to cache
      expect(mockPoapProvider.getUserPOAPs).not.toHaveBeenCalled();
    });
  });

  describe('event information', () => {
    it('should fetch specific event information', async () => {
      const { result } = renderHook(() => usePOAPs({
        eventId: '12345',
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.eventInfo).toEqual(expect.objectContaining({
          id: 12345,
          name: 'ETH Denver 2024',
          description: 'Attended ETH Denver 2024',
        }));
        expect(result.current.isLoadingEvent).toBe(false);
      });

      expect(mockPoapProvider.getEvent).toHaveBeenCalledWith(12345);
    });

    it('should handle invalid event IDs', async () => {
      mockPoapProvider.getEvent.mockResolvedValue(null);

      const { result } = renderHook(() => usePOAPs({
        eventId: '99999',
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.eventError).toContain('Event not found or invalid');
        expect(result.current.eventInfo).toBeNull();
      });
    });

    it('should cache event information', async () => {
      const { result } = renderHook(() => usePOAPs({
        eventId: '12345',
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.eventInfo).toBeDefined();
      });

      // Re-render with same eventId - should use cache
      const { result: result2 } = renderHook(() => usePOAPs({
        eventId: '12345',
      }), {
        wrapper: createWrapper(),
      });

      // Should have event info immediately from cache
      expect(result2.current.eventInfo).toBeDefined();
    });
  });

  describe('event searching', () => {
    it('should search for events by query', async () => {
      const { result } = renderHook(() => usePOAPs(), {
        wrapper: createWrapper(),
      });

      const searchResults = await result.current.searchEvents('Denver');

      expect(searchResults).toHaveLength(2);
      expect(searchResults[0]).toEqual(expect.objectContaining({
        id: 12345,
        name: 'ETH Denver 2024',
      }));

      expect(mockPoapProvider.searchEvents).toHaveBeenCalledWith('Denver', {
        limit: 20,
        sortBy: 'start_date',
        sortDirection: 'desc',
      });
    });

    it('should handle search errors gracefully', async () => {
      mockPoapProvider.searchEvents.mockRejectedValue(new Error('Search Error'));

      const { result } = renderHook(() => usePOAPs(), {
        wrapper: createWrapper(),
      });

      const searchResults = await result.current.searchEvents('test');

      expect(searchResults).toEqual([]);
    });
  });

  describe('event validation', () => {
    it('should validate numeric event IDs', async () => {
      const { result } = renderHook(() => usePOAPs(), {
        wrapper: createWrapper(),
      });

      const validEvent = await result.current.validateEventId('12345');

      expect(validEvent).toEqual(expect.objectContaining({
        id: 12345,
        name: 'ETH Denver 2024',
      }));

      expect(mockPoapProvider.getEvent).toHaveBeenCalledWith(12345);
    });

    it('should reject non-numeric event IDs', async () => {
      const { result } = renderHook(() => usePOAPs(), {
        wrapper: createWrapper(),
      });

      const invalidEvent = await result.current.validateEventId('not-a-number');

      expect(invalidEvent).toBeNull();
      expect(mockPoapProvider.getEvent).not.toHaveBeenCalled();
    });
  });

  describe('ownership checking', () => {
    it('should check if user has specific POAP', () => {
      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      return waitFor(() => {
        expect(result.current.userPOAPs).toHaveLength(2);
      }).then(() => {
        const hasETHDenver = result.current.checkUserHasPOAP('12345');
        const hasNonExistent = result.current.checkUserHasPOAP('99999');

        expect(hasETHDenver).toBe(true);
        expect(hasNonExistent).toBe(false);
      });
    });
  });

  describe('loading states', () => {
    it('should manage loading states correctly', async () => {
      let resolveUserPOAPs: (value: any) => void;
      const userPOAPsPromise = new Promise((resolve) => {
        resolveUserPOAPs = resolve;
      });
      
      mockPoapProvider.getUserPOAPs.mockReturnValue(userPOAPsPromise);

      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoadingUserPOAPs).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      act(() => {
        resolveUserPOAPs({
          events: [],
          tokens: [],
          totalResults: 0,
          hasNextPage: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoadingUserPOAPs).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('refetch functionality', () => {
    it('should refetch user POAPs when requested', async () => {
      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPs).toHaveLength(2);
      });

      // Clear mocks and refetch
      vi.clearAllMocks();
      mockPoapProvider.getUserPOAPs.mockResolvedValue({
        events: [mockPOAPEvents[0]],
        tokens: [mockUserPOAPs[0]],
        totalResults: 1,
        hasNextPage: false,
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.userPOAPs).toHaveLength(1);
      });

      expect(mockPoapProvider.getUserPOAPs).toHaveBeenCalled();
    });

    it('should refetch event info when requested', async () => {
      const { result } = renderHook(() => usePOAPs({
        eventId: '12345',
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.eventInfo).toBeDefined();
      });

      // Update mock to return different data
      mockPoapProvider.getEvent.mockResolvedValue({
        ...mockPOAPEvents[0],
        name: 'Updated Event Name',
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.eventInfo?.name).toBe('Updated Event Name');
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockPoapProvider.getUserPOAPs.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPsError).toBeTruthy();
        expect(result.current.userPOAPs).toEqual([]);
        expect(result.current.isLoadingUserPOAPs).toBe(false);
      });
    });

    it('should separate user POAPs and event errors', async () => {
      mockPoapProvider.getUserPOAPs.mockRejectedValue(new Error('User POAPs Error'));
      mockPoapProvider.getEvent.mockRejectedValue(new Error('Event Info Error'));

      const { result } = renderHook(() => usePOAPs({
        eventId: '12345',
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPsError).toContain('Failed to fetch');
        expect(result.current.eventError).toContain('Event not found');
        expect(result.current.error).toBeTruthy(); // General error state
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty user POAP results', async () => {
      mockPoapProvider.getUserPOAPs.mockResolvedValue({
        events: [],
        tokens: [],
        totalResults: 0,
        hasNextPage: false,
      });

      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userPOAPs).toEqual([]);
        expect(result.current.userPOAPsError).toBeNull();
      });
    });

    it('should handle missing wallet connection', () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({ address: undefined, isConnected: false });

      const { result } = renderHook(() => usePOAPs({
        fetchUserPOAPs: true,
      }), {
        wrapper: createWrapper(),
      });

      // Should not attempt to fetch without address
      expect(result.current.userPOAPs).toEqual([]);
      expect(mockPoapProvider.getUserPOAPs).not.toHaveBeenCalled();
    });
  });
});
