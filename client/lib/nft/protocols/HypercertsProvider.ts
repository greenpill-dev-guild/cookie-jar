// Note: Using simplified Hypercerts integration until proper SDK types are available
// import { HypercertClient } from '@hypercerts-org/sdk';
import { WalletClient } from 'viem';

export interface HypercertClaim {
  id: string;
  tokenID: string;
  owner: string;
  totalUnits: string;
  contract: string;
  claim: {
    id: string;
    creation_block_number: string;
    creation_block_timestamp: string;
    creator: string;
    hypercert_id: string;
    last_update_block_number: string;
    last_update_block_timestamp: string;
    totalUnits: string;
    uri: string;
  };
  metadata?: {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    work_scope: string[];
    impact_scope: string[];
    work_timeframe: string;
    impact_timeframe: string;
    contributors: string[];
    rights: string[];
    version: string;
  };
}

export interface HypercertSearchResult {
  claims: HypercertClaim[];
  totalResults: number;
  hasNextPage: boolean;
  nextPageParam?: string;
}

export interface HypercertMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  work_scope: string[];
  impact_scope: string[];
  work_timeframe: string;
  impact_timeframe: string;
  contributors: string[];
  rights: string[];
  version: string;
  properties?: {
    [key: string]: any;
  };
}

export class HypercertsProvider {
  private chainId: number;
  private baseUrl: string;

  constructor(chainId: number = 11155111) { // Default to Sepolia testnet
    this.chainId = chainId;
    this.baseUrl = this.getGraphQLEndpoint(chainId);
  }

  private getGraphQLEndpoint(chainId: number): string {
    const endpoints: { [key: number]: string } = {
      1: 'https://api.thegraph.com/subgraphs/name/hypercerts/hypercerts-mainnet',
      11155111: 'https://api.thegraph.com/subgraphs/name/hypercerts/hypercerts-sepolia',
      10: 'https://api.thegraph.com/subgraphs/name/hypercerts/hypercerts-optimism',
    };
    
    return endpoints[chainId] || endpoints[11155111];
  }

  private async executeGraphQLQuery(query: string, variables: any = {}): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Hypercerts GraphQL query error:', error);
      return null;
    }
  }

  /**
   * Search for hypercerts by name, description, or work scope
   */
  async searchHypercerts(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'creation_block_timestamp' | 'totalUnits' | 'last_update_block_timestamp';
      orderDirection?: 'asc' | 'desc';
      workScope?: string[];
      impactScope?: string[];
      contributors?: string[];
    } = {}
  ): Promise<HypercertSearchResult> {
    try {
      const {
        limit = 20,
        offset = 0,
        orderBy = 'creation_block_timestamp',
        orderDirection = 'desc',
      } = options;

      // Build GraphQL query for searching claims
      const searchQuery = `
        query SearchClaims($first: Int!, $skip: Int!) {
          claims(
            first: $first
            skip: $skip
            orderBy: creation_block_timestamp
            orderDirection: desc
          ) {
            id
            creation_block_number
            creation_block_timestamp
            creator
            hypercert_id
            last_update_block_number
            last_update_block_timestamp
            totalUnits
            uri
            claimTokens {
              id
              tokenID
              owner
              totalUnits
            }
          }
        }
      `;

      const result = await this.executeGraphQLQuery(searchQuery, {
        first: limit,
        skip: offset,
      });

      if (!result || !result.claims) {
        return {
          claims: [],
          totalResults: 0,
          hasNextPage: false,
        };
      }

      // Process claims and fetch metadata
      const claims: HypercertClaim[] = await Promise.all(
        result.claims.map(async (claim: any) => {
          // Get the first claim token for this claim
          const claimToken = claim.claimTokens?.[0];
          
          // Fetch metadata from URI
          let metadata: HypercertMetadata | undefined;
          try {
            if (claim.uri) {
              const response = await fetch(claim.uri);
              if (response.ok) {
                metadata = await response.json();
              }
            }
          } catch (error) {
            console.error('Error fetching hypercert metadata:', error);
          }

          return {
            id: claimToken?.id || claim.id,
            tokenID: claimToken?.tokenID || '0',
            owner: claimToken?.owner || claim.creator,
            totalUnits: claimToken?.totalUnits || claim.totalUnits,
            contract: this.getContractAddress(),
            claim: {
              id: claim.id,
              creation_block_number: claim.creation_block_number,
              creation_block_timestamp: claim.creation_block_timestamp,
              creator: claim.creator,
              hypercert_id: claim.hypercert_id,
              last_update_block_number: claim.last_update_block_number,
              last_update_block_timestamp: claim.last_update_block_timestamp,
              totalUnits: claim.totalUnits,
              uri: claim.uri,
            },
            metadata,
          };
        })
      );

      // Filter by query text if metadata is available
      const filteredClaims = query
        ? claims.filter(claim => {
            const searchText = `
              ${claim.metadata?.name || ''}
              ${claim.metadata?.description || ''}
              ${claim.metadata?.work_scope?.join(' ') || ''}
              ${claim.metadata?.impact_scope?.join(' ') || ''}
              ${claim.metadata?.contributors?.join(' ') || ''}
            `.toLowerCase();
            return searchText.includes(query.toLowerCase());
          })
        : claims;

      return {
        claims: filteredClaims,
        totalResults: filteredClaims.length,
        hasNextPage: filteredClaims.length === limit,
        nextPageParam: filteredClaims.length === limit ? String(offset + limit) : undefined,
      };
    } catch (error) {
      console.error('Error searching hypercerts:', error);
      return {
        claims: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Get hypercerts owned by a specific address
   */
  async getUserHypercerts(
    address: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<HypercertSearchResult> {
    try {
      const { limit = 20, offset = 0 } = options;

      const graphqlQuery = `
        query GetUserHypercerts($owner: String!, $first: Int!, $skip: Int!) {
          claimTokens(where: { owner: $owner }, first: $first, skip: $skip) {
            id
            tokenID
            owner
            totalUnits
            claim {
              id
              creation_block_number
              creation_block_timestamp
              creator
              hypercert_id
              last_update_block_number
              last_update_block_timestamp
              totalUnits
              uri
            }
          }
        }
      `;

      const result = await this.executeGraphQLQuery(graphqlQuery, {
        owner: address.toLowerCase(),
        first: limit,
        skip: offset,
      });

      if (!result || !result.claimTokens) {
        return {
          claims: [],
          totalResults: 0,
          hasNextPage: false,
        };
      }

      // Convert to our format and fetch metadata
      const claims: HypercertClaim[] = await Promise.all(
        result.claimTokens.map(async (claimToken: any) => {
          let metadata: HypercertMetadata | undefined;
          try {
            if (claimToken.claim?.uri) {
              const response = await fetch(claimToken.claim.uri);
              if (response.ok) {
                metadata = await response.json();
              }
            }
          } catch (error) {
            console.error('Error fetching hypercert metadata:', error);
          }

          return {
            id: claimToken.id,
            tokenID: claimToken.tokenID,
            owner: claimToken.owner,
            totalUnits: claimToken.totalUnits,
            contract: this.getContractAddress(),
            claim: claimToken.claim,
            metadata,
          };
        })
      );

      return {
        claims,
        totalResults: claims.length,
        hasNextPage: claims.length === limit,
        nextPageParam: claims.length === limit ? String(offset + limit) : undefined,
      };
    } catch (error) {
      console.error('Error getting user hypercerts:', error);
      return {
        claims: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Check if user owns a specific hypercert
   */
  async userOwnsHypercert(address: string, hypercertId: string): Promise<boolean> {
    try {
      const userHypercerts = await this.getUserHypercerts(address);
      return userHypercerts.claims.some(claim => 
        claim.id === hypercertId || claim.claim.hypercert_id === hypercertId
      );
    } catch (error) {
      console.error('Error checking if user owns hypercert:', error);
      return false;
    }
  }

  /**
   * Get specific hypercert by ID
   */
  async getHypercert(hypercertId: string): Promise<HypercertClaim | null> {
    try {
      const graphqlQuery = `
        query GetHypercert($id: String!) {
          claimToken(id: $id) {
            id
            tokenID
            owner
            totalUnits
            claim {
              id
              creation_block_number
              creation_block_timestamp
              creator
              hypercert_id
              last_update_block_number
              last_update_block_timestamp
              totalUnits
              uri
            }
          }
        }
      `;

      const result = await this.executeGraphQLQuery(graphqlQuery, {
        id: hypercertId,
      });

      if (!result || !result.claimToken) {
        return null;
      }

      const claimToken = result.claimToken;

      // Fetch metadata
      let metadata: HypercertMetadata | undefined;
      try {
        if (claimToken.claim?.uri) {
          const response = await fetch(claimToken.claim.uri);
          if (response.ok) {
            metadata = await response.json();
          }
        }
      } catch (error) {
        console.error('Error fetching hypercert metadata:', error);
      }

      return {
        id: claimToken.id,
        tokenID: claimToken.tokenID,
        owner: claimToken.owner,
        totalUnits: claimToken.totalUnits,
        contract: this.getContractAddress(),
        claim: claimToken.claim,
        metadata,
      };
    } catch (error) {
      console.error('Error getting hypercert:', error);
      return null;
    }
  }

  /**
   * Get trending hypercerts based on recent activity
   */
  async getTrendingHypercerts(limit: number = 10): Promise<HypercertClaim[]> {
    try {
      const result = await this.searchHypercerts('', {
        limit,
        orderBy: 'last_update_block_timestamp',
        orderDirection: 'desc',
      });

      return result.claims;
    } catch (error) {
      console.error('Error getting trending hypercerts:', error);
      return [];
    }
  }

  /**
   * Get hypercerts by work scope (category)
   */
  async getHypercertsByWorkScope(
    workScope: string[],
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<HypercertSearchResult> {
    return this.searchHypercerts('', {
      ...options,
      workScope,
    });
  }

  /**
   * Get hypercerts by impact scope
   */
  async getHypercertsByImpactScope(
    impactScope: string[],
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<HypercertSearchResult> {
    return this.searchHypercerts('', {
      ...options,
      impactScope,
    });
  }

  private getContractAddress(): string {
    // Return the appropriate contract address for the current chain
    const contracts: { [key: number]: string } = {
      1: '0x822F17A9A5EeCFd66dBAFf7946a8071C265D1d07', // Mainnet (example)
      11155111: '0x16bA53B74c234C8371899E7d7C4D31e4c676320e', // Sepolia testnet (example)
      10: '0x822F17A9A5EeCFd66dBAFf7946a8071C265D1d07', // Optimism (example)
    };
    
    return contracts[this.chainId] || contracts[11155111];
  }

  /**
   * Create a new hypercert (requires wallet connection)
   * Note: This would require the full SDK integration with wallet support
   */
  async createHypercert(
    metadata: HypercertMetadata,
    totalUnits: bigint,
    transferRestriction: number = 0 // 0 = AllowAll, 1 = DisallowAll, 2 = FromCreatorOnly
  ): Promise<string | null> {
    console.warn('Hypercert creation requires full SDK integration with wallet support');
    return null;
  }
}

// Export singleton instance for Sepolia testnet by default
export const hypercertsProvider = new HypercertsProvider(11155111);

// Export function to create provider for specific chain
export const createHypercertsProvider = (chainId: number) => 
  new HypercertsProvider(chainId);
