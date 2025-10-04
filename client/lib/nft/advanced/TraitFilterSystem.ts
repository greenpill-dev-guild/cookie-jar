/**
 * Advanced NFT trait-based filtering system
 * Supports complex queries, range filters, and smart suggestions
 */

export interface NFTAttribute {
	trait_type: string;
	value: string | number;
	display_type?:
		| "number"
		| "boost_number"
		| "boost_percentage"
		| "date"
		| string;
	max_value?: number;
	trait_count?: number;
	order?: number;
}

export interface NFTWithTraits {
	id: string;
	tokenId: string;
	name: string;
	description?: string;
	image: string;
	contractAddress: string;
	attributes?: NFTAttribute[];
	rarity_score?: number;
	rarity_rank?: number;
	collection_name?: string;
	collection_size?: number;
	floor_price?: number;
	last_sale_price?: number;
}

export interface TraitFilter {
	trait_type: string;
	values: (string | number)[];
	operator: "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "range" | "exists";
	min_value?: number;
	max_value?: number;
}

export interface AdvancedNFTFilters {
	traits: TraitFilter[];
	rarity_rank?: { min?: number; max?: number };
	rarity_score?: { min?: number; max?: number };
	price_range?: { min?: number; max?: number; currency?: string };
	collection_size?: { min?: number; max?: number };
	has_traits?: string[]; // Must have these trait types
	exclude_traits?: string[]; // Must not have these trait types
	last_sale_range?: { min?: number; max?: number; currency?: string };
	sort_by?:
		| "rarity_rank"
		| "rarity_score"
		| "price"
		| "last_sale"
		| "token_id"
		| "recently_listed";
	sort_direction?: "asc" | "desc";
}

export interface TraitStatistics {
	trait_type: string;
	total_count: number;
	unique_values: number;
	values: Array<{
		value: string | number;
		count: number;
		percentage: number;
		floor_price?: number;
		rarity_score?: number;
	}>;
	is_numeric: boolean;
	min_value?: number;
	max_value?: number;
	avg_value?: number;
}

export interface CollectionTraits {
	[contractAddress: string]: {
		collection_name: string;
		collection_size: number;
		floor_price?: number;
		traits: TraitStatistics[];
		last_updated: number;
	};
}

export class TraitFilterSystem {
	/**
	 * Apply advanced filters to NFT list
	 */
	applyFilters(
		nfts: NFTWithTraits[],
		filters: AdvancedNFTFilters,
	): NFTWithTraits[] {
		let filtered = nfts;

		// Apply trait filters
		for (const traitFilter of filters.traits) {
			filtered = this.applyTraitFilter(filtered, traitFilter);
		}

		// Apply rarity filters
		if (filters.rarity_rank) {
			filtered = filtered.filter((nft) => {
				const rank = nft.rarity_rank;
				if (rank === undefined) return false;

				const { min, max } = filters.rarity_rank!;
				if (min !== undefined && rank < min) return false;
				if (max !== undefined && rank > max) return false;
				return true;
			});
		}

		if (filters.rarity_score) {
			filtered = filtered.filter((nft) => {
				const score = nft.rarity_score;
				if (score === undefined) return false;

				const { min, max } = filters.rarity_score!;
				if (min !== undefined && score < min) return false;
				if (max !== undefined && score > max) return false;
				return true;
			});
		}

		// Apply price range filter
		if (filters.price_range) {
			filtered = filtered.filter((nft) => {
				const price = nft.floor_price;
				if (price === undefined) return false;

				const { min, max } = filters.price_range!;
				if (min !== undefined && price < min) return false;
				if (max !== undefined && price > max) return false;
				return true;
			});
		}

		// Apply required traits filter
		if (filters.has_traits?.length) {
			filtered = filtered.filter((nft) => {
				if (!nft.attributes) return false;
				const nftTraitTypes = nft.attributes.map((attr) => attr.trait_type);
				return filters.has_traits?.every((requiredTrait) =>
					nftTraitTypes.includes(requiredTrait),
				);
			});
		}

		// Apply excluded traits filter
		if (filters.exclude_traits?.length) {
			filtered = filtered.filter((nft) => {
				if (!nft.attributes) return true;
				const nftTraitTypes = nft.attributes.map((attr) => attr.trait_type);
				return !filters.exclude_traits?.some((excludedTrait) =>
					nftTraitTypes.includes(excludedTrait),
				);
			});
		}

		// Apply collection size filter
		if (filters.collection_size) {
			filtered = filtered.filter((nft) => {
				const size = nft.collection_size;
				if (size === undefined) return false;

				const { min, max } = filters.collection_size!;
				if (min !== undefined && size < min) return false;
				if (max !== undefined && size > max) return false;
				return true;
			});
		}

		// Apply last sale range filter
		if (filters.last_sale_range) {
			filtered = filtered.filter((nft) => {
				const price = nft.last_sale_price;
				if (price === undefined) return false;

				const { min, max } = filters.last_sale_range!;
				if (min !== undefined && price < min) return false;
				if (max !== undefined && price > max) return false;
				return true;
			});
		}

		// Apply sorting
		if (filters.sort_by) {
			filtered = this.sortNFTs(
				filtered,
				filters.sort_by,
				filters.sort_direction || "asc",
			);
		}

		return filtered;
	}

	/**
	 * Apply individual trait filter
	 */
	private applyTraitFilter(
		nfts: NFTWithTraits[],
		filter: TraitFilter,
	): NFTWithTraits[] {
		return nfts.filter((nft) => {
			if (!nft.attributes) return false;

			const attribute = nft.attributes.find(
				(attr) => attr.trait_type === filter.trait_type,
			);

			switch (filter.operator) {
				case "exists":
					return !!attribute;

				case "in":
					return attribute ? filter.values.includes(attribute.value) : false;

				case "not_in":
					return attribute ? !filter.values.includes(attribute.value) : true;

				case "gt":
					return attribute && typeof attribute.value === "number"
						? attribute.value > (filter.values[0] as number)
						: false;

				case "lt":
					return attribute && typeof attribute.value === "number"
						? attribute.value < (filter.values[0] as number)
						: false;

				case "gte":
					return attribute && typeof attribute.value === "number"
						? attribute.value >= (filter.values[0] as number)
						: false;

				case "lte":
					return attribute && typeof attribute.value === "number"
						? attribute.value <= (filter.values[0] as number)
						: false;

				case "range": {
					if (!attribute || typeof attribute.value !== "number") return false;
					const value = attribute.value as number;
					const min =
						filter.min_value !== undefined ? filter.min_value : -Infinity;
					const max =
						filter.max_value !== undefined ? filter.max_value : Infinity;
					return value >= min && value <= max;
				}

				default:
					return false;
			}
		});
	}

	/**
	 * Sort NFTs by specified criteria
	 */
	private sortNFTs(
		nfts: NFTWithTraits[],
		sortBy: AdvancedNFTFilters["sort_by"],
		direction: "asc" | "desc",
	): NFTWithTraits[] {
		const sortedNfts = [...nfts].sort((a, b) => {
			let compareA: number | undefined;
			let compareB: number | undefined;

			switch (sortBy) {
				case "rarity_rank":
					compareA = a.rarity_rank;
					compareB = b.rarity_rank;
					break;
				case "rarity_score":
					compareA = a.rarity_score;
					compareB = b.rarity_score;
					break;
				case "price":
					compareA = a.floor_price;
					compareB = b.floor_price;
					break;
				case "last_sale":
					compareA = a.last_sale_price;
					compareB = b.last_sale_price;
					break;
				case "token_id":
					compareA = parseInt(a.tokenId, 10);
					compareB = parseInt(b.tokenId, 10);
					break;
				default:
					return 0;
			}

			// Handle undefined values - push to end
			if (compareA === undefined && compareB === undefined) return 0;
			if (compareA === undefined) return 1;
			if (compareB === undefined) return -1;

			const result = compareA - compareB;
			return direction === "desc" ? -result : result;
		});

		return sortedNfts;
	}

	/**
	 * Generate trait statistics for a collection
	 */
	generateTraitStatistics(nfts: NFTWithTraits[]): TraitStatistics[] {
		if (!nfts.length) return [];

		const traitMap = new Map<
			string,
			{
				values: Map<string | number, number>;
				is_numeric: boolean;
				numeric_values: number[];
			}
		>();

		// Collect all traits and values
		for (const nft of nfts) {
			if (!nft.attributes) continue;

			for (const attribute of nft.attributes) {
				const { trait_type, value } = attribute;

				if (!traitMap.has(trait_type)) {
					traitMap.set(trait_type, {
						values: new Map(),
						is_numeric: typeof value === "number",
						numeric_values: [],
					});
				}

				const traitData = traitMap.get(trait_type)!;

				// Update value count
				const currentCount = traitData.values.get(value) || 0;
				traitData.values.set(value, currentCount + 1);

				// Track numeric values
				if (typeof value === "number") {
					traitData.numeric_values.push(value);
				} else if (traitData.is_numeric) {
					// Mixed types - convert to non-numeric
					traitData.is_numeric = false;
					traitData.numeric_values = [];
				}
			}
		}

		// Generate statistics
		const statistics: TraitStatistics[] = [];

		for (const [trait_type, traitData] of traitMap) {
			const total_count = Array.from(traitData.values.values()).reduce(
				(sum, count) => sum + count,
				0,
			);
			const unique_values = traitData.values.size;

			const values = Array.from(traitData.values.entries())
				.map(([value, count]) => ({
					value,
					count,
					percentage: (count / nfts.length) * 100,
					// Could add floor_price and rarity_score calculations here
				}))
				.sort((a, b) => b.count - a.count); // Sort by rarity (least common first when reversed)

			const stat: TraitStatistics = {
				trait_type,
				total_count,
				unique_values,
				values,
				is_numeric: traitData.is_numeric,
			};

			// Add numeric statistics
			if (traitData.is_numeric && traitData.numeric_values.length > 0) {
				stat.min_value = Math.min(...traitData.numeric_values);
				stat.max_value = Math.max(...traitData.numeric_values);
				stat.avg_value =
					traitData.numeric_values.reduce((sum, val) => sum + val, 0) /
					traitData.numeric_values.length;
			}

			statistics.push(stat);
		}

		return statistics.sort((a, b) => a.trait_type.localeCompare(b.trait_type));
	}

	/**
	 * Get trait suggestions based on current filters
	 */
	getTraitSuggestions(
		nfts: NFTWithTraits[],
		currentFilters: AdvancedNFTFilters,
		limit: number = 10,
	): Array<{
		trait_type: string;
		suggested_values: Array<{
			value: string | number;
			count: number;
			would_filter_to: number;
		}>;
	}> {
		// Apply current filters except trait filters to see available options
		const baseFiltered = this.applyFilters(nfts, {
			...currentFilters,
			traits: [],
		});
		const statistics = this.generateTraitStatistics(baseFiltered);

		return statistics.slice(0, limit).map((stat) => ({
			trait_type: stat.trait_type,
			suggested_values: stat.values.slice(0, 5).map((valueData) => {
				// Calculate how many NFTs would remain if this value is selected
				const testFilter: TraitFilter = {
					trait_type: stat.trait_type,
					values: [valueData.value],
					operator: "in",
				};

				const wouldRemain = this.applyTraitFilter(
					baseFiltered,
					testFilter,
				).length;

				return {
					...valueData,
					would_filter_to: wouldRemain,
				};
			}),
		}));
	}

	/**
	 * Calculate rarity score for an NFT based on its traits
	 */
	calculateRarityScore(
		nft: NFTWithTraits,
		collectionStats: TraitStatistics[],
	): number {
		if (!nft.attributes || !nft.attributes.length) return 0;

		let totalScore = 0;
		const totalNFTs = collectionStats[0]?.total_count || 1;

		for (const attribute of nft.attributes) {
			const traitStat = collectionStats.find(
				(stat) => stat.trait_type === attribute.trait_type,
			);
			if (!traitStat) continue;

			const valueData = traitStat.values.find(
				(v) => v.value === attribute.value,
			);
			if (!valueData) continue;

			// Rarity score = 1 / (trait frequency)
			const frequency = valueData.count / totalNFTs;
			const rarityScore = 1 / frequency;

			totalScore += rarityScore;
		}

		return totalScore;
	}

	/**
	 * Smart filter builder - suggests optimal filters
	 */
	buildSmartFilters(
		nfts: NFTWithTraits[],
		intent: "rarest" | "cheapest" | "balanced" | "trending",
	): AdvancedNFTFilters {
		const _statistics = this.generateTraitStatistics(nfts);

		switch (intent) {
			case "rarest":
				return {
					traits: [],
					rarity_rank: { max: Math.ceil(nfts.length * 0.1) }, // Top 10% rarity
					sort_by: "rarity_rank",
					sort_direction: "asc",
				};

			case "cheapest":
				return {
					traits: [],
					price_range: {
						max: this.calculatePercentile(
							nfts.map((n) => n.floor_price || 0),
							25,
						),
					},
					sort_by: "price",
					sort_direction: "asc",
				};

			case "balanced":
				return {
					traits: [],
					rarity_rank: {
						min: Math.ceil(nfts.length * 0.2),
						max: Math.ceil(nfts.length * 0.8),
					},
					price_range: {
						min: this.calculatePercentile(
							nfts.map((n) => n.floor_price || 0),
							25,
						),
						max: this.calculatePercentile(
							nfts.map((n) => n.floor_price || 0),
							75,
						),
					},
					sort_by: "rarity_score",
					sort_direction: "desc",
				};

			case "trending":
				return {
					traits: [],
					last_sale_range: { min: 0 }, // Has sales activity
					sort_by: "last_sale",
					sort_direction: "desc",
				};

			default:
				return { traits: [] };
		}
	}

	/**
	 * Calculate percentile value
	 */
	private calculatePercentile(values: number[], percentile: number): number {
		const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
		if (!sorted.length) return 0;

		const index = Math.ceil((percentile / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)];
	}

	/**
	 * Export filters as URL params for sharing
	 */
	filtersToURLParams(filters: AdvancedNFTFilters): URLSearchParams {
		const params = new URLSearchParams();

		// Encode trait filters
		if (filters.traits.length) {
			params.set("traits", JSON.stringify(filters.traits));
		}

		if (filters.rarity_rank) {
			params.set("rarity_rank", JSON.stringify(filters.rarity_rank));
		}

		if (filters.price_range) {
			params.set("price_range", JSON.stringify(filters.price_range));
		}

		if (filters.sort_by) {
			params.set("sort_by", filters.sort_by);
			params.set("sort_direction", filters.sort_direction || "asc");
		}

		return params;
	}

	/**
	 * Import filters from URL params
	 */
	filtersFromURLParams(params: URLSearchParams): AdvancedNFTFilters {
		const filters: AdvancedNFTFilters = { traits: [] };

		try {
			const traitsParam = params.get("traits");
			if (traitsParam) {
				filters.traits = JSON.parse(traitsParam);
			}

			const rarityParam = params.get("rarity_rank");
			if (rarityParam) {
				filters.rarity_rank = JSON.parse(rarityParam);
			}

			const priceParam = params.get("price_range");
			if (priceParam) {
				filters.price_range = JSON.parse(priceParam);
			}

			const sortBy = params.get("sort_by") as AdvancedNFTFilters["sort_by"];
			if (sortBy) {
				filters.sort_by = sortBy;
				filters.sort_direction =
					(params.get("sort_direction") as "asc" | "desc") || "asc";
			}
		} catch (error) {
			console.error("Error parsing URL params:", error);
		}

		return filters;
	}
}

// Export singleton instance
export const traitFilterSystem = new TraitFilterSystem();
