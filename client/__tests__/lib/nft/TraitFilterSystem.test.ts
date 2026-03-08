import { beforeEach, describe, expect, it } from "vitest";
import {
	type AdvancedNFTFilters,
	type NFTWithTraits,
	TraitFilterSystem,
	traitFilterSystem,
} from "../../../lib/nft/advanced/TraitFilterSystem";

describe("TraitFilterSystem", () => {
	let filterSystem: TraitFilterSystem;
	let mockNFTs: NFTWithTraits[];

	beforeEach(() => {
		filterSystem = new TraitFilterSystem();

		mockNFTs = [
			{
				id: "nft1",
				tokenId: "1",
				name: "Fire Dragon",
				image: "image1.png",
				contractAddress: "0x123",
				attributes: [
					{ trait_type: "Element", value: "Fire" },
					{ trait_type: "Level", value: 85 },
					{ trait_type: "Rarity", value: "Legendary" },
					{ trait_type: "Power", value: 9500 },
				],
				rarity_rank: 1,
				rarity_score: 250.5,
				collection_size: 10000,
				floor_price: 2.5,
				last_sale_price: 3.0,
			},
			{
				id: "nft2",
				tokenId: "2",
				name: "Water Sprite",
				image: "image2.png",
				contractAddress: "0x123",
				attributes: [
					{ trait_type: "Element", value: "Water" },
					{ trait_type: "Level", value: 42 },
					{ trait_type: "Rarity", value: "Common" },
					{ trait_type: "Power", value: 1200 },
				],
				rarity_rank: 5000,
				rarity_score: 15.2,
				collection_size: 10000,
				floor_price: 0.1,
				last_sale_price: 0.15,
			},
			{
				id: "nft3",
				tokenId: "3",
				name: "Earth Golem",
				image: "image3.png",
				contractAddress: "0x123",
				attributes: [
					{ trait_type: "Element", value: "Earth" },
					{ trait_type: "Level", value: 67 },
					{ trait_type: "Rarity", value: "Rare" },
					{ trait_type: "Power", value: 4500 },
				],
				rarity_rank: 500,
				rarity_score: 85.7,
				collection_size: 10000,
				floor_price: 0.8,
				last_sale_price: 0.9,
			},
			{
				id: "nft4",
				tokenId: "4",
				name: "Air Phoenix",
				image: "image4.png",
				contractAddress: "0x123",
				attributes: [
					{ trait_type: "Element", value: "Air" },
					{ trait_type: "Level", value: 95 },
					{ trait_type: "Rarity", value: "Epic" },
					{ trait_type: "Wings", value: "Golden" },
				],
				rarity_rank: 25,
				rarity_score: 180.3,
				collection_size: 10000,
				floor_price: 1.5,
			},
			{
				id: "nft5",
				tokenId: "5",
				name: "Basic Warrior",
				image: "image5.png",
				contractAddress: "0x456",
				attributes: [
					{ trait_type: "Class", value: "Warrior" },
					{ trait_type: "Level", value: 15 },
				],
				collection_size: 5000,
				floor_price: 0.05,
			},
		];
	});

	describe("trait filtering", () => {
		it('should filter NFTs by trait value using "in" operator', () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Element",
						values: ["Fire", "Water"],
						operator: "in",
					},
				],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Fire Dragon");
			expect(result[1].name).toBe("Water Sprite");
		});

		it('should filter NFTs by trait value using "not_in" operator', () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Element",
						values: ["Fire"],
						operator: "not_in",
					},
				],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			// Should exclude NFTs with Element=Fire, keep others
			expect(result.length).toBeGreaterThan(0);
			expect(result.find((nft) => nft.name === "Fire Dragon")).toBeUndefined();
			// All remaining NFTs should not have Element=Fire
			result.forEach((nft) => {
				const elementTrait = nft.attributes?.find(
					(attr) => attr.trait_type === "Element",
				);
				if (elementTrait) {
					expect(elementTrait.value).not.toBe("Fire");
				}
			});
		});

		it('should filter NFTs by numeric trait using "gt" operator', () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Level",
						values: [50],
						operator: "gt",
					},
				],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(3); // Fire Dragon (85), Earth Golem (67), Air Phoenix (95)
			expect(
				result.every((nft) => {
					const levelAttr = nft.attributes?.find(
						(attr) => attr.trait_type === "Level",
					);
					return (
						levelAttr &&
						typeof levelAttr.value === "number" &&
						levelAttr.value > 50
					);
				}),
			).toBe(true);
		});

		it('should filter NFTs by numeric trait using "range" operator', () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Level",
						values: [],
						operator: "range",
						min_value: 40,
						max_value: 70,
					},
				],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(2); // Water Sprite (42), Earth Golem (67)
			expect(
				result.every((nft) => {
					const levelAttr = nft.attributes?.find(
						(attr) => attr.trait_type === "Level",
					);
					return (
						levelAttr &&
						typeof levelAttr.value === "number" &&
						levelAttr.value >= 40 &&
						levelAttr.value <= 70
					);
				}),
			).toBe(true);
		});

		it('should filter NFTs by trait existence using "exists" operator', () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Wings",
						values: [],
						operator: "exists",
					},
				],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(1); // Only Air Phoenix has Wings
			expect(result[0].name).toBe("Air Phoenix");
		});

		it("should handle multiple trait filters (AND logic)", () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Element",
						values: ["Fire", "Earth"],
						operator: "in",
					},
					{
						trait_type: "Level",
						values: [70],
						operator: "gt",
					},
				],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(1); // Only Fire Dragon matches both conditions
			expect(result[0].name).toBe("Fire Dragon");
		});
	});

	describe("rarity filtering", () => {
		it("should filter by rarity rank range", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				rarity_rank: { min: 1, max: 100 },
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(2); // Fire Dragon (1), Air Phoenix (25)
		});

		it("should filter by rarity score range", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				rarity_score: { min: 100, max: 200 },
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(1); // Air Phoenix (180.3)
			expect(result[0].name).toBe("Air Phoenix");
		});
	});

	describe("price filtering", () => {
		it("should filter by price range", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				price_range: { min: 0.5, max: 1.0 },
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(1); // Earth Golem (0.8)
			expect(result[0].name).toBe("Earth Golem");
		});

		it("should filter by last sale price range", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				last_sale_range: { min: 0.5, max: 2.0 },
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(1); // Earth Golem (0.9)
			expect(result[0].name).toBe("Earth Golem");
		});
	});

	describe("trait requirements", () => {
		it("should filter by required traits", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				has_traits: ["Element", "Level"],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(4); // All except Basic Warrior (missing Element)
			expect(
				result.find((nft) => nft.name === "Basic Warrior"),
			).toBeUndefined();
		});

		it("should filter by excluded traits", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				exclude_traits: ["Wings"],
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(4); // All except Air Phoenix
			expect(result.find((nft) => nft.name === "Air Phoenix")).toBeUndefined();
		});
	});

	describe("collection filtering", () => {
		it("should filter by collection size", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				collection_size: { min: 8000, max: 12000 },
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result).toHaveLength(4); // All from 10k collection
			expect(
				result.find((nft) => nft.name === "Basic Warrior"),
			).toBeUndefined();
		});
	});

	describe("sorting", () => {
		it("should sort by rarity rank ascending", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				sort_by: "rarity_rank",
				sort_direction: "asc",
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result[0].name).toBe("Fire Dragon"); // rank 1
			expect(result[1].name).toBe("Air Phoenix"); // rank 25
			expect(result[2].name).toBe("Earth Golem"); // rank 500
		});

		it("should sort by price descending", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				sort_by: "price",
				sort_direction: "desc",
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result[0].name).toBe("Fire Dragon"); // 2.5
			expect(result[1].name).toBe("Air Phoenix"); // 1.5
			expect(result[2].name).toBe("Earth Golem"); // 0.8
		});

		it("should sort by token ID", () => {
			const filters: AdvancedNFTFilters = {
				traits: [],
				sort_by: "token_id",
				sort_direction: "asc",
			};

			const result = filterSystem.applyFilters(mockNFTs, filters);

			expect(result[0].tokenId).toBe("1");
			expect(result[1].tokenId).toBe("2");
			expect(result[2].tokenId).toBe("3");
		});
	});

	describe("trait statistics", () => {
		it("should generate trait statistics correctly", () => {
			const stats = filterSystem.generateTraitStatistics(mockNFTs.slice(0, 4)); // First 4 NFTs

			// Should have stats for all trait types present
			expect(stats.length).toBeGreaterThan(0);

			const elementStat = stats.find((s) => s.trait_type === "Element");
			if (elementStat) {
				expect(elementStat.unique_values).toBeGreaterThan(0);
				expect(elementStat.total_count).toBeGreaterThan(0);
				expect(elementStat.is_numeric).toBe(false);
			}

			const levelStat = stats.find((s) => s.trait_type === "Level");
			if (levelStat) {
				expect(levelStat.is_numeric).toBe(true);
				expect(levelStat.min_value).toBeDefined();
				expect(levelStat.max_value).toBeDefined();
			}
		});

		it("should handle empty NFT array", () => {
			const stats = filterSystem.generateTraitStatistics([]);
			expect(stats).toEqual([]);
		});

		it("should calculate trait percentages correctly", () => {
			const stats = filterSystem.generateTraitStatistics(mockNFTs.slice(0, 4));

			const elementStat = stats.find((s) => s.trait_type === "Element");
			expect(elementStat?.values).toHaveLength(4);

			// Each element appears once out of 4 NFTs = 25%
			elementStat?.values.forEach((value) => {
				expect(value.percentage).toBe(25);
				expect(value.count).toBe(1);
			});
		});
	});

	describe("trait suggestions", () => {
		it("should generate trait suggestions based on current filters", () => {
			const currentFilters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Element",
						values: ["Fire"],
						operator: "in",
					},
				],
			};

			const suggestions = filterSystem.getTraitSuggestions(
				mockNFTs,
				currentFilters,
				3, // limit
			);

			expect(suggestions).toHaveLength(3);
			expect(suggestions[0]).toHaveProperty("trait_type");
			expect(suggestions[0]).toHaveProperty("suggested_values");

			// Each suggestion should include count and filter prediction
			suggestions[0].suggested_values.forEach((value) => {
				expect(value).toHaveProperty("value");
				expect(value).toHaveProperty("count");
				expect(value).toHaveProperty("would_filter_to");
			});
		});
	});

	describe("smart filters", () => {
		it("should build smart filter for rarest NFTs", () => {
			const filter = filterSystem.buildSmartFilters(mockNFTs, "rarest");

			expect(filter).toHaveProperty("rarity_rank");
			expect(filter.rarity_rank?.max).toBe(Math.ceil(mockNFTs.length * 0.1));
			expect(filter.sort_by).toBe("rarity_rank");
			expect(filter.sort_direction).toBe("asc");
		});

		it("should build smart filter for cheapest NFTs", () => {
			const filter = filterSystem.buildSmartFilters(mockNFTs, "cheapest");

			expect(filter).toHaveProperty("price_range");
			expect(filter.sort_by).toBe("price");
			expect(filter.sort_direction).toBe("asc");
		});

		it("should build smart filter for balanced NFTs", () => {
			const filter = filterSystem.buildSmartFilters(mockNFTs, "balanced");

			expect(filter).toHaveProperty("rarity_rank");
			expect(filter).toHaveProperty("price_range");
			expect(filter.sort_by).toBe("rarity_score");
		});

		it("should build smart filter for trending NFTs", () => {
			const filter = filterSystem.buildSmartFilters(mockNFTs, "trending");

			expect(filter).toHaveProperty("last_sale_range");
			expect(filter.last_sale_range?.min).toBe(0);
			expect(filter.sort_by).toBe("last_sale");
			expect(filter.sort_direction).toBe("desc");
		});
	});

	describe("rarity calculation", () => {
		it("should calculate rarity score based on trait frequency", () => {
			const stats = filterSystem.generateTraitStatistics(mockNFTs);
			const score = filterSystem.calculateRarityScore(mockNFTs[0], stats);

			expect(score).toBeGreaterThan(0);
			expect(typeof score).toBe("number");
		});

		it("should return 0 for NFT with no attributes", () => {
			const nftWithoutAttrs: NFTWithTraits = {
				...mockNFTs[0],
				attributes: [],
			};

			const stats = filterSystem.generateTraitStatistics(mockNFTs);
			const score = filterSystem.calculateRarityScore(nftWithoutAttrs, stats);

			expect(score).toBe(0);
		});
	});

	describe("URL serialization", () => {
		it("should serialize filters to URL params", () => {
			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Element",
						values: ["Fire"],
						operator: "in",
					},
				],
				rarity_rank: { min: 1, max: 100 },
				price_range: { min: 0.1, max: 1.0 },
				sort_by: "rarity_rank",
				sort_direction: "asc",
			};

			const params = filterSystem.filtersToURLParams(filters);

			expect(params.get("traits")).toBeDefined();
			expect(params.get("rarity_rank")).toBeDefined();
			expect(params.get("price_range")).toBeDefined();
			expect(params.get("sort_by")).toBe("rarity_rank");
			expect(params.get("sort_direction")).toBe("asc");
		});

		it("should deserialize filters from URL params", () => {
			const params = new URLSearchParams();
			params.set(
				"traits",
				JSON.stringify([
					{
						trait_type: "Element",
						values: ["Fire"],
						operator: "in",
					},
				]),
			);
			params.set("rarity_rank", JSON.stringify({ min: 1, max: 100 }));
			params.set("sort_by", "price");

			const filters = filterSystem.filtersFromURLParams(params);

			expect(filters.traits).toHaveLength(1);
			expect(filters.traits[0].trait_type).toBe("Element");
			expect(filters.rarity_rank).toEqual({ min: 1, max: 100 });
			expect(filters.sort_by).toBe("price");
		});

		it("should handle invalid URL params gracefully", () => {
			const params = new URLSearchParams();
			params.set("traits", "invalid-json");
			params.set("rarity_rank", "not-json");

			const filters = filterSystem.filtersFromURLParams(params);

			expect(filters.traits).toEqual([]);
			expect(filters.rarity_rank).toBeUndefined();
		});
	});

	describe("edge cases", () => {
		it("should handle NFTs with missing attributes", () => {
			const nftWithoutAttrs: NFTWithTraits = {
				id: "no-attrs",
				tokenId: "999",
				name: "Plain NFT",
				image: "plain.png",
				contractAddress: "0x999",
				// No attributes property
			};

			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Element",
						values: ["Fire"],
						operator: "in",
					},
				],
			};

			const result = filterSystem.applyFilters([nftWithoutAttrs], filters);
			expect(result).toHaveLength(0); // Should be filtered out
		});

		it("should handle mixed numeric and string values", () => {
			const mixedNFT: NFTWithTraits = {
				id: "mixed",
				tokenId: "100",
				name: "Mixed NFT",
				image: "mixed.png",
				contractAddress: "0x100",
				attributes: [
					{ trait_type: "Level", value: "High" }, // String instead of number
					{ trait_type: "Power", value: 1000 },
				],
			};

			const filters: AdvancedNFTFilters = {
				traits: [
					{
						trait_type: "Level",
						values: [50],
						operator: "gt",
					},
				],
			};

			const result = filterSystem.applyFilters([mixedNFT], filters);
			expect(result).toHaveLength(0); // Should handle type mismatch gracefully
		});
	});

	describe("singleton instance", () => {
		it("should provide a singleton instance", () => {
			expect(traitFilterSystem).toBeInstanceOf(TraitFilterSystem);
			expect(traitFilterSystem).toBe(traitFilterSystem); // Same instance
		});
	});
});
