import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
	for (const width of [375, 1440]) {
		test(`stipend readability and accessibility ${theme} ${width}`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: 900 });
			await page.addInitScript(
				(value) => localStorage.setItem("theme", value),
				theme
			);
			await page.goto("/");
			await expect(
				page.getByText("Available Balance", { exact: true })
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Copy jar address" })
			).toBeVisible();
			await expect(
				page.getByRole("link", { name: "Open jar playbook" })
			).toBeVisible();
			const surface = page
				.getByText("Available Balance", { exact: true })
				.locator("../..");
			await expect(surface).toHaveCSS("background-image", "none");
			await page.screenshot({
				path: info.outputPath("home.png"),
				fullPage: true,
			});
			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa"])
				.analyze();
			expect(results.violations).toEqual([]);
			for (const element of await page
				.locator("main button, main a, header button, footer a")
				.all()) {
				if (!(await element.isVisible())) continue;
				const box = await element.boundingBox();
				expect(box?.height, await element.textContent()).toBeGreaterThanOrEqual(
					44
				);
				expect(box?.width, await element.textContent()).toBeGreaterThanOrEqual(
					44
				);
			}
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth
				)
			).toBe(true);
		});
	}
}

test("jar search is labelled and jar navigation works with the keyboard", async ({
	page,
}) => {
	await page.goto("/jars");
	await expect(
		page.getByRole("heading", { name: "All jars", level: 1 })
	).toBeVisible();
	await page.getByRole("textbox", { name: "Search jars" }).fill("Stipend");
	const link = page.getByRole("link", { name: /Team Hat Stipend/ }).first();
	await expect(link).toBeVisible();
	await link.focus();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/\/jar\/0x/);
});

for (const route of ["/jars", "/profile", "/create"]) {
	for (const theme of ["light", "dark"] as const) {
		test(`route accessibility ${route} ${theme}`, async ({ page }, info) => {
			await page.setViewportSize({ width: 375, height: 900 });
			await page.addInitScript(
				(value) => localStorage.setItem("theme", value),
				theme
			);
			await page.goto(route, { waitUntil: "domcontentloaded" });
			await expect(page.locator("main h1")).toBeVisible();
			if (route === "/jars")
				await expect(
					page.getByRole("textbox", { name: "Search jars" })
				).toBeVisible();
			await page.screenshot({
				path: info.outputPath("route.png"),
				fullPage: true,
			});
			const result = await new AxeBuilder({ page }).analyze();
			expect(result.violations).toEqual([]);
		});
	}
}
