import { isAddress } from "viem";
import { getDeploymentInfo } from "./deployments.auto";

export const ARBITRUM_CHAIN_ID = 42161;
export const LOCAL_CHAIN_ID = 31337;

/** Raw environment values, exactly as Next.js inlines them. */
export interface FeaturedJarEnv {
	address?: string;
	chainId?: string;
	block?: string;
	index?: string;
	siteUrl?: string;
	nodeEnv?: string;
}

export interface FeaturedJarConfig {
	/** Jar to render on the home page. Undefined means "pick from the factory". */
	address?: `0x${string}`;
	/** Chain the featured jar lives on (defaults to Arbitrum One, Anvil in development). */
	chainId: number;
	/** First block to scan for history (defaults to the factory deployment block). */
	fromBlock?: bigint;
	/** Index into the factory's jar list used when no address is configured. */
	index: number;
	/** Public origin of the site, used for metadata and WalletConnect. */
	siteUrl: string;
}

function parseNonNegativeInt(value: string | undefined): number | undefined {
	if (value === undefined || value.trim() === "") return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) return undefined;
	return parsed;
}

export function parseFeaturedJarEnv(env: FeaturedJarEnv): FeaturedJarConfig {
	const isDevelopment = env.nodeEnv === "development";
	const chainId =
		parseNonNegativeInt(env.chainId) ??
		(isDevelopment ? LOCAL_CHAIN_ID : ARBITRUM_CHAIN_ID);
	const address =
		env.address && isAddress(env.address)
			? (env.address as `0x${string}`)
			: undefined;
	const blockNumber =
		parseNonNegativeInt(env.block) ?? getDeploymentInfo(chainId)?.blockNumber;
	const siteUrl =
		env.siteUrl && env.siteUrl.trim() !== ""
			? env.siteUrl.trim().replace(/\/+$/, "")
			: "http://localhost:3000";

	return {
		address,
		chainId,
		fromBlock: blockNumber !== undefined ? BigInt(blockNumber) : undefined,
		index: parseNonNegativeInt(env.index) ?? 0,
		siteUrl,
	};
}

// Next.js only inlines literal process.env references, so keep them spelled out.
export const FEATURED_JAR: FeaturedJarConfig = parseFeaturedJarEnv({
	address: process.env.NEXT_PUBLIC_FEATURED_JAR_ADDRESS,
	chainId: process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID,
	block: process.env.NEXT_PUBLIC_FEATURED_JAR_BLOCK,
	index: process.env.NEXT_PUBLIC_FEATURED_JAR_INDEX,
	siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
	nodeEnv: process.env.NODE_ENV,
});

export const SITE_NAME = "Cookie Jar";
export const SITE_DESCRIPTION =
	"Create and manage shared funding pools with clear rules for claims and deposits.";
