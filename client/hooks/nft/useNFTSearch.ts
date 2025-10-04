import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useDebounce } from "@/hooks/app/useDebounce";
import { type UserNFT, useUserNFTs } from "./useUserNFTs";

export interface NFTSearchFilters {
	verified?: boolean;
	tokenTypes?: ("ERC721" | "ERC1155")[];
	collections?: string[];
}

export interface NFTCollection {
	address: string;
	name: string;
	verified: boolean;
	nftCount: number;
	floorPrice?: number;
}

// Extended NFT interface with search metadata
export interface SearchableNFT extends UserNFT {
	isUserOwned?: boolean;
	matchScore?: number;
	verified?: boolean;
}

export interface NFTSearchResult {
	nfts: SearchableNFT[];
	collections: NFTCollection[];
	totalResults: number;
	isLoading: boolean;
	error: Error | null;
	hasNextPage?: boolean;
	fetchNextPage?: () => void;
	isFetchingNextPage?: boolean;
}

const defaultFilters: NFTSearchFilters = {
	verified: false,
	tokenTypes: ["ERC721", "ERC1155"],
	collections: [],
};

export function useNFTSearch(
	searchQuery: string = "",
	options: {
		enabled?: boolean;
		userCollectionOnly?: boolean;
		contractAddresses?: string[];
		filters?: Partial<NFTSearchFilters>;
	} = {},
): NFTSearchResult {
	const { address: _address } = useAccount();
	const _chainId = useChainId();
	const {
		enabled: _enabled = true,
		userCollectionOnly: _userCollectionOnly = false,
		contractAddresses,
		filters = {},
	} = options;

	const mergedFilters: NFTSearchFilters = { ...defaultFilters, ...filters };
	const debouncedQuery = useDebounce(searchQuery.trim(), 300);

	// Use existing useUserNFTs hook for now
	const {
		nfts: userNfts,
		collections: userCollections,
		isLoading: isLoadingUserNFTs,
		error: userNFTsError,
		refetch: _refetch,
		hasMore,
		loadMore,
	} = useUserNFTs({ contractAddresses });

	// Process and filter NFTs
	const processedResults = useMemo(() => {
		if (!userNfts) return [];

		// Add search metadata to NFTs
		let searchableNfts: SearchableNFT[] = userNfts.map((nft) => ({
			...nft,
			isUserOwned: true,
			matchScore: debouncedQuery ? calculateMatchScore(nft, debouncedQuery) : 1,
			verified: false, // Default value, could be enhanced later
		}));

		// Apply search filter
		if (debouncedQuery) {
			searchableNfts = searchableNfts.filter(
				(nft) => nft.matchScore && nft.matchScore > 0,
			);
		}

		// Apply filters
		if (mergedFilters.tokenTypes && mergedFilters.tokenTypes.length > 0) {
			searchableNfts = searchableNfts.filter((nft) =>
				mergedFilters.tokenTypes?.includes(
					nft.contract.tokenType as "ERC721" | "ERC1155",
				),
			);
		}

		// Filter by contract addresses if specified
		if (contractAddresses && contractAddresses.length > 0) {
			searchableNfts = searchableNfts.filter((nft) =>
				contractAddresses.includes(nft.contract.address),
			);
		}

		// Sort by match score
		if (debouncedQuery) {
			searchableNfts.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
		}

		return searchableNfts;
	}, [userNfts, debouncedQuery, mergedFilters, contractAddresses]);

	// Process collections
	const processedCollections = useMemo(() => {
		if (!userCollections) return [];

		return userCollections.map((collection) => ({
			address: collection.contractAddress,
			name: collection.name || "Unnamed Collection",
			verified: false,
			nftCount: collection.nfts?.length || 0,
			floorPrice: undefined,
		}));
	}, [userCollections]);

	const error = userNFTsError ? new Error(userNFTsError) : null;
	const isLoading = isLoadingUserNFTs;

	return {
		nfts: processedResults,
		collections: processedCollections,
		totalResults: processedResults.length,
		isLoading,
		error,
		hasNextPage: hasMore,
		fetchNextPage: loadMore,
		isFetchingNextPage: false, // useUserNFTs doesn't provide this
	};
}

// Helper function to calculate search relevance score
function calculateMatchScore(nft: UserNFT, query: string): number {
	const queryLower = query.toLowerCase();
	let score = 0;

	// Name match (highest priority)
	if (nft.metadata?.name?.toLowerCase().includes(queryLower)) {
		score += 100;
	}

	// Collection name match
	if (nft.contract.name?.toLowerCase().includes(queryLower)) {
		score += 80;
	}

	// Description match
	if (nft.metadata?.description?.toLowerCase().includes(queryLower)) {
		score += 60;
	}

	// Token ID exact match
	if (nft.tokenId === query) {
		score += 50;
	}

	// Contract address match (partial)
	if (nft.contract.address.toLowerCase().includes(queryLower)) {
		score += 30;
	}

	// Symbol match
	if (nft.contract.symbol?.toLowerCase().includes(queryLower)) {
		score += 40;
	}

	return score;
}

export default useNFTSearch;
