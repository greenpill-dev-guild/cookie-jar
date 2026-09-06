import { expect, test } from "@playwright/test";
test("standalone links survive refresh and browser back navigation", async ({
	page,
}, info) => {
	await page.goto(
		"/jar/0x5ef012c81ABC229Df10037b9001937E55671E36E?chainId=31337"
	);
	await expect(
		page.getByRole("button", { name: "Copy jar address" })
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Copy jar address" })
	).toBeVisible();
	await page.getByRole("banner").getByRole("link").click();
	await expect(page).toHaveURL(/\/$/);
	await page.getByRole("link", { name: "Create a jar", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Use Green Goods stipend preset" })
	).toBeVisible();
	await page.goBack();
	await expect(page.getByText("In the jar", { exact: true })).toBeVisible();
	await page.screenshot({
		path: info.outputPath("stipend-home.png"),
		fullPage: true,
	});
});
test("generic production build keeps its own home and custom creation UI", async ({
	page,
}, info) => {
	test.skip(
		!process.env.COOKIE_JAR_QA_URL,
		"Set COOKIE_JAR_QA_URL to the separately running generic app."
	);
	await page.goto(process.env.COOKIE_JAR_QA_URL!);
	await expect(
		page.getByRole("heading", { level: 1, name: "Cookie Jar", exact: true })
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Browse jars", exact: true })
	).toBeVisible();
	await page
		.getByRole("link", { name: "Create a jar", exact: true })
		.first()
		.click();
	await expect(page.locator("#jarName")).toBeVisible();
	await expect(page.getByText(/Green Goods stipend preset/)).toHaveCount(0);
	await expect(page.getByRole("banner")).toContainText("Cookie Jar");
	await page.screenshot({
		path: info.outputPath("generic-create.png"),
		fullPage: true,
	});
});
