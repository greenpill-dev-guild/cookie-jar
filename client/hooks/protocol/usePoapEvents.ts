import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getProtocolAddress } from '@/config/protocol-addresses'

// POAP SDK types (real implementation would import from @poap-xyz/poap-sdk)
interface POAPEvent {
  id: string
  name: string
  description: string
  image_url?: string
  start_date?: string
  end_date?: string
  supply?: number
  created_date?: string
}

interface UserPOAP {
  event: POAPEvent
  tokenId: string
  created: string
}

interface UsePOAPEventsOptions {
  /** Specific event ID to filter by */
  eventId?: string
  /** Whether to fetch user's POAPs automatically */
  fetchUserPOAPs?: boolean
  /** Whether to include metadata */
  withMetadata?: boolean
}

interface UsePOAPEventsResult {
  /** User's POAP tokens */
  userPOAPs: UserPOAP[]
  /** Event information (if eventId provided) */
  eventInfo: POAPEvent | null
  /** Loading states */
  isLoading: boolean
  isLoadingEvent: boolean
  isLoadingUserPOAPs: boolean
  /** Error states */
  error: string | null
  eventError: string | null
  userPOAPsError: string | null
  /** Actions */
  searchEvents: (query: string) => Promise<POAPEvent[]>
  validateEventId: (eventId: string) => Promise<POAPEvent | null>
  checkUserHasPOAP: (eventId: string) => boolean
  refetch: () => void
}

// Cache for POAP data to avoid repeated API calls
const eventCache = new Map<string, POAPEvent>()
const userPOAPCache = new Map<string, { data: UserPOAP[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function usePoapEvents(options: UsePOAPEventsOptions = {}): UsePOAPEventsResult {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const [userPOAPs, setUserPOAPs] = useState<UserPOAP[]>([])
  const [eventInfo, setEventInfo] = useState<POAPEvent | null>(null)
  const [isLoadingUserPOAPs, setIsLoadingUserPOAPs] = useState(false)
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [userPOAPsError, setUserPOAPsError] = useState<string | null>(null)
  const [eventError, setEventError] = useState<string | null>(null)

  const isLoading = isLoadingUserPOAPs || isLoadingEvent
  const error = userPOAPsError || eventError

  // Fetch user's POAPs
  const fetchUserPOAPs = async (address: string) => {
    setIsLoadingUserPOAPs(true)
    setUserPOAPsError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would use POAP SDK:
      // import { PoapSDK } from '@poap-xyz/poap-sdk'
      // const sdk = new PoapSDK()
      // const poaps = await sdk.getUserPOAPs(address)
      
      // Mock data for demonstration
      const mockUserPOAPs: UserPOAP[] = [
        {
          event: {
            id: '12345',
            name: 'ETH Denver 2024',
            description: 'Attended ETH Denver 2024',
            image_url: 'https://example.com/poap1.png',
            start_date: '2024-02-01',
            supply: 5000
          },
          tokenId: '987654',
          created: '2024-02-03T10:00:00Z'
        },
        {
          event: {
            id: '12346',
            name: 'Web3 Workshop NYC',
            description: 'Participated in Web3 development workshop',
            image_url: 'https://example.com/poap2.png', 
            start_date: '2024-01-15',
            supply: 100
          },
          tokenId: '987655',
          created: '2024-01-15T14:30:00Z'
        }
      ]

      setUserPOAPs(mockUserPOAPs)
    } catch (error) {
      console.error('Error fetching user POAPs:', error)
      setUserPOAPsError('Failed to fetch your POAP collection')
    } finally {
      setIsLoadingUserPOAPs(false)
    }
  }

  // Fetch specific event information
  const fetchEventInfo = async (eventId: string) => {
    setIsLoadingEvent(true)
    setEventError(null)

    try {
      // Note: This is a mock implementation
      // Real implementation would use POAP SDK:
      // const event = await sdk.getEvent(eventId)
      
      const mockEvent: POAPEvent = {
        id: eventId,
        name: `Event #${eventId}`,
        description: 'Community event POAP',
        start_date: '2024-01-01',
        supply: 1000,
        created_date: '2024-01-01'
      }
      
      setEventInfo(mockEvent)
    } catch (error) {
      console.error('Error fetching event info:', error)
      setEventError('Event not found or invalid')
      setEventInfo(null)
    } finally {
      setIsLoadingEvent(false)
    }
  }

  // Search for events
  const searchEvents = async (query: string): Promise<POAPEvent[]> => {
    try {
      // Note: This is a mock implementation
      // Real implementation would use POAP SDK search
      
      const mockResults: POAPEvent[] = [
        {
          id: '12345',
          name: `${query} Conference 2024`,
          description: 'Annual blockchain conference',
          image_url: 'https://example.com/event1.png',
          start_date: '2024-03-15',
          supply: 500
        },
        {
          id: '12346',
          name: `${query} Workshop`,
          description: 'Technical workshop on DeFi',
          image_url: 'https://example.com/event2.png',
          start_date: '2024-04-01',
          supply: 100
        }
      ]
      
      return mockResults
    } catch (error) {
      console.error('Error searching events:', error)
      return []
    }
  }

  // Validate specific event ID
  const validateEventId = async (eventId: string): Promise<POAPEvent | null> => {
    try {
      // Note: Mock implementation - real would call POAP API
      if (!/^\d+$/.test(eventId)) {
        throw new Error('Event ID must be numeric')
      }

      const mockEvent: POAPEvent = {
        id: eventId,
        name: `Event #${eventId}`,
        description: 'Valid POAP event',
        start_date: '2024-01-01',
        supply: 1000
      }
      
      return mockEvent
    } catch (error) {
      console.error('Error validating event ID:', error)
      return null
    }
  }

  // Check if user has POAP from specific event
  const checkUserHasPOAP = (eventId: string): boolean => {
    return userPOAPs.some(poap => poap.event.id === eventId)
  }

  // Refetch all data
  const refetch = () => {
    if (userAddress && options.fetchUserPOAPs) {
      fetchUserPOAPs(userAddress)
    }
    if (options.eventId) {
      fetchEventInfo(options.eventId)
    }
  }

  // Effect to fetch data on mount and when dependencies change
  useEffect(() => {
    if (userAddress && options.fetchUserPOAPs) {
      fetchUserPOAPs(userAddress)
    }
  }, [userAddress, options.fetchUserPOAPs])

  useEffect(() => {
    if (options.eventId) {
      fetchEventInfo(options.eventId)
    }
  }, [options.eventId])

  return {
    userPOAPs,
    eventInfo,
    isLoading,
    isLoadingEvent,
    isLoadingUserPOAPs,
    error,
    eventError,
    userPOAPsError,
    searchEvents,
    validateEventId,
    checkUserHasPOAP,
    refetch
  }
}
