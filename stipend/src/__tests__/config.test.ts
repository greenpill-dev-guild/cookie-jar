import { describe, expect, it } from "vitest";
import { parseStipendEnv } from "../config/environment";

describe("standalone stipend environment", () => {
	it("defaults to Arbitrum with no implicitly selected production jar", () => {
		const config = parseStipendEnv({});
		expect(config.chainId).toBe(42161);
		expect(config.address).toBeUndefined();
		expect(config.fromBlock).toBe(435607756n);
		expect(config.siteUrl).toBe("https://cookies.greengoods.app");
	});
	it("accepts its own Vite configuration for local Anvil", () => {
		expect(
			parseStipendEnv({
				VITE_DEFAULT_CHAIN_ID: "31337",
				VITE_FEATURED_JAR_INDEX: "4",
				VITE_SITE_URL: "http://localhost:3041",
			})
		).toMatchObject({
			chainId: 31337,
			index: 4,
			siteUrl: "http://localhost:3041",
		});
	});
	it.each([
		{ VITE_DEFAULT_CHAIN_ID: "oops" },
		{ VITE_FEATURED_JAR_ADDRESS: "0x123" },
		{ VITE_FEATURED_JAR_BLOCK: "-1" },
		{ VITE_SITE_URL: "javascript:alert(1)" },
	])("rejects invalid explicit configuration %j", (env) => {
		expect(() => parseStipendEnv(env)).toThrow();
	});
});
