import { expect, test } from "@playwright/test";

// Record timings rather than enforcing arbitrary production budgets against a cold dev compiler.
for (const path of ["/", "/jars", "/create"]) {
	test(`navigation baseline ${path}`, async ({ page }, info) => {
		const start = Date.now();
		await page.goto(path);
		await expect(page.locator("main h1")).toBeVisible();
		if (path === "/jars")
			await expect(
				page.getByRole("link", { name: /Team Hat Stipend/ })
			).toBeVisible();
		if (path === "/create")
			await expect(page.locator("#jarName")).toBeVisible();
		await info.attach("navigation-timing", {
			body: JSON.stringify({
				path,
				milliseconds: Date.now() - start,
				environment: "Next development server",
			}),
			contentType: "application/json",
		});
	});
}
