import type { FullConfig } from "@playwright/test";

async function globalSetup(_config: FullConfig) {
	console.log("🚀 Setting up E2E test environment...");

	// Wait for your existing development environment to be ready
	await waitForServices();

	// Verify contracts are deployed (using your existing setup)
	await verifyContracts();

	console.log("✅ E2E environment ready");
}

async function waitForServices() {
	const services = [
		{
			name: "Anvil Blockchain",
			url: "http://127.0.0.1:8545",
			method: "POST",
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "eth_blockNumber",
				params: [],
				id: 1,
			}),
		},
		{
			name: "Next.js Client",
			url: "http://localhost:3000",
			method: "GET",
		},
	];

	for (const service of services) {
		console.log(`⏳ Waiting for ${service.name}...`);

		let attempts = 0;
		const maxAttempts = 60; // 2 minutes total

		while (attempts < maxAttempts) {
			try {
				const response = await fetch(service.url, {
					method: service.method,
					headers: { "Content-Type": "application/json" },
					...(service.body && { body: service.body }),
				});

				if (response.ok) {
					console.log(`✅ ${service.name} is ready`);
					break;
				}
			} catch {
				// Service not ready yet
			}

			attempts++;
			await new Promise((resolve) => setTimeout(resolve, 2000));

			if (attempts >= maxAttempts) {
				throw new Error(
					`❌ ${service.name} failed to start within 2 minutes. Make sure 'pnpm dev' is running.`,
				);
			}
		}
	}
}

async function verifyContracts() {
	try {
		// Check if deployment file exists (created by your DeployLocal.s.sol)
		const response = await fetch(
			"http://localhost:3000/contracts/local-deployment.json",
		);

		if (!response.ok) {
			throw new Error(
				"Deployment file not found. Ensure contracts are deployed with `pnpm dev`.",
			);
		}

		const deployment = await response.json();

		if (!deployment.CookieJarFactory) {
			throw new Error("CookieJarFactory not deployed. Check deployment logs.");
		}

		console.log("✅ Contracts verified:", {
			factory: deployment.CookieJarFactory,
			timestamp: new Date(deployment.timestamp || Date.now()).toISOString(),
		});

		// Store deployment info for tests
		process.env.TEST_FACTORY_ADDRESS = deployment.CookieJarFactory;
		process.env.TEST_NFT_ADDRESS = deployment.CookieMonsterNFT || "";
		process.env.TEST_TOKEN_ADDRESS = deployment.DemoToken || "";
	} catch (error) {
		console.error("❌ Contract verification failed:", error);
		console.log("\n💡 Make sure to run `pnpm dev` before running E2E tests");
		console.log(
			"   This will start Anvil, deploy contracts, and start the client",
		);
		throw error;
	}
}

export default globalSetup;
