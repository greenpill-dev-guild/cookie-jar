import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
	injectedWallet,
	walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, fallback } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { anvilLocal } from "@jar-core/config/networks";
import { FEATURED_JAR, SITE_NAME, SITE_DESCRIPTION } from "./featured-jar";
export * from "@jar-core/config/networks";
export const supportedChains =
	FEATURED_JAR.chainId === 31337
		? ([anvilLocal, arbitrum] as const)
		: ([arbitrum] as const);
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "";
const alchemyId = import.meta.env.VITE_ALCHEMY_API_KEY;
const rpcUrls = [
	...(alchemyId ? [`https://arb-mainnet.g.alchemy.com/v2/${alchemyId}`] : []),
	"https://arb1.arbitrum.io/rpc",
];
export const wagmiConfig = createConfig({
	chains: supportedChains,
	// Defer persisted connector hydration to an effect, including under StrictMode.
	ssr: true,
	multiInjectedProviderDiscovery: true,
	connectors: connectorsForWallets(
		[
			{
				groupName: "Wallets",
				wallets: [injectedWallet, ...(projectId ? [walletConnectWallet] : [])],
			},
		],
		{
			appName: SITE_NAME,
			appDescription: SITE_DESCRIPTION,
			appUrl: FEATURED_JAR.siteUrl,
			appIcon: `${FEATURED_JAR.siteUrl}/icon.svg`,
			projectId,
		}
	),
	transports: {
		42161: fallback(rpcUrls.map((url) => http(url))),
		31337: http("http://127.0.0.1:8545"),
	},
});
