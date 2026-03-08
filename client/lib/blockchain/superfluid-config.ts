import { Framework } from "@superfluid-finance/sdk-core";

/**
 * Chain-specific RPC URLs for Superfluid framework initialization
 */
const SUPERFLUID_RPC_URLS = {
	// Mainnet deployments
	1: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY", // Ethereum
	8453: "https://mainnet.base.org", // Base
	10: "https://mainnet.optimism.io", // Optimism
	42161: "https://arb1.arbitrum.io/rpc", // Arbitrum One
	137: "https://polygon-rpc.com", // Polygon
	81457: "https://blast.blockpi.network/v1/rpc/public", // Blast
	7777777: "https://rpc.zora.energy", // Zora
	480: "https://mainnet.rpc.0g.ai", // Worldchain
	57073: "https://rpc.inkonchain.com", // Ink
	1868: "https://mainnet.rpc.soneium.org", // Soneium
	43114: "https://api.avax.network/ext/bc/C/rpc", // Avalanche
	56: "https://bsc-dataseed1.binance.org", // BNB Smart Chain
	130: "https://rpc.unichain.org", // Unichain

	// Testnet deployments
	11155111: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // Sepolia
	84532: "https://sepolia.base.org", // Base Sepolia
	421614: "https://sepolia.arbitrum.io/rpc", // Arbitrum Sepolia
	80002: "https://rpc-amoy.polygon.technology", // Polygon Amman
	1301: "https://sepolia.unichain.org", // Unichain Sepolia
	420120000: "https://rpc.interop-alpha-0.testnet", // interop-alpha-0
	420120001: "https://rpc.interop-alpha-1.testnet", // interop-alpha-1
} as const;

/**
 * Supported chains for Superfluid operations
 */
export type SupportedSuperfluidChain = keyof typeof SUPERFLUID_RPC_URLS;

/**
 * Create and initialize Superfluid Framework for a specific chain
 */
export const createSuperfluidFramework = async (chainId: number) => {
	const rpcUrl = SUPERFLUID_RPC_URLS[chainId as SupportedSuperfluidChain];

	if (!rpcUrl) {
		throw new Error(`Superfluid not supported on chain ${chainId}`);
	}

	// For local development, use environment variables or default to localhost
	const providerUrl =
		chainId === 31337
			? "http://localhost:8545"
			: rpcUrl.replace(
					"YOUR_INFURA_KEY",
					process.env.NEXT_PUBLIC_INFURA_KEY || "",
				);

	return await Framework.create({
		chainId,
		provider: providerUrl as any, // Type cast: Superfluid SDK accepts RPC URL string
	});
};

/**
 * Check if Superfluid is available on a given chain
 */
export const isSuperfluidSupported = (
	chainId: number,
): chainId is SupportedSuperfluidChain => {
	return chainId in SUPERFLUID_RPC_URLS;
};

/**
 * Get Superfluid RPC URL for a chain
 */
export const getSuperfluidRpcUrl = (chainId: number): string | null => {
	return SUPERFLUID_RPC_URLS[chainId as SupportedSuperfluidChain] || null;
};

/**
 * Common Superfluid token addresses by chain
 */
export const SUPERFLUID_TOKENS = {
	// ETHx (Super ETH) addresses
	1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on mainnet (used as ETHx)
	8453: "0x4200000000000000000000000000000000000006", // WETH on Base
	10: "0x4200000000000000000000000000000000000006", // WETH on Optimism
	42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arbitrum
	137: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WMATIC on Polygon

	// Testnet ETHx addresses
	11155111: "0x7b8007023101C7B107C103B155b068B285e53d7a", // ETHx on Sepolia
	84532: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
} as const;

/**
 * Get Superfluid token address for a chain
 */
export const getSuperfluidTokenAddress = (
	chainId: number,
	symbol: "ETHx" | "USDCx" | "DAIx" = "ETHx",
): string | null => {
	if (symbol === "ETHx") {
		return SUPERFLUID_TOKENS[chainId as keyof typeof SUPERFLUID_TOKENS] || null;
	}

	// Add other token mappings as needed
	return null;
};
