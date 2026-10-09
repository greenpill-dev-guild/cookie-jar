import { expect, test } from "@playwright/test";

test("returning to jars keeps navigation usable", async ({ page }) => {
	await page.goto("/jars");
	const link = page.getByRole("link", { name: /Team Hat Stipend/ }).first();
	await expect(link).toBeVisible();
	await link.click();
	await expect(page).toHaveURL(/\/jar\/0x[0-9a-fA-F]{40}\?chainId=31337/, {
		timeout: 30000,
	});
	await expect(
		page.getByRole("button", { name: "Copy jar address" })
	).toBeVisible({ timeout: 30000 });
	await page.goBack();
	await expect(link).toBeVisible();
});
