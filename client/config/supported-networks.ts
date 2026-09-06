import { anvilLocal, supportedChains } from "@jar-core/config/networks";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
	injectedWallet,
	walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, fallback, http } from "wagmi";
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
import { FEATURED_JAR, SITE_DESCRIPTION, SITE_NAME } from "./featured-jar";

export * from "@jar-core/config/networks";

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

// Helper function to create fallback transports with automatic failover
function createFallbackTransport(primary: string[], fallbackUrls: string[]) {
	const transports: ReturnType<typeof http>[] = [];

	// Add primary transports
	primary.forEach((url) => {
		if (url) transports.push(http(url));
	});

	// Add fallback transports
	fallbackUrls.forEach((url) => {
		if (url) transports.push(http(url));
	});

	// If no transports were added, throw error (should not happen)
	if (transports.length === 0) {
		throw new Error("No RPC URLs provided for transport");
	}
	return fallback(transports);
}

// RainbowKit's mobile chooser requires its wallet metadata, including for injected wallets.
function getConnectors() {
	return connectorsForWallets(
		[
			{
				groupName: "Wallets",
				wallets: [
					injectedWallet,
					...(projectId && typeof window !== "undefined"
						? [walletConnectWallet]
						: []),
				],
			},
		],
		{
			appName: SITE_NAME,
			appDescription: SITE_DESCRIPTION,
			appUrl: FEATURED_JAR.siteUrl,
			appIcon: `${FEATURED_JAR.siteUrl}/icon`,
			// No WalletConnect connector is constructed when its project ID is absent.
			projectId: projectId || "",
		}
	);
}

// Export the Wagmi config
export const wagmiConfig = createConfig({
	chains: supportedChains,
	ssr: true,
	multiInjectedProviderDiscovery: true,
	connectors: getConnectors(),
	transports: {
		// Base Mainnet - POKT not available, use Alchemy as secondary
		[base.id]: createFallbackTransport(
			[`https://base-mainnet.g.alchemy.com/v2/${alchemyId}`],
			[
				"https://mainnet.base.org",
				"https://base.blockpi.network/v1/rpc/public",
				"https://1rpc.io/base",
			]
		),
		// Optimism Mainnet
		[optimism.id]: createFallbackTransport(
			[
				"https://op-pokt.nodies.app",
				`https://opt-mainnet.g.alchemy.com/v2/${alchemyId}`,
			],
			[
				"https://mainnet.optimism.io",
				"https://optimism.blockpi.network/v1/rpc/public",
				"https://1rpc.io/op",
			]
		),
		// Arbitrum Mainnet
		[arbitrum.id]: createFallbackTransport(
			[
				"https://arb-pokt.nodies.app",
				`https://arb-mainnet.g.alchemy.com/v2/${alchemyId}`,
			],
			[
				"https://arb1.arbitrum.io/rpc",
				"https://arbitrum.blockpi.network/v1/rpc/public",
				"https://1rpc.io/arb",
			]
		),
		// Gnosis Chain
		[gnosis.id]: createFallbackTransport(
			["https://gnosis-pokt.nodies.app"],
			[
				"https://rpc.gnosischain.com",
				"https://gnosis.blockpi.network/v1/rpc/public",
				"https://1rpc.io/gnosis",
			]
		),
		// Base Sepolia Testnet - POKT not available, keep as is
		[baseSepolia.id]: createFallbackTransport(
			["https://sepolia.base.org"],
			[
				"https://base-sepolia.blockpi.network/v1/rpc/public",
				"https://1rpc.io/base-sepolia",
			]
		),
		// Sepolia Testnet - POKT not available, use Alchemy as secondary
		[sepolia.id]: createFallbackTransport(
			[`https://eth-sepolia.g.alchemy.com/v2/${alchemyId}`],
			[
				"https://rpc.sepolia.org",
				"https://sepolia.blockpi.network/v1/rpc/public",
				"https://1rpc.io/eth-sepolia",
			]
		),
		// Mainnet (Ethereum)
		[mainnet.id]: createFallbackTransport(
			[
				"https://eth-pokt.nodies.app",
				`https://eth-mainnet.g.alchemy.com/v2/${alchemyId}`,
			],
			[
				"https://eth.llamarpc.com",
				"https://rpc.ankr.com/eth",
				"https://ethereum.blockpi.network/v1/rpc/public",
			]
		),
		// Optimism Sepolia Testnet
		[optimismSepolia.id]: createFallbackTransport(
			[
				"https://op-sepolia-pokt.nodies.app",
				`https://opt-sepolia.g.alchemy.com/v2/${alchemyId}`,
			],
			[
				"https://optimism-sepolia.blockpi.network/v1/rpc/public",
				"https://1rpc.io/op-sepolia",
			]
		),
		// Celo Alfajores Testnet - POKT not available, keep as is
		[celoSepolia.id]: createFallbackTransport(
			["https://alfajores-forno.celo-testnet.org"],
			["https://celo-alfajores.blockpi.network/v1/rpc/public"]
		),
		// Celo Mainnet - POKT not available, keep as is
		[celo.id]: createFallbackTransport(
			["https://forno.celo.org"],
			["https://celo.blockpi.network/v1/rpc/public", "https://1rpc.io/celo"]
		),
		// Local Anvil network (only in development)
		...(process.env.NODE_ENV === "development"
			? {
					[anvilLocal.id]: http("http://127.0.0.1:8545"),
				}
			: ({} as Record<number, never>)),
	},
});

// Register the config type globally for TypeScript inference
declare module "wagmi" {
	interface Register {
		config: typeof wagmiConfig;
	}
}
