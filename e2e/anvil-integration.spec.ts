import { expect, test } from "@playwright/test";

const names = [
	"Community Stipend",
	"Development Grants Pool",
	"Cookie Monster Rewards",
	"Cookie Monster Airdrop",
	"Team Hat Stipend",
];
test("browsing exposes all five seeded jars with chain-aware links", async ({
	page,
}) => {
	await page.goto("/jars");
	for (const name of names) {
		const link = page.getByRole("link", { name: new RegExp(name) }).first();
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute(
			"href",
			/\/jar\/0x[0-9a-fA-F]{40}\?chainId=31337/
		);
	}
});

test("opening a seeded jar displays contract-backed rules", async ({
	page,
}) => {
	await page.goto("/jars");
	await page
		.getByRole("link", { name: /Team Hat Stipend/ })
		.first()
		.click();
	await expect(
		page.getByRole("button", { name: "Copy jar address" })
	).toBeVisible();
	await expect(
		page.getByText("0.5 ETH", { exact: true }).first()
	).toBeVisible();
	await expect(
		page.getByRole("tab", { name: "Claim", exact: true })
	).toBeVisible();
	await expect(
		page.getByRole("tab", { name: "Deposit", exact: true })
	).toBeVisible();
});
