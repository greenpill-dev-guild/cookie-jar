const LOCAL_CHAIN_ID = 31337;

export type FeaturedJarSource = "env" | "factory" | "none";

export interface PickFeaturedJarInput {
	envAddress?: `0x${string}`;
	chainId: number;
	index: number;
	jars?: readonly `0x${string}`[];
}

export interface PickedFeaturedJar {
	address?: `0x${string}`;
	source: FeaturedJarSource;
}

/**
 * The factory-index fallback exists for the Anvil seed only. On a live chain the
 * factory list belongs to other people's jars, so a missing address means
 * "nothing to show", never "show whichever jar comes first".
 */
export function factoryFallbackApplies(chainId: number): boolean {
	return chainId === LOCAL_CHAIN_ID;
}

/** The configured address wins; otherwise the seeded jar at `index`, on Anvil only. */
export function pickFeaturedJar({
	envAddress,
	chainId,
	index,
	jars,
}: PickFeaturedJarInput): PickedFeaturedJar {
	if (envAddress) return { address: envAddress, source: "env" };
	if (!factoryFallbackApplies(chainId)) return { source: "none" };
	const fromFactory = jars?.[index];
	return fromFactory
		? { address: fromFactory, source: "factory" }
		: { source: "none" };
}
