import { expect, test } from "@playwright/test";

test("generic home links to browsing and custom creation", async ({ page }) => {
	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "Cookie Jar", exact: true })
	).toBeVisible();
	await page.getByRole("link", { name: "Browse jars", exact: true }).click();
	await expect(page).toHaveURL(/\/jars$/);
	await expect(
		page.getByRole("heading", { name: "All jars", exact: true })
	).toBeVisible();
	await page.goto("/");
	await page
		.getByRole("link", { name: "Create a jar", exact: true })
		.first()
		.click();
	await expect(page.locator("#jarName")).toBeVisible();
	await expect(page.getByText("Use Green Goods stipend preset")).toHaveCount(0);
});

test("unknown routes offer recovery", async ({ page }) => {
	const response = await page.goto("/qa-no-such-page");
	expect(response?.status()).toBe(404);
	await expect(
		page.getByRole("heading", { name: "Page not found", exact: true })
	).toBeVisible();
	await page
		.getByRole("link", { name: "Back to the jar", exact: true })
		.click();
	await expect(
		page.getByRole("heading", { name: "Cookie Jar", exact: true })
	).toBeVisible();
});
