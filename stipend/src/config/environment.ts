import { isAddress } from "viem";
import { getDeploymentInfo } from "../../../shared/src/config/deployments.auto";
export interface StipendEnv {
	[key: `VITE_${string}`]: string | undefined;
}
export function parseStipendEnv(env: StipendEnv) {
	const integer = (key: string, fallback?: number) => {
		const value = env[`VITE_${key}`];
		if (!value?.trim()) return fallback;
		if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
			throw new Error(`Invalid VITE_${key}`);
		return Number(value);
	};
	const chainId = integer("DEFAULT_CHAIN_ID", 42161)!;
	if (![42161, 31337].includes(chainId))
		throw new Error("The stipend supports Arbitrum One and local Anvil.");
	const address = env.VITE_FEATURED_JAR_ADDRESS?.trim() || undefined;
	if (address && !isAddress(address))
		throw new Error("Invalid VITE_FEATURED_JAR_ADDRESS");
	const siteUrl = env.VITE_SITE_URL?.trim() || "https://cookies.greengoods.app";
	const url = new URL(siteUrl);
	if (
		!["http:", "https:"].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== "/"
	)
		throw new Error("VITE_SITE_URL must be an HTTP(S) origin.");
	const block = integer(
		"FEATURED_JAR_BLOCK",
		getDeploymentInfo(chainId)?.blockNumber
	);
	return {
		chainId,
		address: address as `0x${string}` | undefined,
		index: integer("FEATURED_JAR_INDEX", 4)!,
		fromBlock: block === undefined ? undefined : BigInt(block),
		siteUrl: url.origin,
	};
}
