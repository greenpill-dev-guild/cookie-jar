import { expect, test } from "@playwright/test";

test("custom creation requires an explicit name and owner", async ({
	page,
}) => {
	await page.goto("/create");
	await expect(
		page.getByRole("button", { name: "Next", exact: true })
	).toBeDisabled();
	await page.locator("#jarName").fill("QA custom jar");
	await page.locator("#jarOwner").fill("invalid");
	await expect(
		page.getByRole("button", { name: "Next", exact: true })
	).toBeDisabled();
	await page
		.locator("#jarOwner")
		.fill("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
	await expect(
		page.getByRole("button", { name: "Next", exact: true })
	).toBeEnabled();
});

test("jar search filters actual seeded names", async ({ page }) => {
	await page.goto("/jars");
	const search = page.getByRole("textbox", { name: "Search jars" });
	await search.fill("Team Hat Stipend");
	await expect(
		page.getByRole("link", { name: /Team Hat Stipend/ })
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: /Community Stipend/ })
	).toHaveCount(0);
	await search.fill("");
	await expect(
		page.getByRole("link", { name: /Community Stipend/ }).first()
	).toBeVisible();
});
