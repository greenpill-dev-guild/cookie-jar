import { expect, test } from "@playwright/test";

for (const path of ["/", "/jars", "/create"]) {
	test(`mobile layout and controls ${path}`, async ({ page }, info) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto(path);
		await expect(page.locator("main h1")).toBeVisible();
		if (path === "/jars")
			await expect(
				page.getByRole("link", { name: /Team Hat Stipend/ })
			).toBeVisible();
		if (path === "/create")
			await expect(page.locator("#jarName")).toBeVisible();
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth
			)
		).toBe(true);
		const connect = page
			.getByRole("banner")
			.getByRole("button", { name: "Connect", exact: true });
		await expect(connect).toBeVisible();
		const box = await connect.boundingBox();
		expect(box?.width).toBeGreaterThanOrEqual(44);
		expect(box?.height).toBeGreaterThanOrEqual(44);
		await page.screenshot({
			path: info.outputPath("mobile.png"),
			fullPage: true,
		});
	});
}
