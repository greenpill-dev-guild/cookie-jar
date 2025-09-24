// Note: Using simplified POAP integration until proper SDK types are available
// import { PoapSDK, EventDTO, TokenDTO, PaginatedRequest } from '@poap-xyz/poap-sdk';

export interface POAPEvent {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  logo_url?: string;
  city?: string;
  country?: string;
  event_url?: string;
  start_date: string;
  end_date: string;
  supply: number;
  created_date: string;
  tags?: string;
  event_template_id?: number;
  private_event?: boolean;
}

export interface POAPToken {
  tokenId: string;
  owner: string;
  event: POAPEvent;
  created: string;
  supply?: number;
  chain: string;
}

export interface POAPSearchResult {
  events: POAPEvent[];
  tokens: POAPToken[];
  totalResults: number;
  hasNextPage: boolean;
  nextPageParam?: string;
}

export class POAPProvider {
  private apiKey: string;
  private baseUrl = 'https://api.poap.tech';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_POAP_API_KEY || '';
  }

  /**
   * Search for POAP events by name or description
   */
  async searchEvents(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'start_date' | 'created_date';
      sortDirection?: 'asc' | 'desc';
      from?: string; // Date string
      to?: string; // Date string
    } = {}
  ): Promise<POAPSearchResult> {
    try {
      const {
        limit = 20,
        offset = 0,
      } = options;

      // Use POAP API directly
      const response = await fetch(
        `${this.baseUrl}/events?limit=${limit}&offset=${offset}&name=${encodeURIComponent(query)}`,
        {
          headers: this.apiKey ? {
            'X-API-Key': this.apiKey,
          } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`POAP API error: ${response.status}`);
      }

      const data = await response.json();
      const events = Array.isArray(data) ? data : data.events || [];
      
      // Convert to POAPEvent format
      const formattedEvents: POAPEvent[] = events.map((event: any) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        image_url: event.image_url,
        logo_url: event.logo_url,
        city: event.city,
        country: event.country,
        event_url: event.event_url,
        start_date: event.start_date,
        end_date: event.end_date,
        supply: event.supply || 0,
        created_date: event.created_date,
        tags: event.tags,
        event_template_id: event.event_template_id,
        private_event: event.private_event,
      }));

      return {
        events: formattedEvents,
        tokens: [], // Events search doesn't return tokens directly
        totalResults: formattedEvents.length,
        hasNextPage: formattedEvents.length === limit,
        nextPageParam: formattedEvents.length === limit ? String(offset + limit) : undefined,
      };
    } catch (error) {
      console.error('Error searching POAP events:', error);
      return {
        events: [],
        tokens: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Get a single POAP event by ID
   */
  static async getEventById(eventId: string): Promise<POAPEvent | null> {
    try {
      const provider = new POAPProvider();
      const response = await fetch(`${provider.baseUrl}/events/id/${eventId}`, {
        headers: provider.apiKey ? {
          'X-API-Key': provider.apiKey,
        } : {},
      });

      if (!response.ok) {
        return null;
      }

      const event = await response.json();
      return {
        id: event.id,
        name: event.name,
        description: event.description,
        image_url: event.image_url,
        start_date: event.start_date,
        end_date: event.end_date,
        supply: event.supply,
        created_date: event.created_date || event.start_date,
      };
    } catch (error) {
      console.error('Error fetching POAP event:', error);
      return null;
    }
  }

  /**
   * Search for POAP events
   */
  static async searchEvents(query: string): Promise<POAPEvent[]> {
    try {
      const provider = new POAPProvider();
      const searchResult = await provider.searchEvents(query);
      return searchResult.events;
    } catch (error) {
      console.error('Error searching POAP events:', error);
      return [];
    }
  }

  /**
   * Get POAPs owned by a specific address
   */
  async getUserPOAPs(
    address: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<POAPSearchResult> {
    try {
      const { limit = 20, offset = 0 } = options;

      // Use POAP API directly
      const response = await fetch(
        `${this.baseUrl}/actions/scan/${address}?limit=${limit}&offset=${offset}`,
        {
          headers: this.apiKey ? {
            'X-API-Key': this.apiKey,
          } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`POAP API error: ${response.status}`);
      }

      const tokens = await response.json();
      const tokenArray = Array.isArray(tokens) ? tokens : [];
      
      // Convert to POAPToken format
      const formattedTokens: POAPToken[] = tokenArray.map((token: any) => ({
        tokenId: token.tokenId || token.id,
        owner: token.owner || address,
        event: {
          id: token.event?.id || 0,
          name: token.event?.name || 'Unknown Event',
          description: token.event?.description || '',
          image_url: token.event?.image_url,
          logo_url: token.event?.logo_url,
          city: token.event?.city,
          country: token.event?.country,
          event_url: token.event?.event_url,
          start_date: token.event?.start_date || '',
          end_date: token.event?.end_date || '',
          supply: token.event?.supply || 0,
          created_date: token.event?.created_date || '',
          tags: token.event?.tags,
          event_template_id: token.event?.event_template_id,
          private_event: token.event?.private_event,
        },
        created: token.created || '',
        supply: token.supply,
        chain: token.chain || 'ethereum',
      }));

      // Extract unique events from tokens
      const eventsMap = new Map<number, POAPEvent>();
      formattedTokens.forEach(token => {
        eventsMap.set(token.event.id, token.event);
      });

      return {
        events: Array.from(eventsMap.values()),
        tokens: formattedTokens,
        totalResults: formattedTokens.length,
        hasNextPage: formattedTokens.length === limit,
        nextPageParam: formattedTokens.length === limit ? String(offset + limit) : undefined,
      };
    } catch (error) {
      console.error('Error getting user POAPs:', error);
      return {
        events: [],
        tokens: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Get specific POAP event by ID
   */
  async getEvent(eventId: number): Promise<POAPEvent | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/events/id/${eventId}`,
        {
          headers: this.apiKey ? {
            'X-API-Key': this.apiKey,
          } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`POAP API error: ${response.status}`);
      }

      const event = await response.json();
      
      return {
        id: event.id,
        name: event.name,
        description: event.description,
        image_url: event.image_url,
        logo_url: event.logo_url,
        city: event.city,
        country: event.country,
        event_url: event.event_url,
        start_date: event.start_date,
        end_date: event.end_date,
        supply: event.supply || 0,
        created_date: event.created_date,
        tags: event.tags,
        event_template_id: event.event_template_id,
        private_event: event.private_event,
      };
    } catch (error) {
      console.error('Error getting POAP event:', error);
      return null;
    }
  }

  /**
   * Check if user has a specific POAP
   */
  async userHasEvent(address: string, eventId: number): Promise<boolean> {
    try {
      const userPOAPs = await this.getUserPOAPs(address, { limit: 100 });
      return userPOAPs.events.some(event => event.id === eventId);
    } catch (error) {
      console.error('Error checking if user has POAP:', error);
      return false;
    }
  }

  /**
   * Get trending/popular POAP events
   */
  async getTrendingEvents(limit: number = 10): Promise<POAPEvent[]> {
    try {
      // Get recent events with high supply as a proxy for trending
      const response = await fetch(
        `${this.baseUrl}/events?limit=${limit * 2}&offset=0`,
        {
          headers: this.apiKey ? {
            'X-API-Key': this.apiKey,
          } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`POAP API error: ${response.status}`);
      }

      const data = await response.json();
      const events = Array.isArray(data) ? data : data.events || [];
      
      const formattedEvents: POAPEvent[] = events
        .map((event: any) => ({
          id: event.id,
          name: event.name,
          description: event.description,
          image_url: event.image_url,
          logo_url: event.logo_url,
          city: event.city,
          country: event.country,
          event_url: event.event_url,
          start_date: event.start_date,
          end_date: event.end_date,
          supply: event.supply || 0,
          created_date: event.created_date,
          tags: event.tags,
          event_template_id: event.event_template_id,
          private_event: event.private_event,
        }))
        .sort((a: POAPEvent, b: POAPEvent) => b.supply - a.supply) // Sort by supply descending
        .slice(0, limit);

      return formattedEvents;
    } catch (error) {
      console.error('Error getting trending POAP events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const poapProvider = new POAPProvider();
