declare namespace NodeJS {
	interface ProcessEnv {
		/** Address of the jar rendered on the home page */
		NEXT_PUBLIC_FEATURED_JAR_ADDRESS?: string;
		/** Block to start scanning history from (defaults to the factory deployment block) */
		NEXT_PUBLIC_FEATURED_JAR_BLOCK?: string;
		/** Fallback: index into the factory's jar list when no address is set (Anvil) */
		NEXT_PUBLIC_FEATURED_JAR_INDEX?: string;
		/** Chain of the featured jar; 42161 in production, 31337 in development */
		NEXT_PUBLIC_DEFAULT_CHAIN_ID?: string;
		/** Public origin, e.g. https://cookies.greengoods.app */
		NEXT_PUBLIC_SITE_URL?: string;
		NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID?: string;
		NEXT_PUBLIC_ALCHEMY_API_KEY?: string;
		/** Set to "true" to enforce the CSP instead of report-only */
		CSP_ENFORCE?: string;
	}
}
