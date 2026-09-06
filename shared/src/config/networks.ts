import { ETH_ADDRESS } from "@jar-core/lib/blockchain/constants";
import {
	arbitrum,
	base,
	baseSepolia,
	celo,
	celoSepolia,
	gnosis,
	mainnet,
	optimism,
	optimismSepolia,
	sepolia,
} from "wagmi/chains";

// Import auto-generated deployment configuration
// This file is automatically updated when contracts are deployed
import {
	FACTORY_ADDRESSES as AUTO_FACTORY_ADDRESSES,
	V2_CHAINS as AUTO_V2_CHAINS,
	isV2Chain as autoIsV2Chain,
} from "./deployments.auto";

// Re-export auto-generated configuration
export const V2_CHAINS = AUTO_V2_CHAINS;

// Helper function to check if a chain uses v2 contracts (auto-generated)
export function isV2Chain(chainId: number): boolean {
	return autoIsV2Chain(chainId);
}

// POAP token contract is only supported on Gnosis Chain for on-chain gating.
const POAP_SUPPORTED_CHAINS = new Set<number>([gnosis.id]);

export function isPoapSupportedChain(chainId: number): boolean {
	return POAP_SUPPORTED_CHAINS.has(chainId);
}

// Local Anvil chain (Pure local development without fork)
export const anvilLocal = {
	id: 31337,
	name: "Anvil Local",
	network: "anvil-local",
	nativeCurrency: {
		decimals: 18,
		name: "Ether",
		symbol: "ETH",
	},
	rpcUrls: {
		default: { http: ["http://127.0.0.1:8545"] },
		public: { http: ["http://127.0.0.1:8545"] },
	},
	blockExplorers: {
		default: { name: "Local", url: "http://127.0.0.1:8545" },
	},
	// No multicall3 contract in pure local mode - wagmi will fallback to individual calls
	testnet: true,
} as const;

import type { Chain } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";

// For RainbowKit provider (include local only in dev). The first chain is the
// default when no wallet is connected, so the featured jar's chain leads.
const chains = [
	arbitrum,
	base,
	celo,
	gnosis,
	optimism,
	baseSepolia,
	optimismSepolia,
	// celoSepolia,
	// Mainnets
	// mainnet,
];

// Add local development chain in dev mode
export const supportedChains = (
	process.env.NODE_ENV === "development" ? [anvilLocal, ...chains] : chains
) as readonly [Chain, ...Chain[]];

interface ContractAddresses {
	cookieJarFactory: Record<number, Address>;
}

// Chain-specific native currency configuration
export interface NativeCurrency {
	symbol: string;
	name: string;
	decimals: number;
	address: Address; // Special address to represent native currency
}

export const nativeCurrencies: Record<number, NativeCurrency> = {
	[mainnet.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[base.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[optimism.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[arbitrum.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[gnosis.id]: {
		symbol: "xDAI",
		name: "xDAI",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[baseSepolia.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[sepolia.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[optimismSepolia.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[celoSepolia.id]: {
		symbol: "CELO",
		name: "Celo",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[celo.id]: {
		symbol: "CELO",
		name: "Celo",
		decimals: 18,
		address: ETH_ADDRESS,
	},
	[anvilLocal.id]: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		address: ETH_ADDRESS,
	},
};

export function getNativeCurrency(chainId: number): NativeCurrency {
	return nativeCurrencies[chainId] || nativeCurrencies[mainnet.id];
}

// Auto-generated factory addresses from deployments
export const contractAddresses: ContractAddresses = {
	cookieJarFactory: {
		// Legacy addresses (manually maintained)
		[gnosis.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
		[base.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
		[optimism.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
		[celo.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
		[optimismSepolia.id]:
			"0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,
		[mainnet.id]: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9" as Address,

		// Auto-generated addresses - DO NOT EDIT MANUALLY!
		// These are automatically updated by the deployment script
		...Object.fromEntries(
			Object.entries(AUTO_FACTORY_ADDRESSES).map(([chainId, address]) => [
				parseInt(chainId, 10),
				address as Address,
			])
		),
	},
};
