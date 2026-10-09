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

test("creation checkboxes have 44 px touch targets", async ({ page }, info) => {
	await page.setViewportSize({ width: 375, height: 900 });
	await page.goto("/create", { waitUntil: "domcontentloaded" });
	await expect(
		page
			.getByRole("banner")
			.getByRole("button", { name: "Connect", exact: true })
	).toBeVisible();
	await page.locator("#jarName").fill("Touch target QA");
	await page
		.locator("#jarOwner")
		.fill("0x1111111111111111111111111111111111111111");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await expect(
		page.getByRole("combobox", { name: /[Cc]laim type|Withdrawal type/ })
	).toBeVisible();
	for (const checkbox of await page.getByRole("checkbox").all()) {
		const rect = await checkbox.boundingBox();
		expect(rect?.width).toBeGreaterThanOrEqual(44);
		expect(rect?.height).toBeGreaterThanOrEqual(44);
	}
	await page.screenshot({
		path: info.outputPath("creation-touch-targets.png"),
		fullPage: true,
	});
});

test("creation offers promoted Arbitrum tokens and a custom ERC-20", async ({
	page,
}) => {
	await page.goto("/create");
	await page
		.getByRole("combobox", { name: "Select currency type for your jar" })
		.click();
	for (const name of ["USDC", "DAI", "WETH", "Custom ERC-20"])
		await expect(
			page.getByRole("option", { name: new RegExp(`^${name}`) })
		).toBeVisible();
	await page.getByRole("option", { name: /^Custom ERC-20/ }).click();
	await expect(
		page.getByLabel("ERC-20 Token Address", { exact: true })
	).toBeVisible();
	await page
		.getByLabel("ERC-20 Token Address", { exact: true })
		.fill("0xaf88d065e77c8cC2239327C5EDb3A432268e5831");
	await page.getByRole("button", { name: "Set", exact: true }).click();
	await expect(page.getByText(/Custom ERC-20 set:/)).toBeVisible();
});

test("image upload recovers from failure and blocks advancing while pending", async ({
	page,
}, info) => {
	const { readFile } = await import("node:fs/promises");
	const image = await readFile("stipend/public/opengraph-image.png");
	const cid = "bafkreiciqpf375f4jtrwtacn2mqrjqlf5upjvbyaclx7zvevajurkprsoy";
	let failSigning = true;
	let finishUpload: (() => void) | undefined;
	await page.route(
		"https://agent.greengoods.app/api/uploads/sign",
		async (route) => {
			if (route.request().method() === "OPTIONS") {
				await route.fulfill({
					status: 204,
					headers: {
						"access-control-allow-origin": "*",
						"access-control-allow-methods": "POST, OPTIONS",
						"access-control-allow-headers": "Content-Type",
					},
				});
				return;
			}
			expect(route.request().postDataJSON()).toMatchObject({
				filename: "qa-image.png",
				mimeType: "image/png",
				source: "cookie-jar-image",
			});
			await route.fulfill({
				status: failSigning ? 503 : 200,
				headers: { "access-control-allow-origin": "*" },
				json: failSigning
					? { ok: false }
					: {
							ok: true,
							url: "https://uploads.pinata.cloud/v3/files?signature=local-qa",
						},
			});
			failSigning = false;
		}
	);
	await page.route("https://uploads.pinata.cloud/**", async (route) => {
		await new Promise<void>((resolve) => {
			finishUpload = resolve;
		});
		expect(route.request().postDataBuffer()?.length).toBeGreaterThan(
			image.length
		);
		await route.fulfill({
			headers: { "access-control-allow-origin": "*" },
			json: { data: { cid } },
		});
	});
	await page.route(`https://ipfs.io/ipfs/${cid}`, (route) =>
		route.fulfill({ contentType: "image/png", body: image })
	);
	await page.goto("/create");
	await page.getByLabel("Jar name").fill("Image upload QA");
	await page
		.locator("#jarOwner")
		.fill("0x1111111111111111111111111111111111111111");
	const next = page.getByRole("button", { name: "Next", exact: true });
	await expect(next).toBeEnabled();
	await page.getByLabel("Jar image", { exact: true }).setInputFiles({
		name: "qa-image.png",
		mimeType: "image/png",
		buffer: image,
	});
	await expect(page.getByRole("status")).toContainText(
		"Image uploads are unavailable"
	);
	await expect(next).toBeDisabled();
	await page.getByRole("button", { name: "Retry upload" }).click();
	await expect(page.getByRole("status")).toContainText("Uploading image");
	await expect(next).toBeDisabled();
	await expect.poll(() => Boolean(finishUpload)).toBe(true);
	finishUpload!();
	await expect(page.getByRole("status")).toContainText("Image ready.");
	await expect(next).toBeEnabled();
	await page.getByText("Use an image URL", { exact: true }).click();
	await expect(page.getByLabel("Image URL")).toHaveValue(
		`https://ipfs.io/ipfs/${cid}`
	);
	await page.screenshot({
		path: info.outputPath("image-upload-success.png"),
		fullPage: true,
	});
	const accessibility = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa"])
		.analyze();
	expect(accessibility.violations).toEqual([]);
	await page.getByRole("button", { name: "Remove image" }).click();
	await expect(page.getByLabel("Image URL")).toHaveValue("");
	await expect(next).toBeEnabled();
});
