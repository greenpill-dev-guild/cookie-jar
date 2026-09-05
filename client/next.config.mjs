// Load environment variables from root directory

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Load root .env files in order of precedence
config({ path: resolve(rootDir, ".env.local") });
config({ path: resolve(rootDir, ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Explicitly define environment variables to expose to client-side
	env: {
		NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
			process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
		NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
		NEXT_PUBLIC_FEATURED_JAR_ADDRESS:
			process.env.NEXT_PUBLIC_FEATURED_JAR_ADDRESS,
		NEXT_PUBLIC_FEATURED_JAR_BLOCK: process.env.NEXT_PUBLIC_FEATURED_JAR_BLOCK,
		NEXT_PUBLIC_FEATURED_JAR_INDEX: process.env.NEXT_PUBLIC_FEATURED_JAR_INDEX,
		NEXT_PUBLIC_DEFAULT_CHAIN_ID: process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
	},
	// Security headers. The CSP ships in report-only mode until CSP_ENFORCE=true is set,
	// so wallet flows can be validated in production before the policy blocks anything.
	async headers() {
		const csp = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",
			"style-src 'self' 'unsafe-inline'",
			"font-src 'self' data:",
			"img-src 'self' data: blob: https:",
			"worker-src 'self' blob:",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'self' https://app.safe.global",
			"frame-src https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.walletconnect.org",
			"connect-src 'self' https://*.nodies.app https://*.g.alchemy.com https://arb1.arbitrum.io https://*.blockpi.network https://1rpc.io https://mainnet.base.org https://mainnet.optimism.io https://rpc.gnosischain.com https://forno.celo.org https://sepolia.base.org https://eth.llamarpc.com https://rpc.ankr.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.reown.com https://api.web3modal.org https://enhanced-provider.rainbow.me https://raw.githubusercontent.com https://gateway.pinata.cloud https://ipfs.io http://127.0.0.1:8545 http://localhost:8545 ws://localhost:*",
		].join("; ");
		const cspHeader =
			process.env.CSP_ENFORCE === "true"
				? { key: "Content-Security-Policy", value: csp }
				: { key: "Content-Security-Policy-Report-Only", value: csp };
		const headers = [
			cspHeader,
			{ key: "X-Content-Type-Options", value: "nosniff" },
			{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
			{
				key: "Permissions-Policy",
				value: "camera=(), microphone=(), geolocation=()",
			},
		];
		if (process.env.NODE_ENV === "production") {
			headers.push({
				key: "Strict-Transport-Security",
				value: "max-age=63072000; includeSubDomains",
			});
		}
		return [{ source: "/:path*", headers }];
	},
	typescript: {
		ignoreBuildErrors: false,
	},
	// ⚡ OPTIMIZED: Enable image optimization
	images: {
		remotePatterns: [
			{ protocol: "http", hostname: "localhost" },
			{ protocol: "https", hostname: "raw.githubusercontent.com" },
			{ protocol: "https", hostname: "gateway.pinata.cloud" },
			{ protocol: "https", hostname: "ipfs.io" },
			{ protocol: "https", hostname: "cookies.greengoods.app" },
		],
		formats: ["image/webp", "image/avif"],
		minimumCacheTTL: 60,
		unoptimized: process.env.NODE_ENV === "development", // Skip optimization in dev for faster builds
	},
	experimental: {
		webpackBuildWorker: true,
		parallelServerBuildTraces: true,
		parallelServerCompiles: true,
		scrollRestoration: true, // Enable automatic scroll restoration for route changes
		optimizePackageImports: [
			"@radix-ui/react-icons",
			"lucide-react",
			"@hookform/resolvers",
		],
	},
	// ⚡ Performance optimizations
	compress: true,
	poweredByHeader: false,
	reactStrictMode: true,
	// Removed deprecated swcMinify option - SWC minification is enabled by default in Next.js 13+

	// Configure Turbopack root to avoid multiple lockfile warnings. The resolveAlias entries
	// mirror the webpack aliases below: @coinbase/cdp-sdk (reached through @wagmi/connectors ->
	// @base-org/account) lazily imports optional @x402/* peers, @metamask/sdk optionally loads
	// React Native async storage, and pino optionally loads pino-pretty. None are used here.
	turbopack: {
		root: resolve(__dirname, ".."),
		resolveAlias: {
			"@x402/core": "./lib/app/empty-module.ts",
			"@x402/core/client": "./lib/app/empty-module.ts",
			"@x402/evm": "./lib/app/empty-module.ts",
			"@x402/evm/exact/client": "./lib/app/empty-module.ts",
			"@x402/evm/upto/client": "./lib/app/empty-module.ts",
			"@x402/svm": "./lib/app/empty-module.ts",
			"@x402/svm/exact/client": "./lib/app/empty-module.ts",
			"@x402/extensions": "./lib/app/empty-module.ts",
			"@react-native-async-storage/async-storage": "./lib/app/empty-module.ts",
			"pino-pretty": "./lib/app/empty-module.ts",
		},
	},

	// ⚡ Minimal bundle optimization (aggressive splitting caused 30x slowdown)
	webpack: (config, { isServer, dev }) => {
		// Optional, lazily imported peers of @coinbase/cdp-sdk (reached through
		// @wagmi/connectors -> @base-org/account), @metamask/sdk and pino. None of
		// these code paths run here, so resolve them to empty modules instead of
		// failing the build or warning on every compile.
		config.resolve.alias = {
			...config.resolve.alias,
			"@x402/core": false,
			"@x402/evm": false,
			"@x402/svm": false,
			"@x402/extensions": false,
			"@react-native-async-storage/async-storage": false,
			"pino-pretty": false,
		};

		// Only basic optimizations to avoid performance regressions
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			};
		}

		// REMOVED conflicting optimization settings that conflict with Next.js 15's cacheUnaffected
		// Next.js handles tree shaking and dead code elimination automatically
		// config.optimization = {
		//   ...config.optimization,
		//   usedExports: true,
		//   sideEffects: false,
		// };

		// Bundle analyzer for production builds only
		if (!dev && !isServer && process.env.ANALYZE === "true") {
			const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
			config.plugins.push(
				new BundleAnalyzerPlugin({
					analyzerMode: "static",
					openAnalyzer: false,
				})
			);
		}

		return config;
	},
};

export default nextConfig;
