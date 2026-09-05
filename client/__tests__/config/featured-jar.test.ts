import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/deployments.auto", () => ({
	getDeploymentInfo: (chainId: number) =>
		chainId === 42161
			? {
					chainId: 42161,
					factoryAddress: "0xfe367D31d181D305dcF5AAaa345a70A65c345153",
					isV2: true,
					blockNumber: 431219808,
				}
			: undefined,
}));

import {
	ARBITRUM_CHAIN_ID,
	LOCAL_CHAIN_ID,
	parseFeaturedJarEnv,
} from "@/config/featured-jar";

const JAR = "0xF2d6629DeAe335f98AbE540098b64aD55D5fb0Bf";

describe("parseFeaturedJarEnv", () => {
	it("defaults to Arbitrum in production and Anvil in development", () => {
		expect(parseFeaturedJarEnv({ nodeEnv: "production" }).chainId).toBe(
			ARBITRUM_CHAIN_ID
		);
		expect(parseFeaturedJarEnv({ nodeEnv: "development" }).chainId).toBe(
			LOCAL_CHAIN_ID
		);
	});

	it("accepts a valid address and rejects garbage", () => {
		expect(parseFeaturedJarEnv({ address: JAR }).address).toBe(JAR);
		expect(
			parseFeaturedJarEnv({ address: "not-an-address" }).address
		).toBeUndefined();
		expect(parseFeaturedJarEnv({ address: "" }).address).toBeUndefined();
	});

	it("uses the explicit block, then the factory deployment block, then nothing", () => {
		expect(
			parseFeaturedJarEnv({ chainId: "42161", block: "500000000" }).fromBlock
		).toBe(500000000n);
		expect(parseFeaturedJarEnv({ chainId: "42161" }).fromBlock).toBe(
			431219808n
		);
		expect(parseFeaturedJarEnv({ chainId: "31337" }).fromBlock).toBeUndefined();
	});

	it("parses the index and normalises the site url", () => {
		const config = parseFeaturedJarEnv({
			index: "4",
			siteUrl: "https://cookies.greengoods.app/",
		});
		expect(config.index).toBe(4);
		expect(config.siteUrl).toBe("https://cookies.greengoods.app");
		expect(parseFeaturedJarEnv({}).index).toBe(0);
		expect(parseFeaturedJarEnv({}).siteUrl).toBe("http://localhost:3000");
	});
});
