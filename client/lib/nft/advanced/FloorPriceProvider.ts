/**
 * Floor price integration system
 * Aggregates pricing data from multiple sources for accurate NFT valuations
 */

export interface FloorPriceData {
	contractAddress: string;
	collectionName: string;
	floorPrice: number;
	floorPriceUSD: number;
	currency: "ETH" | "MATIC" | "USD";
	volume24h?: number;
	volume24hUSD?: number;
	change24h?: number; // Percentage change
	change7d?: number; // Percentage change
	sales24h?: number;
	owners?: number;
	totalSupply?: number;
	listedCount?: number;
	averagePrice?: number;
	lastUpdated: number;
	source:
		| "opensea"
		| "looksrare"
		| "x2y2"
		| "blur"
		| "reservoir"
		| "moralis"
		| "alchemy"
		| "aggregated";
}

export interface PriceHistoryPoint {
	timestamp: number;
	floorPrice: number;
	volume: number;
	sales: number;
}

export interface CollectionStats {
	contractAddress: string;
	collectionName: string;
	description?: string;
	imageUrl?: string;
	externalUrl?: string;
	twitterUsername?: string;
	discordUrl?: string;
	totalSupply: number;
	owners: number;
	floorPrice: number;
	floorPriceUSD: number;
	marketCap?: number;
	volume: {
		"24h": number;
		"7d": number;
		"30d": number;
		total: number;
	};
	volumeUSD: {
		"24h": number;
		"7d": number;
		"30d": number;
		total: number;
	};
	sales: {
		"24h": number;
		"7d": number;
		"30d": number;
		total: number;
	};
	averagePrices: {
		"24h": number;
		"7d": number;
		"30d": number;
	};
	priceHistory: PriceHistoryPoint[];
	traits?: Array<{
		trait_type: string;
		value: string;
		count: number;
		floorPrice?: number;
	}>;
	topSales?: Array<{
		tokenId: string;
		price: number;
		priceUSD: number;
		timestamp: number;
		buyer: string;
		seller: string;
		marketplace: string;
	}>;
	lastUpdated: number;
}

export interface PriceAlert {
	id: string;
	contractAddress: string;
	tokenId?: string; // Specific token or undefined for collection floor
	alertType: "below" | "above" | "change_percent";
	threshold: number;
	currency: "ETH" | "USD";
	isActive: boolean;
	createdAt: number;
	lastTriggered?: number;
	userId: string;
}

export class FloorPriceProvider {
	private cache = new Map<
		string,
		{ data: FloorPriceData; timestamp: number }
	>();
	private statsCache = new Map<
		string,
		{ data: CollectionStats; timestamp: number }
	>();
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for price data
	private readonly STATS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for stats
	private apiKeys: {
		opensea?: string;
		alchemy?: string;
		moralis?: string;
		reservoir?: string;
	} = {};

	constructor() {
		// Initialize API keys from environment
		this.apiKeys = {
			opensea: process.env.NEXT_PUBLIC_OPENSEA_API_KEY,
			alchemy: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
			moralis: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
			reservoir: process.env.NEXT_PUBLIC_RESERVOIR_API_KEY,
		};
	}

	/**
	 * Get floor price data with fallback to multiple sources
	 */
	async getFloorPrice(
		contractAddress: string,
		chainId: number = 1,
	): Promise<FloorPriceData | null> {
		const cacheKey = `${contractAddress}-${chainId}`;

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.data;
		}

		try {
			// Try sources in order of preference
			const sources = [
				() => this.getOpenSeaFloorPrice(contractAddress, chainId),
				() => this.getReservoirFloorPrice(contractAddress, chainId),
				() => this.getAlchemyFloorPrice(contractAddress, chainId),
				() => this.getMoralisFloorPrice(contractAddress, chainId),
			];

			for (const sourceFunc of sources) {
				try {
					const result = await sourceFunc();
					if (result) {
						this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
						return result;
					}
				} catch (error) {
					console.warn("Price source failed, trying next:", error);
				}
			}

			return null;
		} catch (error) {
			console.error("Error fetching floor price:", error);
			return null;
		}
	}

	/**
	 * Get detailed collection statistics
	 */
	async getCollectionStats(
		contractAddress: string,
		chainId: number = 1,
	): Promise<CollectionStats | null> {
		const cacheKey = `stats-${contractAddress}-${chainId}`;

		// Check cache first
		const cached = this.statsCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.STATS_CACHE_DURATION) {
			return cached.data;
		}

		try {
			const stats = await this.fetchComprehensiveStats(
				contractAddress,
				chainId,
			);
			if (stats) {
				this.statsCache.set(cacheKey, { data: stats, timestamp: Date.now() });
				return stats;
			}
			return null;
		} catch (error) {
			console.error("Error fetching collection stats:", error);
			return null;
		}
	}

	/**
	 * OpenSea API integration
	 */
	private async getOpenSeaFloorPrice(
		contractAddress: string,
		chainId: number,
	): Promise<FloorPriceData | null> {
		if (!this.apiKeys.opensea) return null;

		try {
			const _network = this.getOpenSeaNetwork(chainId);
			const response = await fetch(
				`https://api.opensea.io/api/v2/collections/${contractAddress}/stats`,
				{
					headers: {
						"X-API-KEY": this.apiKeys.opensea,
					},
				},
			);

			if (!response.ok) return null;

			const data = await response.json();
			const stats = data.stats;

			// Get ETH price for USD conversion
			const ethPrice = await this.getETHPrice();

			return {
				contractAddress,
				collectionName: data.collection?.name || "Unknown Collection",
				floorPrice: parseFloat(stats.floor_price || "0"),
				floorPriceUSD: parseFloat(stats.floor_price || "0") * ethPrice,
				currency: "ETH",
				volume24h: parseFloat(stats.one_day_volume || "0"),
				volume24hUSD: parseFloat(stats.one_day_volume || "0") * ethPrice,
				change24h: parseFloat(stats.one_day_change || "0") * 100,
				change7d: parseFloat(stats.seven_day_change || "0") * 100,
				sales24h: parseInt(stats.one_day_sales || "0", 10),
				owners: parseInt(stats.num_owners || "0", 10),
				totalSupply: parseInt(stats.total_supply || "0", 10),
				averagePrice: parseFloat(stats.average_price || "0"),
				lastUpdated: Date.now(),
				source: "opensea",
			};
		} catch (error) {
			console.error("OpenSea API error:", error);
			return null;
		}
	}

	/**
	 * Reservoir API integration (aggregated data)
	 */
	private async getReservoirFloorPrice(
		contractAddress: string,
		chainId: number,
	): Promise<FloorPriceData | null> {
		try {
			const baseUrl = this.getReservoirBaseUrl(chainId);
			const response = await fetch(
				`${baseUrl}/collections/v7?contract=${contractAddress}`,
				{
					headers: {
						"x-api-key": this.apiKeys.reservoir || "",
					},
				},
			);

			if (!response.ok) return null;

			const data = await response.json();
			const collection = data.collections?.[0];
			if (!collection) return null;

			const ethPrice = await this.getETHPrice();

			return {
				contractAddress,
				collectionName: collection.name || "Unknown Collection",
				floorPrice: parseFloat(
					collection.floorAsk?.price?.amount?.native || "0",
				),
				floorPriceUSD: parseFloat(
					collection.floorAsk?.price?.amount?.usd || "0",
				),
				currency: "ETH",
				volume24h: parseFloat(collection.volume?.["1day"] || "0"),
				volume24hUSD: parseFloat(collection.volume?.["1day"] || "0") * ethPrice,
				change24h: parseFloat(collection.volumeChange?.["1day"] || "0") * 100,
				change7d: parseFloat(collection.volumeChange?.["7day"] || "0") * 100,
				sales24h: parseInt(collection.salesCount?.["1day"] || "0", 10),
				owners: parseInt(collection.ownerCount || "0", 10),
				totalSupply: parseInt(collection.tokenCount || "0", 10),
				listedCount: parseInt(collection.onSaleCount || "0", 10),
				lastUpdated: Date.now(),
				source: "reservoir",
			};
		} catch (error) {
			console.error("Reservoir API error:", error);
			return null;
		}
	}

	/**
	 * Alchemy NFT API integration
	 */
	private async getAlchemyFloorPrice(
		contractAddress: string,
		chainId: number,
	): Promise<FloorPriceData | null> {
		if (!this.apiKeys.alchemy) return null;

		try {
			const network = this.getAlchemyNetwork(chainId);
			const response = await fetch(
				`https://${network}.g.alchemy.com/nft/v3/${this.apiKeys.alchemy}/getFloorPrice?contractAddress=${contractAddress}`,
				{
					method: "GET",
					headers: {
						accept: "application/json",
					},
				},
			);

			if (!response.ok) return null;

			const data = await response.json();
			const ethPrice = await this.getETHPrice();

			return {
				contractAddress,
				collectionName: data.name || "Unknown Collection",
				floorPrice: parseFloat(data.openSea?.floorPrice || "0"),
				floorPriceUSD: parseFloat(data.openSea?.floorPrice || "0") * ethPrice,
				currency: "ETH",
				lastUpdated: Date.now(),
				source: "alchemy",
			};
		} catch (error) {
			console.error("Alchemy API error:", error);
			return null;
		}
	}

	/**
	 * Moralis NFT API integration
	 */
	private async getMoralisFloorPrice(
		contractAddress: string,
		chainId: number,
	): Promise<FloorPriceData | null> {
		if (!this.apiKeys.moralis) return null;

		try {
			const chain = this.getMoralisChain(chainId);
			const response = await fetch(
				`https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/stats?chain=${chain}`,
				{
					headers: {
						"X-API-Key": this.apiKeys.moralis,
					},
				},
			);

			if (!response.ok) return null;

			const data = await response.json();
			const _ethPrice = await this.getETHPrice();

			return {
				contractAddress,
				collectionName: data.name || "Unknown Collection",
				floorPrice: parseFloat(data.floor_price_eth || "0"),
				floorPriceUSD: parseFloat(data.floor_price_usd || "0"),
				currency: "ETH",
				volume24h: parseFloat(data.volume_24h_eth || "0"),
				volume24hUSD: parseFloat(data.volume_24h_usd || "0"),
				totalSupply: parseInt(data.total_tokens || "0", 10),
				lastUpdated: Date.now(),
				source: "moralis",
			};
		} catch (error) {
			console.error("Moralis API error:", error);
			return null;
		}
	}

	/**
	 * Fetch comprehensive collection statistics
	 */
	private async fetchComprehensiveStats(
		contractAddress: string,
		chainId: number,
	): Promise<CollectionStats | null> {
		// This would combine data from multiple sources to create comprehensive stats
		// For now, we'll use the floor price data as a base and extend it

		const floorData = await this.getFloorPrice(contractAddress, chainId);
		if (!floorData) return null;

		// Mock comprehensive stats - in production, this would aggregate from multiple APIs
		const stats: CollectionStats = {
			contractAddress,
			collectionName: floorData.collectionName,
			totalSupply: floorData.totalSupply || 10000,
			owners: floorData.owners || 5000,
			floorPrice: floorData.floorPrice,
			floorPriceUSD: floorData.floorPriceUSD,
			volume: {
				"24h": floorData.volume24h || 0,
				"7d": (floorData.volume24h || 0) * 7,
				"30d": (floorData.volume24h || 0) * 30,
				total: (floorData.volume24h || 0) * 365,
			},
			volumeUSD: {
				"24h": floorData.volume24hUSD || 0,
				"7d": (floorData.volume24hUSD || 0) * 7,
				"30d": (floorData.volume24hUSD || 0) * 30,
				total: (floorData.volume24hUSD || 0) * 365,
			},
			sales: {
				"24h": floorData.sales24h || 0,
				"7d": (floorData.sales24h || 0) * 7,
				"30d": (floorData.sales24h || 0) * 30,
				total: (floorData.sales24h || 0) * 365,
			},
			averagePrices: {
				"24h": floorData.averagePrice || floorData.floorPrice,
				"7d": floorData.averagePrice || floorData.floorPrice,
				"30d": floorData.averagePrice || floorData.floorPrice,
			},
			priceHistory: [], // Would be populated from historical API calls
			lastUpdated: Date.now(),
		};

		return stats;
	}

	/**
	 * Get multiple floor prices in batch
	 */
	async getBatchFloorPrices(
		contractAddresses: string[],
		chainId: number = 1,
	): Promise<Map<string, FloorPriceData>> {
		const results = new Map<string, FloorPriceData>();

		// Process in parallel batches to avoid rate limiting
		const batchSize = 5;
		for (let i = 0; i < contractAddresses.length; i += batchSize) {
			const batch = contractAddresses.slice(i, i + batchSize);

			const promises = batch.map(async (address) => {
				const data = await this.getFloorPrice(address, chainId);
				if (data) {
					results.set(address, data);
				}
			});

			await Promise.all(promises);

			// Rate limiting delay
			if (i + batchSize < contractAddresses.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		return results;
	}

	/**
	 * Get current ETH price in USD
	 */
	private async getETHPrice(): Promise<number> {
		try {
			const response = await fetch(
				"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
			);
			const data = await response.json();
			return data.ethereum?.usd || 2000; // Fallback price
		} catch (error) {
			console.error("Error fetching ETH price:", error);
			return 2000; // Fallback price
		}
	}

	/**
	 * Helper methods for API network mappings
	 */
	private getOpenSeaNetwork(chainId: number): string {
		const networks: { [key: number]: string } = {
			1: "ethereum",
			137: "matic",
			42161: "arbitrum",
			10: "optimism",
			8453: "base",
		};
		return networks[chainId] || "ethereum";
	}

	private getAlchemyNetwork(chainId: number): string {
		const networks: { [key: number]: string } = {
			1: "eth-mainnet",
			137: "polygon-mainnet",
			42161: "arb-mainnet",
			10: "opt-mainnet",
			8453: "base-mainnet",
		};
		return networks[chainId] || "eth-mainnet";
	}

	private getMoralisChain(chainId: number): string {
		const chains: { [key: number]: string } = {
			1: "eth",
			137: "polygon",
			42161: "arbitrum",
			10: "optimism",
			8453: "base",
		};
		return chains[chainId] || "eth";
	}

	private getReservoirBaseUrl(chainId: number): string {
		const urls: { [key: number]: string } = {
			1: "https://api.reservoir.tools",
			137: "https://api-polygon.reservoir.tools",
			42161: "https://api-arbitrum.reservoir.tools",
			10: "https://api-optimism.reservoir.tools",
			8453: "https://api-base.reservoir.tools",
		};
		return urls[chainId] || "https://api.reservoir.tools";
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		this.cache.clear();
		this.statsCache.clear();
	}

	/**
	 * Get cache status for debugging
	 */
	getCacheStatus(): { priceCache: number; statsCache: number } {
		return {
			priceCache: this.cache.size,
			statsCache: this.statsCache.size,
		};
	}
}

// Export singleton instance
export const floorPriceProvider = new FloorPriceProvider();
