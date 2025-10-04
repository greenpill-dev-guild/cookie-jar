import { SELECTORS } from "./utils/constants";
import { expect, test } from "./utils/wallet-utils";

test.describe("🏗️ Jar Creation E2E", () => {
	test.beforeEach(async ({ wallet }) => {
		// Connect as Deployer (admin account)
		await wallet.connectWallet(0);
	});

	test("Create basic ETH jar with allowlist access", async ({
		page,
		wallet,
	}) => {
		console.log("🏗️ Testing basic ETH jar creation...");

		// Navigate to create page
		await page.click(SELECTORS.navigation.createJar);
		await expect(page).toHaveURL("/create");

		// Step 1: Basic Configuration
		console.log("📝 Filling basic configuration...");
		await page.fill(SELECTORS.forms.jarName, "E2E Test Jar");
		await page.fill(
			SELECTORS.forms.jarDescription,
			"Created by automated E2E test",
		);

		// Select ETH currency
		const currencySelect = page.locator(SELECTORS.forms.currency).first();
		if (await currencySelect.isVisible()) {
			await currencySelect.selectOption({ label: "ETH" });
		}

		await page.click(SELECTORS.buttons.next);

		// Step 2: Withdrawal Settings
		console.log("⚙️ Configuring withdrawal settings...");
		await page.click("text=Fixed Amount");
		await page.fill('input:below(:text("Amount"))', "0.1");
		await page.fill('input:below(:text("Interval"))', "7");
		await page.click(SELECTORS.buttons.next);

		// Step 3: Access Control (only on v2 contracts)
		const hasAccessStep = await page.isVisible("text=Access Control");
		if (hasAccessStep) {
			console.log("🔒 Configuring access control (v2)...");
			await page.click(SELECTORS.access.allowlist);
			await page.click(SELECTORS.buttons.next);
		} else {
			console.log("ℹ️ Skipping access control (v1 contract)");
		}

		// Final step: Create jar
		console.log("🚀 Creating jar...");
		await page.click(SELECTORS.buttons.primary);

		// Wait for transaction to be processed
		await wallet.signTransaction();

		// Verify success message
		await expect(page.locator(SELECTORS.status.success)).toBeVisible({
			timeout: 30000,
		});

		// Should redirect to jar page
		await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/, { timeout: 30000 });

		// Verify jar was created with correct data
		await expect(page.locator(SELECTORS.cards.jarTitle)).toContainText(
			"E2E Test Jar",
		);

		console.log("✅ Basic jar creation test passed!");
	});

	test("Create NFT-gated jar (v2 contracts only)", async ({ page, wallet }) => {
		console.log("🎨 Testing NFT-gated jar creation...");

		await page.goto("/create");

		// Check if NFT gating is available (v2 only)
		const hasNFTOption = await page.isVisible(SELECTORS.access.nftGated);
		test.skip(
			!hasNFTOption,
			"NFT gating not available - requires v2 contracts",
		);

		// Basic setup
		await page.fill(SELECTORS.forms.jarName, "NFT Test Jar");
		await page.fill(
			SELECTORS.forms.jarDescription,
			"NFT-gated jar for testing",
		);

		// Select DEMO token if available
		const currencySelect = page.locator(SELECTORS.forms.currency).first();
		if (await currencySelect.isVisible()) {
			await currencySelect.selectOption({ label: "DEMO" });
		}

		await page.click(SELECTORS.buttons.next);

		// Withdrawal settings
		await page.click("text=Variable Amount");
		await page.fill('input:below(:text("Maximum"))', "1000");
		await page.fill('input:below(:text("Interval"))', "14");
		await page.click(SELECTORS.buttons.next);

		// NFT gating setup
		console.log("🔒 Configuring NFT gating...");
		await page.click(SELECTORS.access.nftGated);

		// Use the Cookie Monster NFT from your seeded environment
		const nftAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
		await page.fill(SELECTORS.nft.addressInput, nftAddress);

		// Select ERC721 type
		const typeSelect = page.locator(SELECTORS.nft.typeSelect).first();
		if (await typeSelect.isVisible()) {
			await typeSelect.selectOption("ERC721");
		}

		// Wait for NFT validation
		await page.waitForSelector(SELECTORS.nft.validation, { timeout: 10000 });

		// Add NFT gate
		await page.click(SELECTORS.buttons.add);

		// Verify NFT was added to list
		await expect(page.locator(`text=${nftAddress.slice(0, 8)}`)).toBeVisible();

		await page.click(SELECTORS.buttons.next);

		// Create jar
		console.log("🚀 Creating NFT-gated jar...");
		await page.click(SELECTORS.buttons.primary);
		await wallet.signTransaction();

		await expect(page.locator(SELECTORS.status.success)).toBeVisible({
			timeout: 30000,
		});
		await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/);

		// Verify NFT-gated jar was created
		await expect(page.locator(SELECTORS.cards.jarTitle)).toContainText(
			"NFT Test Jar",
		);
		await expect(
			page.locator("text=NFT-Gated, text=NFT Collection"),
		).toBeVisible();

		console.log("✅ NFT-gated jar creation test passed!");
	});

	test("Form validation prevents invalid jar creation", async ({ page }) => {
		console.log("🛡️ Testing form validation...");

		await page.goto("/create");

		// Try to proceed without filling required fields
		await page.click(SELECTORS.buttons.next);

		// Should stay on same step due to validation
		await expect(page.locator("text=Basic Configuration")).toBeVisible();

		// Fill invalid data
		await page.fill(SELECTORS.forms.jarName, "ab"); // Too short
		await page.fill('input:below(:text("Amount"))', "-1"); // Invalid amount

		// Should show validation errors or prevent progression
		const nextButton = page.locator(SELECTORS.buttons.next);
		const isDisabled = await nextButton.isDisabled();

		// Either button is disabled or we see error messages
		if (!isDisabled) {
			await nextButton.click();
			await expect(
				page.locator("text=error, text=invalid, text=required"),
			).toBeVisible();
		}

		console.log("✅ Form validation test passed!");
	});
});

// Re-export expect for convenience
export { expect };
