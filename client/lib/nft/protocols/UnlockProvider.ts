// Note: Using simplified Unlock integration until proper SDK types are available
// import { Web3Service, SubGraph } from '@unlock-protocol/unlock-js';
import { createPublicClient, http, Chain } from 'viem';
import { mainnet, polygon, arbitrum, optimism, gnosis, base } from 'viem/chains';

export interface UnlockLock {
  id: string;
  address: string;
  name: string;
  symbol?: string;
  tokenAddress: string;
  price: string;
  expirationDuration: string;
  maxNumberOfKeys: string;
  outstandingKeys: string;
  version: string;
  createdAtBlock: string;
  lockManagers: string[];
  totalSupply: string;
  maxKeysPerAddress: string;
  metadata?: {
    name: string;
    description?: string;
    image?: string;
    external_url?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

export interface UnlockKey {
  id: string;
  tokenId: string;
  owner: string;
  manager?: string;
  expiration: string;
  cancelled: boolean;
  lock: UnlockLock;
  createdAtBlock: string;
  transactionsHash: string[];
}

export interface UnlockSearchResult {
  locks: UnlockLock[];
  keys: UnlockKey[];
  totalResults: number;
  hasNextPage: boolean;
  nextPageParam?: string;
}

// Supported networks for Unlock Protocol
const SUPPORTED_CHAINS: { [key: number]: Chain } = {
  1: mainnet,
  10: optimism,
  100: gnosis,
  137: polygon,
  8453: base,
  42161: arbitrum,
};

export class UnlockProvider {
  private chainId: number;
  private subgraphUrl: string;

  constructor(chainId: number = 1) {
    this.chainId = chainId;
    this.subgraphUrl = this.getSubgraphEndpoint(chainId);
  }

  /**
   * Get lock details by contract address (static method for protocol configs)
   */
  static async getLockDetails(lockAddress: string): Promise<UnlockLock | null> {
    try {
      const provider = new UnlockProvider();
      
      const query = `
        query GetLockDetails($lockAddress: String!) {
          locks(where: { address: $lockAddress }) {
            id
            address
            name
            symbol
            tokenAddress
            price
            expirationDuration
            maxNumberOfKeys
            outstandingKeys
            version
            createdAtBlock
            lockManagers
            totalSupply
            maxKeysPerAddress
          }
        }
      `;

      const data = await provider.executeGraphQLQuery(query, { lockAddress: lockAddress.toLowerCase() });
      
      if (!data?.locks || data.locks.length === 0) {
        return null;
      }

      const lock = data.locks[0];
      
      return {
        id: lock.id,
        address: lock.address,
        name: lock.name || 'Unnamed Lock',
        symbol: lock.symbol,
        tokenAddress: lock.tokenAddress,
        price: lock.price,
        expirationDuration: lock.expirationDuration,
        maxNumberOfKeys: lock.maxNumberOfKeys,
        outstandingKeys: lock.outstandingKeys,
        version: lock.version,
        createdAtBlock: lock.createdAtBlock,
        lockManagers: lock.lockManagers || [],
        totalSupply: lock.totalSupply,
        maxKeysPerAddress: lock.maxKeysPerAddress,
      };
    } catch (error) {
      console.error('Error fetching lock details:', error);
      return null;
    }
  }

  private getUnlockAddress(chainId: number): string {
    const addresses: { [key: number]: string } = {
      1: '0x3d5409CcE1d45233dE1D4eBDEe74b8E004abDD44', // Mainnet
      10: '0x99b1348a9129ac49c6de7F11245773dE2f51fB0c', // Optimism
      100: '0x14bb3586Ce2946E71B95Fe00Fc73dd30ed830863', // Gnosis Chain
      137: '0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f', // Polygon
      8453: '0xd0b14797b9D08493BD8e5244c9dad5851D775A9f', // Base
      42161: '0x54f4cce37c6d49c089e21163febe10a2aa3006a4', // Arbitrum One
    };
    
    return addresses[chainId] || addresses[1];
  }

  private getSubgraphEndpoint(chainId: number): string {
    const endpoints: { [key: number]: string } = {
      1: 'https://api.thegraph.com/subgraphs/name/unlock-protocol/unlock',
      10: 'https://api.thegraph.com/subgraphs/name/unlock-protocol/unlock-optimism',
      100: 'https://api.thegraph.com/subgraphs/name/unlock-protocol/unlock-xdai',
      137: 'https://api.thegraph.com/subgraphs/name/unlock-protocol/unlock-polygon',
      8453: 'https://api.thegraph.com/subgraphs/name/unlock-protocol/unlock-base',
      42161: 'https://api.thegraph.com/subgraphs/name/unlock-protocol/unlock-arbitrum',
    };
    
    return endpoints[chainId] || endpoints[1];
  }

  private async executeGraphQLQuery(query: string, variables: any = {}): Promise<any> {
    try {
      const response = await fetch(this.subgraphUrl, {
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
      console.error('Unlock GraphQL query error:', error);
      return null;
    }
  }

  /**
   * Search for Unlock locks by name or description
   */
  async searchLocks(
    query: string,
    options: {
      limit?: number;
      skip?: number;
      orderBy?: 'createdAtBlock' | 'totalSupply' | 'price';
      orderDirection?: 'asc' | 'desc';
      activeOnly?: boolean;
    } = {}
  ): Promise<UnlockSearchResult> {
    try {
      const {
        limit = 20,
        skip = 0,
        orderBy = 'createdAtBlock',
        orderDirection = 'desc',
        activeOnly = true
      } = options;

      const graphqlQuery = `
        query SearchLocks($first: Int!, $skip: Int!, $where: Lock_filter) {
          locks(first: $first, skip: $skip, where: $where, orderBy: ${orderBy}, orderDirection: ${orderDirection}) {
            id
            address
            name
            symbol
            tokenAddress
            keyPrice
            expirationDuration
            maxNumberOfKeys
            totalSupply
            version
            createdAtBlock
            lockManagers
            maxKeysPerAddress
          }
        }
      `;

      const where: any = {};
      if (activeOnly) {
        where.totalSupply_gt = '0';
      }

      const data = await this.executeGraphQLQuery(graphqlQuery, {
        first: limit,
        skip,
        where,
      });

      if (!data || !data.locks) {
        return {
          locks: [],
          keys: [],
          totalResults: 0,
          hasNextPage: false,
        };
      }

      // Filter by query text
      const filteredLocks = data.locks.filter((lock: any) => {
        if (!query) return true;
        const searchText = `${lock.name || ''} ${lock.symbol || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      // Convert to our format and fetch metadata
      const formattedLocks: UnlockLock[] = await Promise.all(
        filteredLocks.map(async (lock: any) => {
          let metadata;
          try {
            // Try to get lock metadata from Unlock's metadata service
            metadata = await this.getLockMetadata(lock.address);
          } catch (error) {
            console.error('Error fetching lock metadata:', error);
          }

          return {
            id: lock.id,
            address: lock.address,
            name: lock.name || 'Unknown Lock',
            symbol: lock.symbol,
            tokenAddress: lock.tokenAddress,
            price: lock.keyPrice,
            expirationDuration: lock.expirationDuration,
            maxNumberOfKeys: lock.maxNumberOfKeys,
            outstandingKeys: lock.totalSupply,
            version: lock.version,
            createdAtBlock: lock.createdAtBlock,
            lockManagers: lock.lockManagers || [],
            totalSupply: lock.totalSupply,
            maxKeysPerAddress: lock.maxKeysPerAddress || '1',
            metadata,
          };
        })
      );

      return {
        locks: formattedLocks,
        keys: [],
        totalResults: filteredLocks.length,
        hasNextPage: filteredLocks.length === limit,
        nextPageParam: filteredLocks.length === limit ? String(skip + limit) : undefined,
      };
    } catch (error) {
      console.error('Error searching Unlock locks:', error);
      return {
        locks: [],
        keys: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Get keys owned by a specific address
   */
  async getUserKeys(
    address: string,
    options: {
      limit?: number;
      skip?: number;
      activeOnly?: boolean;
    } = {}
  ): Promise<UnlockSearchResult> {
    try {
      const { limit = 20, skip = 0, activeOnly = true } = options;

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const graphqlQuery = `
        query GetUserKeys($owner: String!, $first: Int!, $skip: Int!, $currentTime: String!) {
          keys(
            where: { 
              owner: $owner
              ${activeOnly ? 'cancelled: false, expiration_gt: $currentTime' : ''}
            }
            first: $first
            skip: $skip
            orderBy: createdAtBlock
            orderDirection: desc
          ) {
            id
            tokenId
            owner
            manager
            expiration
            cancelled
            createdAtBlock
            transactionsHash
            lock {
              id
              address
              name
              symbol
              tokenAddress
              keyPrice
              expirationDuration
              maxNumberOfKeys
              totalSupply
              version
              createdAtBlock
              lockManagers
              maxKeysPerAddress
            }
          }
        }
      `;

      const data = await this.executeGraphQLQuery(graphqlQuery, {
        owner: address.toLowerCase(),
        first: limit,
        skip,
        currentTime: currentTimestamp.toString(),
      });

      if (!data || !data.keys) {
        return {
          locks: [],
          keys: [],
          totalResults: 0,
          hasNextPage: false,
        };
      }

      // Convert to our format
      const formattedKeys: UnlockKey[] = await Promise.all(
        data.keys.map(async (key: any) => {
          // Get lock metadata
          let lockMetadata;
          try {
            lockMetadata = await this.getLockMetadata(key.lock.address);
          } catch (error) {
            console.error('Error fetching lock metadata:', error);
          }

          const lock: UnlockLock = {
            id: key.lock.id,
            address: key.lock.address,
            name: key.lock.name || 'Unknown Lock',
            symbol: key.lock.symbol,
            tokenAddress: key.lock.tokenAddress,
            price: key.lock.keyPrice,
            expirationDuration: key.lock.expirationDuration,
            maxNumberOfKeys: key.lock.maxNumberOfKeys,
            outstandingKeys: key.lock.totalSupply,
            version: key.lock.version,
            createdAtBlock: key.lock.createdAtBlock,
            lockManagers: key.lock.lockManagers || [],
            totalSupply: key.lock.totalSupply,
            maxKeysPerAddress: key.lock.maxKeysPerAddress || '1',
            metadata: lockMetadata,
          };

          return {
            id: key.id,
            tokenId: key.tokenId,
            owner: key.owner,
            manager: key.manager,
            expiration: key.expiration,
            cancelled: key.cancelled,
            lock,
            createdAtBlock: key.createdAtBlock,
            transactionsHash: key.transactionsHash || [],
          };
        })
      );

      // Extract unique locks
      const locksMap = new Map<string, UnlockLock>();
      formattedKeys.forEach(key => {
        locksMap.set(key.lock.id, key.lock);
      });

      return {
        locks: Array.from(locksMap.values()),
        keys: formattedKeys,
        totalResults: formattedKeys.length,
        hasNextPage: formattedKeys.length === limit,
        nextPageParam: formattedKeys.length === limit ? String(skip + limit) : undefined,
      };
    } catch (error) {
      console.error('Error getting user keys:', error);
      return {
        locks: [],
        keys: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Check if user has a valid key for a specific lock
   */
  async userHasValidKey(address: string, lockAddress: string): Promise<boolean> {
    try {
      const userKeys = await this.getUserKeys(address, { limit: 100 });
      return userKeys.keys.some(key => 
        key.lock.address.toLowerCase() === lockAddress.toLowerCase() && 
        !key.cancelled &&
        parseInt(key.expiration) > Math.floor(Date.now() / 1000)
      );
    } catch (error) {
      console.error('Error checking if user has valid key:', error);
      return false;
    }
  }

  /**
   * Get specific lock details
   */
  async getLock(lockAddress: string): Promise<UnlockLock | null> {
    try {
      const graphqlQuery = `
        query GetLock($address: String!) {
          lock(id: $address) {
            id
            address
            name
            symbol
            tokenAddress
            keyPrice
            expirationDuration
            maxNumberOfKeys
            totalSupply
            version
            createdAtBlock
            lockManagers
            maxKeysPerAddress
          }
        }
      `;

      const data = await this.executeGraphQLQuery(graphqlQuery, {
        address: lockAddress.toLowerCase(),
      });

      if (!data || !data.lock) {
        return null;
      }

      const lock = data.lock;

      // Get metadata
      let metadata;
      try {
        metadata = await this.getLockMetadata(lockAddress);
      } catch (error) {
        console.error('Error fetching lock metadata:', error);
      }

      return {
        id: lock.id,
        address: lock.address,
        name: lock.name || 'Unknown Lock',
        symbol: lock.symbol,
        tokenAddress: lock.tokenAddress || '0x0000000000000000000000000000000000000000',
        price: lock.keyPrice || '0',
        expirationDuration: lock.expirationDuration || '0',
        maxNumberOfKeys: lock.maxNumberOfKeys || '0',
        outstandingKeys: lock.totalSupply || '0',
        version: lock.version || '0',
        createdAtBlock: lock.createdAtBlock || '0',
        lockManagers: lock.lockManagers || [],
        totalSupply: lock.totalSupply || '0',
        maxKeysPerAddress: lock.maxKeysPerAddress || '1',
        metadata,
      };
    } catch (error) {
      console.error('Error getting lock:', error);
      return null;
    }
  }

  /**
   * Get lock metadata from Unlock's metadata service
   */
  private async getLockMetadata(lockAddress: string): Promise<any> {
    try {
      const metadataResponse = await fetch(
        `https://locksmith.unlock-protocol.com/api/key/${lockAddress}/1`
      );
      
      if (metadataResponse.ok) {
        return await metadataResponse.json();
      }
    } catch (error) {
      console.error('Error fetching lock metadata from locksmith:', error);
    }

    return null;
  }

  /**
   * Get trending/popular locks based on activity
   */
  async getTrendingLocks(limit: number = 10): Promise<UnlockLock[]> {
    try {
      const result = await this.searchLocks('', {
        limit,
        orderBy: 'totalSupply',
        orderDirection: 'desc',
        activeOnly: true,
      });

      return result.locks;
    } catch (error) {
      console.error('Error getting trending locks:', error);
      return [];
    }
  }

  /**
   * Get locks by price range
   */
  async getLocksByPriceRange(
    minPrice: string,
    maxPrice: string,
    options: {
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<UnlockSearchResult> {
    try {
      const { limit = 20, skip = 0 } = options;

      // This would need to be implemented with a custom query
      // For now, get all locks and filter client-side
      const result = await this.searchLocks('', {
        limit: limit * 2, // Get more to filter
        skip,
      });

      const filteredLocks = result.locks.filter(lock => {
        const price = parseFloat(lock.price);
        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        return price >= min && price <= max;
      }).slice(0, limit);

      return {
        locks: filteredLocks,
        keys: [],
        totalResults: filteredLocks.length,
        hasNextPage: filteredLocks.length === limit,
        nextPageParam: filteredLocks.length === limit ? String(skip + limit) : undefined,
      };
    } catch (error) {
      console.error('Error getting locks by price range:', error);
      return {
        locks: [],
        keys: [],
        totalResults: 0,
        hasNextPage: false,
      };
    }
  }

  /**
   * Purchase a key for a lock (requires wallet connection)
   * Note: This would require proper web3 integration
   */
  async purchaseKey(
    lockAddress: string,
    keyPrice: string,
    recipient?: string
  ): Promise<string | null> {
    console.warn('Key purchase requires full web3 integration');
    return null;
  }

  /**
   * Get key expiration time
   */
  async getKeyExpiration(lockAddress: string, tokenId: string): Promise<Date | null> {
    try {
      const graphqlQuery = `
        query GetKeyExpiration($lockAddress: String!, $tokenId: String!) {
          key(id: "${lockAddress}-${tokenId}") {
            expiration
          }
        }
      `;

      const data = await this.executeGraphQLQuery(graphqlQuery, {
        lockAddress: lockAddress.toLowerCase(),
        tokenId,
      });

      if (data?.key?.expiration) {
        return new Date(parseInt(data.key.expiration) * 1000);
      }
      return null;
    } catch (error) {
      console.error('Error getting key expiration:', error);
      return null;
    }
  }
}

// Export singleton instances for supported chains
export const unlockProvider = new UnlockProvider(1); // Mainnet
export const unlockPolygonProvider = new UnlockProvider(137); // Polygon
export const unlockOptimismProvider = new UnlockProvider(10); // Optimism
export const unlockArbitrumProvider = new UnlockProvider(42161); // Arbitrum
export const unlockBaseProvider = new UnlockProvider(8453); // Base
export const unlockGnosisProvider = new UnlockProvider(100); // Gnosis

// Export function to create provider for specific chain
export const createUnlockProvider = (chainId: number) => new UnlockProvider(chainId);
