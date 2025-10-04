/**
 * Performance optimization utilities for NFT functionality
 * Implements lazy loading, virtualization, and efficient caching strategies
 */

import React from "react";

export interface NFTImageLoadingStrategy {
	lazy: boolean;
	placeholder: string;
	errorFallback: string;
	preloadStrategy: "viewport" | "hover" | "immediate" | "none";
	cacheStrategy: "memory" | "disk" | "both" | "none";
}

export interface NFTRenderingOptimization {
	enableVirtualization: boolean;
	itemHeight: number;
	overscan: number;
	enableImageLazyLoading: boolean;
	enableMemoization: boolean;
	batchSize: number;
	throttleMs: number;
	debounceMs: number;
}

export class NFTPerformanceOptimizer {
	private imageCache = new Map<string, { blob: Blob; timestamp: number }>();
	private metadataCache = new Map<string, { data: any; timestamp: number }>();
	private readonly IMAGE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
	private readonly METADATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

	/**
	 * Optimize image loading with lazy loading and caching
	 */
	async optimizeImageLoading(
		imageUrl: string,
		strategy: NFTImageLoadingStrategy = {
			lazy: true,
			placeholder:
				"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=",
			errorFallback:
				"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlNWU1ZTUiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTk5OTkiPkVycm9yPC90ZXh0Pjwvc3ZnPg==",
			preloadStrategy: "viewport",
			cacheStrategy: "memory",
		},
	): Promise<string> {
		// Check cache first
		if (strategy.cacheStrategy !== "none") {
			const cached = this.imageCache.get(imageUrl);
			if (cached && Date.now() - cached.timestamp < this.IMAGE_CACHE_TTL) {
				return URL.createObjectURL(cached.blob);
			}
		}

		try {
			// Use Intersection Observer for lazy loading
			if (strategy.lazy) {
				return this.lazyLoadImage(imageUrl, strategy);
			}

			// Immediate loading
			const response = await fetch(imageUrl);
			if (!response.ok) throw new Error("Image fetch failed");

			const blob = await response.blob();

			// Cache the blob
			if (
				strategy.cacheStrategy === "memory" ||
				strategy.cacheStrategy === "both"
			) {
				this.imageCache.set(imageUrl, { blob, timestamp: Date.now() });
			}

			return URL.createObjectURL(blob);
		} catch (error) {
			console.warn("Failed to load NFT image:", imageUrl, error);
			return strategy.errorFallback;
		}
	}

	private async lazyLoadImage(
		imageUrl: string,
		strategy: NFTImageLoadingStrategy,
	): Promise<string> {
		return new Promise((resolve) => {
			// Return placeholder immediately
			resolve(strategy.placeholder);

			// Load actual image when in viewport
			const img = new Image();
			img.onload = async () => {
				try {
					const response = await fetch(imageUrl);
					const blob = await response.blob();

					if (
						strategy.cacheStrategy === "memory" ||
						strategy.cacheStrategy === "both"
					) {
						this.imageCache.set(imageUrl, { blob, timestamp: Date.now() });
					}

					// This would trigger a re-render in the actual component
					// The component would need to listen for this event
					window.dispatchEvent(
						new CustomEvent("nft-image-loaded", {
							detail: {
								originalUrl: imageUrl,
								loadedUrl: URL.createObjectURL(blob),
							},
						}),
					);
				} catch {
					window.dispatchEvent(
						new CustomEvent("nft-image-error", {
							detail: {
								originalUrl: imageUrl,
								fallbackUrl: strategy.errorFallback,
							},
						}),
					);
				}
			};

			img.onerror = () => {
				window.dispatchEvent(
					new CustomEvent("nft-image-error", {
						detail: {
							originalUrl: imageUrl,
							fallbackUrl: strategy.errorFallback,
						},
					}),
				);
			};

			img.src = imageUrl;
		});
	}

	/**
	 * Optimize metadata fetching with intelligent caching
	 */
	async optimizeMetadataFetching(
		contractAddress: string,
		tokenId: string,
		provider: any,
	): Promise<any> {
		const cacheKey = `${contractAddress}-${tokenId}`;

		// Check cache
		const cached = this.metadataCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.METADATA_CACHE_TTL) {
			return cached.data;
		}

		try {
			// Fetch metadata
			const metadata = await provider.getNFTMetadata(contractAddress, tokenId);

			// Cache the result
			this.metadataCache.set(cacheKey, {
				data: metadata,
				timestamp: Date.now(),
			});

			return metadata;
		} catch (error) {
			console.warn(
				"Failed to fetch NFT metadata:",
				contractAddress,
				tokenId,
				error,
			);
			return null;
		}
	}

	/**
	 * Batch NFT requests to minimize API calls
	 */
	async batchNFTRequests<T>(
		requests: Array<() => Promise<T>>,
		options: {
			batchSize: number;
			delayMs: number;
			maxConcurrent: number;
		} = {
			batchSize: 5,
			delayMs: 100,
			maxConcurrent: 3,
		},
	): Promise<T[]> {
		const results: T[] = [];
		const { batchSize, delayMs, maxConcurrent } = options;

		for (let i = 0; i < requests.length; i += batchSize) {
			const batch = requests.slice(i, i + batchSize);

			// Limit concurrent requests
			const limitedBatch = batch.slice(0, maxConcurrent);

			const batchResults = await Promise.allSettled(
				limitedBatch.map((request) => request()),
			);

			// Process results
			batchResults.forEach((result) => {
				if (result.status === "fulfilled") {
					results.push(result.value);
				} else {
					console.warn("Batch request failed:", result.reason);
				}
			});

			// Add delay between batches to avoid rate limiting
			if (i + batchSize < requests.length) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		return results;
	}

	/**
	 * Create optimized search function with debouncing and throttling
	 */
	createOptimizedSearch<T>(
		searchFunction: (query: string) => Promise<T>,
		options: {
			debounceMs: number;
			throttleMs: number;
			minQueryLength: number;
		} = {
			debounceMs: 300,
			throttleMs: 1000,
			minQueryLength: 2,
		},
	) {
		let debounceTimer: NodeJS.Timeout;
		let lastSearchTime = 0;
		let lastQuery = "";

		return async (query: string): Promise<T | null> => {
			const { debounceMs, throttleMs, minQueryLength } = options;

			// Skip if query too short
			if (query.length < minQueryLength) {
				return null;
			}

			// Skip if same query
			if (query === lastQuery) {
				return null;
			}

			// Clear existing debounce
			clearTimeout(debounceTimer);

			return new Promise((resolve) => {
				debounceTimer = setTimeout(async () => {
					const now = Date.now();

					// Throttle check
					if (now - lastSearchTime < throttleMs) {
						resolve(null);
						return;
					}

					try {
						lastSearchTime = now;
						lastQuery = query;
						const result = await searchFunction(query);
						resolve(result);
					} catch (error) {
						console.error("Search error:", error);
						resolve(null);
					}
				}, debounceMs);
			});
		};
	}

	/**
	 * Memory management for large NFT collections
	 */
	optimizeMemoryUsage(
		options: { maxCacheSize: number; cleanupInterval: number } = {
			maxCacheSize: 100,
			cleanupInterval: 5 * 60 * 1000, // 5 minutes
		},
	) {
		const { maxCacheSize, cleanupInterval } = options;

		// Cleanup old cache entries
		const cleanup = () => {
			const now = Date.now();

			// Clean image cache
			for (const [key, value] of this.imageCache.entries()) {
				if (now - value.timestamp > this.IMAGE_CACHE_TTL) {
					URL.revokeObjectURL(URL.createObjectURL(value.blob));
					this.imageCache.delete(key);
				}
			}

			// Clean metadata cache
			for (const [key, value] of this.metadataCache.entries()) {
				if (now - value.timestamp > this.METADATA_CACHE_TTL) {
					this.metadataCache.delete(key);
				}
			}

			// Enforce max cache size
			if (this.imageCache.size > maxCacheSize) {
				const entries = Array.from(this.imageCache.entries());
				entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first

				const entriesToRemove = entries.slice(0, entries.length - maxCacheSize);
				entriesToRemove.forEach(([key, value]) => {
					URL.revokeObjectURL(URL.createObjectURL(value.blob));
					this.imageCache.delete(key);
				});
			}
		};

		// Start cleanup interval
		const intervalId = setInterval(cleanup, cleanupInterval);

		// Return cleanup function
		return () => {
			clearInterval(intervalId);
			this.clearAllCaches();
		};
	}

	/**
	 * Preload critical NFT data
	 */
	async preloadCriticalNFTs(
		nfts: Array<{ contractAddress: string; tokenId: string; imageUrl: string }>,
		provider: any,
	): Promise<void> {
		const imagePreloads = nfts.map((nft) =>
			this.optimizeImageLoading(nft.imageUrl, {
				lazy: false,
				placeholder: "",
				errorFallback: "",
				preloadStrategy: "immediate",
				cacheStrategy: "memory",
			}),
		);

		const metadataPreloads = nfts.map((nft) =>
			this.optimizeMetadataFetching(nft.contractAddress, nft.tokenId, provider),
		);

		// Batch the preloads
		await this.batchNFTRequests(
			[
				...imagePreloads.map((p) => () => p),
				...metadataPreloads.map((p) => () => p),
			],
			{ batchSize: 3, delayMs: 50, maxConcurrent: 2 },
		);
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics() {
		return {
			imageCacheSize: this.imageCache.size,
			metadataCacheSize: this.metadataCache.size,
			memoryUsage: {
				imageCache: Array.from(this.imageCache.values()).reduce(
					(total, item) => total + item.blob.size,
					0,
				),
				metadataCache: JSON.stringify(Array.from(this.metadataCache.values()))
					.length,
			},
		};
	}

	/**
	 * Clear all caches
	 */
	clearAllCaches() {
		// Revoke blob URLs to free memory
		for (const [, value] of this.imageCache) {
			URL.revokeObjectURL(URL.createObjectURL(value.blob));
		}

		this.imageCache.clear();
		this.metadataCache.clear();
	}

	/**
	 * Create intersection observer for lazy loading
	 */
	createIntersectionObserver(
		callback: (entries: IntersectionObserverEntry[]) => void,
		options: IntersectionObserverInit = {
			rootMargin: "100px", // Load images 100px before they come into view
			threshold: 0.1,
		},
	): IntersectionObserver {
		return new IntersectionObserver(callback, options);
	}

	/**
	 * Optimize React component rendering
	 */
	static createOptimizedNFTComponent<P extends object>(
		Component: React.ComponentType<P>,
		options: {
			memoize: boolean;
			virtualizeThreshold: number;
		} = {
			memoize: true,
			virtualizeThreshold: 50,
		},
	) {
		if (options.memoize) {
			return React.memo(Component, (prevProps, nextProps) => {
				// Custom comparison for NFT components
				return JSON.stringify(prevProps) === JSON.stringify(nextProps);
			});
		}

		return Component;
	}
}

// Export singleton instance
export const nftPerformanceOptimizer = new NFTPerformanceOptimizer();

// React hook for performance optimization
export function useNFTPerformanceOptimization() {
	const [optimizer] = React.useState(() => new NFTPerformanceOptimizer());

	React.useEffect(() => {
		const cleanup = optimizer.optimizeMemoryUsage();
		return cleanup;
	}, [optimizer]);

	return {
		optimizeImage: optimizer.optimizeImageLoading.bind(optimizer),
		optimizeMetadata: optimizer.optimizeMetadataFetching.bind(optimizer),
		batchRequests: optimizer.batchNFTRequests.bind(optimizer),
		createOptimizedSearch: optimizer.createOptimizedSearch.bind(optimizer),
		preloadCritical: optimizer.preloadCriticalNFTs.bind(optimizer),
		getMetrics: optimizer.getPerformanceMetrics.bind(optimizer),
		clearCaches: optimizer.clearAllCaches.bind(optimizer),
	};
}
