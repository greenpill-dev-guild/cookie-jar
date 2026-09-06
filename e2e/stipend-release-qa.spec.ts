import { writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const jar = "0x5ef012c81ABC229Df10037b9001937E55671E36E";
const routes = [
	["home", "/"],
	["jars", "/jars"],
	["jar", `/jar/${jar}?chainId=31337`],
	["create", "/create"],
	["profile", "/profile"],
	["bad-address", "/jar/not-an-address"],
	["bad-chain", `/jar/${jar}?chainId=bad`],
	["404", "/qa-no-such-page"],
];
for (const width of [375, 1440])
	for (const theme of ["light", "dark"] as const) {
		test(`route evidence ${width} ${theme}`, async ({ page }, info) => {
			test.setTimeout(120000);
			await page.setViewportSize({ width, height: 900 });
			await page.emulateMedia({ colorScheme: theme });
			const observations: unknown[] = [];
			for (const [name, path] of routes) {
				const errors: string[] = [];
				const failed: string[] = [];
				const pageErrors: string[] = [];
				const pageErrorHandler = (error: Error) =>
					pageErrors.push(error.message);
				const responses: string[] = [];
				const consoleHandler = (message: any) => {
					if (message.type() === "error") errors.push(message.text());
				};
				const failureHandler = (request: any) =>
					failed.push(
						`${request.method()} ${request.url()} ${request.failure()?.errorText}`
					);
				const responseHandler = (response: any) => {
					if (response.status() >= 400)
						responses.push(`${response.status()} ${response.url()}`);
				};
				page.on("console", consoleHandler);
				page.on("pageerror", pageErrorHandler);
				page.on("requestfailed", failureHandler);
				page.on("response", responseHandler);
				await page.goto(path, { waitUntil: "domcontentloaded" });
				await expect(page.locator("main")).toBeVisible({ timeout: 30000 });
				await expect(
					page
						.getByRole("banner")
						.getByRole("button", { name: "Connect", exact: true })
				).toBeVisible({ timeout: 30000 });
				if (name === "home")
					await expect(
						page.getByText("In the jar", { exact: true })
					).toBeVisible({ timeout: 30000 });
				if (name === "jar")
					await expect(
						page.getByRole("button", { name: "Copy jar address" })
					).toBeVisible({ timeout: 30000 });
				if (name === "jars")
					await expect(
						page.getByRole("textbox", { name: "Search jars" })
					).toBeVisible({ timeout: 30000 });
				if (name === "create")
					await expect(page.locator("#jarName")).toBeVisible({
						timeout: 30000,
					});
				await expect
					.poll(() =>
						page.evaluate(
							() => document.documentElement.scrollWidth <= innerWidth
						)
					)
					.toBe(true);
				await expect
					.poll(() =>
						page.locator("main").evaluate((el) => {
							const transition = el.firstElementChild?.firstElementChild;
							return transition
								? Number(getComputedStyle(transition).opacity)
								: 0;
						})
					)
					.toBe(1);
				const axe = await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa"])
					.analyze();
				observations.push({
					name,
					path,
					actualURL: page.url(),
					errors,
					pageErrors,
					failed,
					responses,
					violations: axe.violations,
				});
				await page.screenshot({
					path: info.outputPath(`${name}-${width}-${theme}.png`),
					fullPage: true,
					caret: "initial",
				});
				page.off("console", consoleHandler);
				page.off("pageerror", pageErrorHandler);
				page.off("requestfailed", failureHandler);
				page.off("response", responseHandler);
				expect.soft(axe.violations, `${name} accessibility`).toEqual([]);
				expect.soft(pageErrors, `${name} uncaught errors`).toEqual([]);
				const unexpectedErrors = errors.filter(
					(message) =>
						!message.includes("report-only") &&
						!(name === "404" && message.includes("404 (Not Found)")) &&
						!(name === "jars" && message.includes("net::ERR_BLOCKED_BY_ORB"))
				);
				expect.soft(unexpectedErrors, `${name} console errors`).toEqual([]);
				await info.attach(`${name}-observations`, {
					body: JSON.stringify(observations[observations.length - 1], null, 2),
					contentType: "application/json",
				});
			}
			writeFileSync(
				info.outputPath("observations.json"),
				JSON.stringify(observations, null, 2)
			);
			await info.attach("page-observations", {
				body: JSON.stringify(observations, null, 2),
				contentType: "application/json",
			});
		});
	}

test("security headers and social image metadata", async ({ request }) => {
	const response = await request.get("/");
	for (const name of [
		"content-security-policy-report-only",
		"x-content-type-options",
		"referrer-policy",
		"permissions-policy",
	])
		expect(response.headers()[name], name).toBeTruthy();
	const html = await response.text();
	for (const name of ["og:title", "og:image", "twitter:card"])
		expect(html).toContain(name);
	for (const path of new URL(response.url()).port === "3000"
		? ["/opengraph-image", "/icon", "/apple-icon"]
		: ["/opengraph-image.png", "/icon.svg", "/apple-icon.png"]) {
		const image = await request.get(path);
		expect(image.ok()).toBe(true);
		expect(image.headers()["content-type"]).toMatch(/^image\//);
	}
});

test("error boundary catches a controlled render failure and recovers", async ({
	page,
}, info) => {
	const { createRequire } = await import("node:module");
	const { encodeFunctionData, encodeFunctionResult } = createRequire(
		`${__dirname}/../client/package.json`
	)("viem");
	const { cookieJarFactoryAbi } = await import("../client/generated");
	const selector = encodeFunctionData({
		abi: cookieJarFactoryAbi,
		functionName: "getJarInfo",
		args: [jar],
	}).slice(0, 10);
	let inject = true;
	await page.route("http://127.0.0.1:8545/", async (route) => {
		const payload = route.request().postDataJSON();
		if (
			inject &&
			payload.method === "eth_call" &&
			payload.params[0].data.startsWith(selector)
		) {
			await route.fulfill({
				json: {
					jsonrpc: "2.0",
					id: payload.id,
					result: encodeFunctionResult({
						abi: cookieJarFactoryAbi,
						functionName: "getJarInfo",
						result: [
							"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
							1n,
							JSON.stringify({ name: { controlled: "render failure" } }),
						],
					}),
				},
			});
		} else await route.continue();
	});
	await page.goto(`/jar/${jar}?chainId=31337`);
	await expect(
		page.getByRole("heading", {
			name: "Green Goods Stipend Jar Error",
			exact: true,
		})
	).toBeVisible({ timeout: 30000 });
	await page.screenshot({
		path: info.outputPath("error-boundary.png"),
		fullPage: true,
		caret: "initial",
	});
	inject = false;
	await page.getByRole("button", { name: "Try Again", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Copy jar address" })
	).toBeVisible({ timeout: 20000 });
	await page.screenshot({
		path: info.outputPath("error-recovered.png"),
		fullPage: true,
		caret: "initial",
	});
});
