import { expect, test } from "@playwright/test";

// V1 fallback semantics are covered by client version-detection unit tests.
// The local seed is V2; do not invent V1 addresses or streaming transactions here.
test("invalid jar addresses have a visible recovery state", async ({
	page,
}) => {
	await page.goto("/jar/not-an-address");
	await expect(
		page.getByRole("heading", { name: /Invalid address/i })
	).toBeVisible();
	await expect(
		page.getByRole("tab", { name: "Deposit", exact: true })
	).toHaveCount(0);
});

test("invalid chain links cannot expose write controls", async ({ page }) => {
	await page.goto(
		"/jar/0x5ef012c81ABC229Df10037b9001937E55671E36E?chainId=bad"
	);
	await expect(page.getByText(/Unsupported network/i).first()).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Deposit", exact: true })
	).toHaveCount(0);
});
