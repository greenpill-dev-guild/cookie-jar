import { expect, test } from "@playwright/test";

test("returning to jars keeps navigation usable", async ({ page }) => {
	await page.goto("/jars");
	const link = page.getByRole("link", { name: /Team Hat Stipend/ }).first();
	await expect(link).toBeVisible();
	await link.click();
	await expect(
		page.getByRole("button", { name: "Copy jar address" })
	).toBeVisible();
	await page.goBack();
	await expect(link).toBeVisible();
});
