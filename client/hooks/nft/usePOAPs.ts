import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
	type POAPToken,
	type POAPEvent as ProviderPOAPEvent,
	poapProvider,
} from "@/lib/nft/protocols/POAPProvider";

/**
 * POAP event information structure - extends the provider interface
 */
export interface POAPEvent extends ProviderPOAPEvent {
	/** Unique event identifier */
	id: number;
}

/**
 * User's POAP token data - extends the provider interface
 */
export interface UserPOAP extends POAPToken {
	/** Token ID of the POAP */
	tokenId: string;
	/** Event information */
	event: POAPEvent;
}

/**
 * Options for configuring the usePOAPs hook
 */
interface usePOAPsOptions {
	/** Specific event ID to filter by */
	eventId?: string;
	/** Whether to fetch user's POAPs automatically */
	fetchUserPOAPs?: boolean;
	/** Whether to include metadata */
	withMetadata?: boolean;
}

/**
 * Return type for usePOAPs hook
 */
interface usePOAPsResult {
	/** Array of user's POAP tokens */
	userPOAPs: UserPOAP[];
	/** Event information (if eventId provided) */
	eventInfo: POAPEvent | null;
	/** Overall loading state */
	isLoading: boolean;
	/** Loading state for event information */
	isLoadingEvent: boolean;
	/** Loading state for user POAPs */
	isLoadingUserPOAPs: boolean;
	/** General error state */
	error: string | null;
	/** Error specific to event fetching */
	eventError: string | null;
	/** Error specific to user POAP fetching */
	userPOAPsError: string | null;
	/** Function to search for events */
	searchEvents: (query: string) => Promise<POAPEvent[]>;
	/** Function to validate an event ID */
	validateEventId: (eventId: string) => Promise<POAPEvent | null>;
	/** Function to check if user has a specific POAP */
	checkUserHasPOAP: (eventId: string) => boolean;
	/** Function to refetch all data */
	refetch: () => void;
}

// Cache for POAP data to avoid repeated API calls
const eventCache = new Map<string, POAPEvent>();
const userPOAPCache = new Map<
	string,
	{ data: UserPOAP[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for POAP (Proof of Attendance Protocol) integration
 *
 * Provides comprehensive POAP functionality including event validation,
 * attendance verification, and collection management. Uses the POAP SDK
 * for reliable event data and user POAP fetching.
 *
 * Features:
 * - Event information and validation
 * - User POAP collection fetching
 * - Attendance verification
 * - Event search functionality
 * - Cached data with configurable refresh
 * - Error handling and retry logic
 *
 * @param options - Configuration options for POAP functionality
 * @returns Object with POAP data, event info, and utility functions
 *
 * @example
 * ```tsx
 * const {
 *   userPOAPs,
 *   eventInfo,
 *   checkUserHasPOAP,
 *   searchEvents,
 *   isLoading
 * } = usePOAPs({
 *   eventId: '12345',
 *   fetchUserPOAPs: true,
 *   withMetadata: true
 * });
 *
 * if (isLoading) return <div>Loading POAPs...</div>;
 *
 * return (
 *   <div>
 *     {eventInfo && (
 *       <div>
 *         <h2>{eventInfo.name}</h2>
 *         <p>Has POAP: {checkUserHasPOAP(eventInfo.id) ? '✅' : '❌'}</p>
 *       </div>
 *     )}
 *     <div className="poap-grid">
 *       {userPOAPs.map(poap => (
 *         <POAPCard key={poap.tokenId} poap={poap} />
 *       ))}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function usePOAPs(options: usePOAPsOptions = {}): usePOAPsResult {
	const { address: userAddress } = useAccount();
	const _chainId = useChainId();
	const [userPOAPs, setUserPOAPs] = useState<UserPOAP[]>([]);
	const [eventInfo, setEventInfo] = useState<POAPEvent | null>(null);
	const [isLoadingUserPOAPs, setIsLoadingUserPOAPs] = useState(false);
	const [isLoadingEvent, setIsLoadingEvent] = useState(false);
	const [userPOAPsError, setUserPOAPsError] = useState<string | null>(null);
	const [eventError, setEventError] = useState<string | null>(null);

	const isLoading = isLoadingUserPOAPs || isLoadingEvent;
	const error = userPOAPsError || eventError;

	// Fetch user's POAPs
	const fetchUserPOAPs = async (address: string) => {
		setIsLoadingUserPOAPs(true);
		setUserPOAPsError(null);

		try {
			// Check cache first
			const cached = userPOAPCache.get(address);
			if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
				setUserPOAPs(cached.data);
				setIsLoadingUserPOAPs(false);
				return;
			}

			const result = await poapProvider.getUserPOAPs(address, {
				limit: 50, // Get more POAPs for better UX
			});

			// Convert to hook format
			const userPOAPs: UserPOAP[] = result.tokens.map((token) => ({
				...token,
				event: {
					...token.event,
					id: token.event.id,
				} as POAPEvent,
			}));

			// Cache the results
			userPOAPCache.set(address, {
				data: userPOAPs,
				timestamp: Date.now(),
			});

			setUserPOAPs(userPOAPs);
		} catch (error) {
			console.error("Error fetching user POAPs:", error);
			setUserPOAPsError(
				"Failed to fetch your POAP collection. Please check your API key.",
			);
		} finally {
			setIsLoadingUserPOAPs(false);
		}
	};

	// Fetch specific event information
	const fetchEventInfo = async (eventId: string) => {
		setIsLoadingEvent(true);
		setEventError(null);

		try {
			// Check cache first
			const cached = eventCache.get(eventId);
			if (cached) {
				setEventInfo(cached);
				setIsLoadingEvent(false);
				return;
			}

			const event = await poapProvider.getEvent(parseInt(eventId, 10));

			if (!event) {
				throw new Error("Event not found");
			}

			const poapEvent = event as POAPEvent;
			eventCache.set(eventId, poapEvent);
			setEventInfo(poapEvent);
		} catch (error) {
			console.error("Error fetching event info:", error);
			setEventError("Event not found or invalid");
			setEventInfo(null);
		} finally {
			setIsLoadingEvent(false);
		}
	};

	// Search for events
	const searchEvents = async (query: string): Promise<POAPEvent[]> => {
		try {
			const result = await poapProvider.searchEvents(query, {
				limit: 20,
				sortBy: "start_date",
				sortDirection: "desc",
			});

			return result.events as POAPEvent[];
		} catch (error) {
			console.error("Error searching events:", error);
			return [];
		}
	};

	// Validate specific event ID
	const validateEventId = async (
		eventId: string,
	): Promise<POAPEvent | null> => {
		try {
			if (!/^\d+$/.test(eventId)) {
				throw new Error("Event ID must be numeric");
			}

			const event = await poapProvider.getEvent(parseInt(eventId, 10));
			return (event as POAPEvent) || null;
		} catch (error) {
			console.error("Error validating event ID:", error);
			return null;
		}
	};

	// Check if user has POAP from specific event
	const checkUserHasPOAP = (eventId: string): boolean => {
		const numericEventId = parseInt(eventId, 10);
		return userPOAPs.some((poap) => poap.event.id === numericEventId);
	};

	// Refetch all data
	const refetch = () => {
		if (userAddress && options.fetchUserPOAPs) {
			fetchUserPOAPs(userAddress);
		}
		if (options.eventId) {
			fetchEventInfo(options.eventId);
		}
	};

	// Effect to fetch data on mount and when dependencies change
	useEffect(() => {
		if (userAddress && options.fetchUserPOAPs) {
			fetchUserPOAPs(userAddress);
		}
	}, [userAddress, options.fetchUserPOAPs, fetchUserPOAPs]);

	useEffect(() => {
		if (options.eventId) {
			fetchEventInfo(options.eventId);
		}
	}, [options.eventId, fetchEventInfo]);

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
		refetch,
	};
}
