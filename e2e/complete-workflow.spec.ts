import { expect, test } from "@playwright/test";

// Signed lifecycle coverage lives in jar-creation, jar-operations and admin-functions.
// This journey checks the generic client's disconnected branch without invented wallet events.
test("browse a jar and inspect both actions before connecting", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("link", { name: "Browse jars", exact: true }).click();
	await page
		.getByRole("link", { name: /Team Hat Stipend/ })
		.first()
		.click();
	await expect(
		page.getByText(/connect your wallet to check your status/i)
	).toBeVisible();
	await expect(
		page.getByRole("tab", { name: "Admin", exact: true })
	).toHaveCount(0);
	await page.getByRole("tab", { name: "Deposit", exact: true }).click();
	await expect(page.getByLabel("Amount to deposit")).toBeVisible();
	await page.getByRole("tab", { name: "Claim", exact: true }).click();
	await expect(page.getByText("Claim history", { exact: true })).toBeVisible();
});
