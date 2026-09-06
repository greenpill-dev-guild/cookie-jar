"use client";

import { useReadContract } from "wagmi";
import { FEATURED_JAR } from "@/config/featured-jar";
import { contractAddresses } from "@/config/supported-networks";
import { cookieJarFactoryAbi } from "@/generated";
import {
	type FeaturedJarSource,
	factoryFallbackApplies,
	pickFeaturedJar,
} from "@jar-core/lib/jar/pick-featured-jar";

export interface FeaturedJar {
	address?: `0x${string}`;
	chainId: number;
	fromBlock?: bigint;
	factoryAddress?: `0x${string}`;
	/** Where the address came from: the environment, the factory list, or nowhere. */
	source: FeaturedJarSource;
	isLoading: boolean;
	error?: Error;
}

/**
 * Resolves the jar shown on the home page. The environment wins. Without an address,
 * the jar at NEXT_PUBLIC_FEATURED_JAR_INDEX in the local Anvil factory is used; on a
 * live chain the page shows its "no featured jar" state instead.
 */
export function useFeaturedJar(): FeaturedJar {
	const { address: envAddress, chainId, fromBlock, index } = FEATURED_JAR;
	const factoryAddress = contractAddresses.cookieJarFactory[chainId];

	const shouldReadFactory =
		!envAddress && !!factoryAddress && factoryFallbackApplies(chainId);
	const {
		data: jars,
		isLoading,
		error,
	} = useReadContract({
		address: factoryAddress,
		abi: cookieJarFactoryAbi,
		functionName: "getAllJars",
		chainId,
		query: { enabled: shouldReadFactory },
	});

	const picked = pickFeaturedJar({
		envAddress,
		chainId,
		index,
		jars: jars as readonly `0x${string}`[] | undefined,
	});

	return {
		address: picked.address,
		chainId,
		fromBlock,
		factoryAddress,
		source: picked.source,
		isLoading: shouldReadFactory && isLoading,
		error: shouldReadFactory ? (error ?? undefined) : undefined,
	};
}
