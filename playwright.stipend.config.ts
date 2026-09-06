import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	testMatch: [
		"featured-jar.spec.ts",
		"stipend-ui.spec.ts",
		"jar-creation.spec.ts",
		"jar-operations.spec.ts",
		"admin-functions.spec.ts",
		"stipend-release-qa.spec.ts",
		"stipend-navigation.spec.ts",
	],
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 60000,
	expect: { timeout: 10000 },
	use: {
		baseURL: process.env.STIPEND_QA_URL || "http://127.0.0.1:3041",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		navigationTimeout: 30000,
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{
			name: "mobile",
			use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } },
		},
	],
	outputDir: "stipend/test-results",
	reporter: [
		["list"],
		["json", { outputFile: "stipend/test-results/results.json" }],
	],
});
