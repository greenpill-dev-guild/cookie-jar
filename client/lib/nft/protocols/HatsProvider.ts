// Note: Using simplified Hats integration until proper SDK types are available
// import { HatsSubgraphClient, Hat, Tree, Wearer } from '@hatsprotocol/sdk-v1-subgraph';
import type { Chain } from "viem";
import { arbitrum, gnosis, mainnet, optimism, polygon } from "viem/chains";
import { log } from "@/lib/app/logger";

export interface HatDetails {
	id: string;
	prettyId: string;
	status: boolean;
	createdAt: string;
	details: string;
	maxSupply: string;
	eligibility: string;
	toggle: string;
	mutable: boolean;
	imageUri: string;
	levelAtLocalTree: number;
	currentSupply: string;
	tree: {
		id: string;
		domain: string;
		requestType: string;
	};
	admin?: HatDetails;
	wearers: Array<{
		id: string;
		currentHats: HatDetails[];
	}>;
	subHats: HatDetails[];
}

export interface HatWearer {
	id: string;
	address: string;
	hats: HatDetails[];
	mintEvent?: {
		id: string;
		timestamp: string;
		transactionID: string;
	};
}

export interface HatsSearchResult {
	hats: HatDetails[];
	trees: any[];
	wearers: HatWearer[];
	totalResults: number;
	hasNextPage: boolean;
	nextPageParam?: string;
}

// Support multiple chains for Hats Protocol
const _SUPPORTED_CHAINS: { [key: number]: Chain } = {
	1: mainnet,
	10: optimism,
	100: gnosis,
	137: polygon,
	42161: arbitrum,
};

export class HatsProvider {
	private chainId: number;

	constructor(chainId: number = 1) {
		this.chainId = chainId;
	}

	/**
	 * Get a single hat by ID (static method for protocol configs)
	 */
	static async getHatById(
		hatId: string,
		_contractAddress?: string,
	): Promise<HatDetails | null> {
		try {
			const provider = new HatsProvider();

			const query = `
        query GetHatById($hatId: ID!) {
          hat(id: $hatId) {
            id
            prettyId
            status
            createdAt
            details
            maxSupply
            eligibility
            toggle
            mutable
            imageUri
            levelAtLocalTree
            currentSupply
            tree {
              id
              domain
              requestType
            }
            wearers {
              id
            }
          }
        }
      `;

			const data = await provider.executeGraphQLQuery(query, { hatId });

			if (!data?.hat) {
				return null;
			}

			const hat = data.hat;
			return {
				id: hat.id,
				prettyId: hat.prettyId,
				status: hat.status,
				createdAt: hat.createdAt,
				details: hat.details,
				maxSupply: hat.maxSupply,
				eligibility: hat.eligibility,
				toggle: hat.toggle,
				mutable: hat.mutable,
				imageUri: hat.imageUri,
				levelAtLocalTree: hat.levelAtLocalTree,
				currentSupply: hat.currentSupply,
				tree: hat.tree,
				wearers: hat.wearers || [],
				subHats: [], // Not needed for single hat lookup
			};
		} catch (error) {
			log.error("Error fetching hat by ID", { error, hatId });
			return null;
		}
	}

	private getSubgraphEndpoint(chainId: number): string {
		const endpoints: { [key: number]: string } = {
			1: "https://api.thegraph.com/subgraphs/name/hats-protocol/hats-v1",
			10: "https://api.thegraph.com/subgraphs/name/hats-protocol/hats-v1-optimism",
			100: "https://api.thegraph.com/subgraphs/name/hats-protocol/hats-v1-gnosis",
			137: "https://api.thegraph.com/subgraphs/name/hats-protocol/hats-v1-polygon",
			42161:
				"https://api.thegraph.com/subgraphs/name/hats-protocol/hats-v1-arbitrum-one",
		};

		return endpoints[chainId] || endpoints[1];
	}

	private async executeGraphQLQuery(
		query: string,
		variables: any = {},
	): Promise<any> {
		try {
			const endpoint = this.getSubgraphEndpoint(this.chainId);
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
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
			log.error("GraphQL query error", { error, query });
			return null;
		}
	}

	/**
	 * Search for hats by name or description
	 */
	async searchHats(
		query: string,
		_chainId: number = 1,
		options: {
			limit?: number;
			skip?: number;
			activeOnly?: boolean;
			includeSubHats?: boolean;
		} = {},
	): Promise<HatsSearchResult> {
		try {
			const { limit = 20, skip = 0, activeOnly = true } = options;

			const graphqlQuery = `
        query SearchHats($first: Int!, $skip: Int!, $where: Hat_filter) {
          hats(first: $first, skip: $skip, where: $where, orderBy: createdAt, orderDirection: desc) {
            id
            prettyId
            status
            createdAt
            details
            maxSupply
            eligibility
            toggle
            mutable
            imageUri
            levelAtLocalTree
            currentSupply
            tree {
              id
              domain
              requestType
            }
          }
        }
      `;

			const where: any = {};
			if (activeOnly) {
				where.status = true;
			}

			const data = await this.executeGraphQLQuery(graphqlQuery, {
				first: limit,
				skip,
				where,
			});

			if (!data || !data.hats) {
				return {
					hats: [],
					trees: [],
					wearers: [],
					totalResults: 0,
					hasNextPage: false,
				};
			}

			// Filter results by query (client-side filtering)
			const filteredHats = data.hats.filter((hat: any) => {
				const searchText =
					`${hat.details || ""} ${hat.id} ${hat.prettyId || ""}`.toLowerCase();
				return !query || searchText.includes(query.toLowerCase());
			});

			// Convert to our format
			const formattedHats: HatDetails[] = filteredHats.map((hat: any) => ({
				id: hat.id,
				prettyId: hat.prettyId || hat.id,
				status: hat.status,
				createdAt: hat.createdAt,
				details: hat.details || "",
				maxSupply: hat.maxSupply,
				eligibility: hat.eligibility || "",
				toggle: hat.toggle || "",
				mutable: hat.mutable || false,
				imageUri: hat.imageUri || "",
				levelAtLocalTree: hat.levelAtLocalTree || 0,
				currentSupply: hat.currentSupply || "0",
				tree: {
					id: hat.tree?.id || "",
					domain: hat.tree?.domain || "",
					requestType: hat.tree?.requestType || "",
				},
				wearers: [],
				subHats: [],
			}));

			return {
				hats: formattedHats,
				trees: [],
				wearers: [],
				totalResults: filteredHats.length,
				hasNextPage: filteredHats.length === limit,
				nextPageParam:
					filteredHats.length === limit ? String(skip + limit) : undefined,
			};
		} catch (error) {
			log.error("Error searching hats", { error, query });
			return {
				hats: [],
				trees: [],
				wearers: [],
				totalResults: 0,
				hasNextPage: false,
			};
		}
	}

	/**
	 * Get hats worn by a specific address
	 */
	async getUserHats(
		address: string,
		_chainId: number = 1,
		options: {
			limit?: number;
			skip?: number;
			activeOnly?: boolean;
		} = {},
	): Promise<HatsSearchResult> {
		try {
			const { limit = 20, activeOnly = true } = options;

			const graphqlQuery = `
        query GetUserHats($address: String!, $first: Int!) {
          wearers(where: { id: $address }, first: 1) {
            id
            currentHats(first: $first) {
              id
              prettyId
              status
              createdAt
              details
              maxSupply
              eligibility
              toggle
              mutable
              imageUri
              levelAtLocalTree
              currentSupply
              tree {
                id
                domain
                requestType
              }
            }
          }
        }
      `;

			const data = await this.executeGraphQLQuery(graphqlQuery, {
				address: address.toLowerCase(),
				first: limit,
			});

			if (!data || !data.wearers || data.wearers.length === 0) {
				return {
					hats: [],
					trees: [],
					wearers: [],
					totalResults: 0,
					hasNextPage: false,
				};
			}

			const userWearer = data.wearers[0];
			let userHats = userWearer.currentHats || [];

			// Filter active hats if requested
			if (activeOnly) {
				userHats = userHats.filter((hat: any) => hat.status);
			}

			const formattedHats: HatDetails[] = userHats.map((hat: any) => ({
				id: hat.id,
				prettyId: hat.prettyId || hat.id,
				status: hat.status,
				createdAt: hat.createdAt || "",
				details: hat.details || "",
				maxSupply: hat.maxSupply || "0",
				eligibility: hat.eligibility || "",
				toggle: hat.toggle || "",
				mutable: hat.mutable || false,
				imageUri: hat.imageUri || "",
				levelAtLocalTree: hat.levelAtLocalTree || 0,
				currentSupply: hat.currentSupply || "0",
				tree: {
					id: hat.tree?.id || "",
					domain: hat.tree?.domain || "",
					requestType: hat.tree?.requestType || "",
				},
				wearers: [],
				subHats: [],
			}));

			const formattedWearers: HatWearer[] = [
				{
					id: userWearer.id,
					address: userWearer.id,
					hats: formattedHats,
				},
			];

			return {
				hats: formattedHats,
				trees: [],
				wearers: formattedWearers,
				totalResults: formattedHats.length,
				hasNextPage: false,
				nextPageParam: undefined,
			};
		} catch (error) {
			log.error("Error getting user hats", { error, address });
			return {
				hats: [],
				trees: [],
				wearers: [],
				totalResults: 0,
				hasNextPage: false,
			};
		}
	}

	/**
	 * Check if user wears a specific hat
	 */
	async userWearsHat(
		address: string,
		hatId: string,
		chainId: number = 1,
	): Promise<boolean> {
		try {
			const userHats = await this.getUserHats(address, chainId);
			return userHats.hats.some((hat) => hat.id === hatId);
		} catch (error) {
			log.error("Error checking if user wears hat", { error, address, hatId });
			return false;
		}
	}

	/**
	 * Get hat details by ID
	 */
	async getHat(
		hatId: string,
		_chainId: number = 1,
	): Promise<HatDetails | null> {
		try {
			const graphqlQuery = `
        query GetHat($hatId: String!) {
          hat(id: $hatId) {
            id
            prettyId
            status
            createdAt
            details
            maxSupply
            eligibility
            toggle
            mutable
            imageUri
            levelAtLocalTree
            currentSupply
            tree {
              id
              domain
              requestType
            }
          }
        }
      `;

			const data = await this.executeGraphQLQuery(graphqlQuery, {
				hatId,
			});

			if (!data || !data.hat) {
				return null;
			}

			const hat = data.hat;

			return {
				id: hat.id,
				prettyId: hat.prettyId || hat.id,
				status: hat.status,
				createdAt: hat.createdAt,
				details: hat.details || "",
				maxSupply: hat.maxSupply,
				eligibility: hat.eligibility || "",
				toggle: hat.toggle || "",
				mutable: hat.mutable || false,
				imageUri: hat.imageUri || "",
				levelAtLocalTree: hat.levelAtLocalTree || 0,
				currentSupply: hat.currentSupply || "0",
				tree: {
					id: hat.tree?.id || "",
					domain: hat.tree?.domain || "",
					requestType: hat.tree?.requestType || "",
				},
				wearers: [],
				subHats: [],
			};
		} catch (error) {
			log.error("Error getting hat", { error, hatId });
			return null;
		}
	}

	/**
	 * Get popular/trending hats
	 */
	async getTrendingHats(
		_chainId: number = 1,
		limit: number = 10,
	): Promise<HatDetails[]> {
		try {
			const graphqlQuery = `
        query GetTrendingHats($first: Int!) {
          hats(first: $first, where: { status: true }, orderBy: currentSupply, orderDirection: desc) {
            id
            prettyId
            status
            createdAt
            details
            maxSupply
            eligibility
            toggle
            mutable
            imageUri
            levelAtLocalTree
            currentSupply
            tree {
              id
              domain
              requestType
            }
          }
        }
      `;

			const data = await this.executeGraphQLQuery(graphqlQuery, {
				first: limit * 2, // Get more to filter
			});

			if (!data || !data.hats) {
				return [];
			}

			return data.hats
				.filter((hat: any) => parseInt(hat.currentSupply || "0", 10) > 0)
				.slice(0, limit)
				.map((hat: any) => ({
					id: hat.id,
					prettyId: hat.prettyId || hat.id,
					status: hat.status,
					createdAt: hat.createdAt || "",
					details: hat.details || "",
					maxSupply: hat.maxSupply,
					eligibility: hat.eligibility || "",
					toggle: hat.toggle || "",
					mutable: hat.mutable || false,
					imageUri: hat.imageUri || "",
					levelAtLocalTree: hat.levelAtLocalTree || 0,
					currentSupply: hat.currentSupply || "0",
					tree: {
						id: hat.tree?.id || "",
						domain: hat.tree?.domain || "",
						requestType: hat.tree?.requestType || "",
					},
					wearers: [],
					subHats: [],
				}));
		} catch (error) {
			log.error("Error getting trending hats", { error, limit });
			return [];
		}
	}
}

// Export singleton instance
export const hatsProvider = new HatsProvider();
