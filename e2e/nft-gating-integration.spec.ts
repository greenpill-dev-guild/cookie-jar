import { expect, test } from "@playwright/test";

for (const name of ["Cookie Monster Rewards", "Team Hat Stipend"]) {
	test(`${name} requires connection before a gated claim`, async ({ page }) => {
		await page.goto("/jars");
		await page
			.getByRole("link", { name: new RegExp(name) })
			.first()
			.click();
		await expect(
			page.getByRole("button", { name: "Copy jar address" })
		).toBeVisible();
		await expect(
			page.getByText(/connect your wallet to check your status/i)
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: /^Claim [0-9]/ })
		).toHaveCount(0);
	});
}
