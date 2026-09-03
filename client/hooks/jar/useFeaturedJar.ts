"use client";

import { useReadContract } from "wagmi";
import { FEATURED_JAR } from "@/config/featured-jar";
import { contractAddresses } from "@/config/supported-networks";
import { cookieJarFactoryAbi } from "@/generated";

export interface FeaturedJar {
	address?: `0x${string}`;
	chainId: number;
	fromBlock?: bigint;
	factoryAddress?: `0x${string}`;
	/** Where the address came from: the environment, the factory list, or nowhere. */
	source: "env" | "factory" | "none";
	isLoading: boolean;
	error?: Error;
}

/**
 * Resolves the jar shown on the home page. The environment wins; otherwise the
 * jar at NEXT_PUBLIC_FEATURED_JAR_INDEX in the chain's factory is used (handy on Anvil).
 */
export function useFeaturedJar(): FeaturedJar {
	const { address: envAddress, chainId, fromBlock, index } = FEATURED_JAR;
	const factoryAddress = contractAddresses.cookieJarFactory[chainId];

	const shouldReadFactory = !envAddress && !!factoryAddress;
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

	if (envAddress) {
		return {
			address: envAddress,
			chainId,
			fromBlock,
			factoryAddress,
			source: "env",
			isLoading: false,
		};
	}

	const fromFactory = (jars as readonly `0x${string}`[] | undefined)?.[index];
	return {
		address: fromFactory,
		chainId,
		fromBlock,
		factoryAddress,
		source: fromFactory ? "factory" : "none",
		isLoading: shouldReadFactory && isLoading,
		error: error ?? undefined,
	};
}
