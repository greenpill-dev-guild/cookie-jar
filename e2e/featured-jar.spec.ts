import { expect, test } from "@playwright/test";

// Unauthenticated smoke test of the stipend home page against the Anvil seed.
// Run with NEXT_PUBLIC_FEATURED_JAR_INDEX=4 (the ERC1155 demo jar) or the default index 0.
test.describe("Featured jar home", () => {
	test("renders the featured jar with claim, deposit and history", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });

		// Header brand and connect button
		await expect(page.getByRole("banner")).toContainText(
			"Green Goods Stipend Jar"
		);
		await expect(
			page.getByRole("button", { name: /connect/i }).first()
		).toBeVisible();

		// Status card and jar details. Exact matches: the eligibility pill also contains
		// "your status", and the history card's empty state also contains "Claim history".
		await expect(page.getByText("In the jar", { exact: true })).toBeVisible({
			timeout: 30_000,
		});
		await expect(page.getByText("Your status", { exact: true })).toBeVisible();
		await expect(
			page.getByText(/connect your wallet to check your status/i)
		).toBeVisible();

		// Action tabs
		await expect(page.getByRole("tab", { name: "Claim" })).toBeVisible();
		await expect(page.getByRole("tab", { name: "Deposit" })).toBeVisible();

		// History card
		await expect(
			page.getByText("Claim history", { exact: true })
		).toBeVisible();

		// Legacy branding and unknown access types must not appear
		await expect(page.getByText("Cookie Jar V3")).toHaveCount(0);
		await expect(page.getByText("POAP", { exact: true })).toHaveCount(0);
		await expect(page.getByText("Unknown", { exact: true })).toHaveCount(0);
	});

	test("keeps the generic routes reachable", async ({ page }) => {
		await page.goto("/jars", { waitUntil: "domcontentloaded" });
		await expect(page).toHaveURL(/\/jars/);
		await page.goto("/create", { waitUntil: "domcontentloaded" });
		await expect(page).toHaveURL(/\/create/);
	});

	test("has no bottom app bar on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.locator(".mobile-app-bar")).toHaveCount(0);
	});
});
