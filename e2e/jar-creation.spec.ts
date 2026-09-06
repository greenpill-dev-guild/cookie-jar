import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";
import { cookieJarAbi } from "../client/generated";
import { anvilRpc, captureThemes, expect, test } from "./utils/wallet-utils";

const { encodeFunctionData } = createRequire(
	`${__dirname}/../client/package.json`
)("viem");

test("creates a custom jar directly through the local factory and opens the chain-aware link", async ({
	page,
	wallet,
}, info) => {
	await wallet.connectWallet(0);
	await page.getByRole("link", { name: "Create a jar", exact: true }).click();
	await page.locator("#jarName").fill("QA direct factory jar");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.locator("#fixedAmount").fill("0.1");
	await page.locator("#withdrawalInterval").fill("28");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByLabel("Minimum deposit (tokens)").fill("0.01");
	await page.getByLabel("Set custom deposit fee percentage").check();
	await page.getByLabel("Custom Fee Percentage", { exact: true }).fill("0");
	await page.getByRole("button", { name: "Create Jar", exact: true }).click();
	await wallet.signTransaction();
	await expect(page).toHaveURL(/\/jar\/0x[0-9a-fA-F]{40}\?chainId=31337/, {
		timeout: 30000,
	});
	const jar = new URL(page.url()).pathname.split("/").pop();
	const read = (functionName: string) =>
		anvilRpc("eth_call", [
			{
				to: jar,
				data: encodeFunctionData({ abi: cookieJarAbi, functionName }),
			},
			"latest",
		]);
	await expect
		.poll(async () => BigInt(await read("withdrawalInterval")))
		.toBe(2419200n);
	expect(BigInt(await read("MIN_DEPOSIT"))).toBe(10000000000000000n);
	expect(BigInt(await read("FEE_PERCENTAGE_ON_DEPOSIT"))).toBe(0n);
	await captureThemes(page, info, "before-network-switch");
	await wallet.switchNetwork(42161);
	await expect(
		page.getByRole("heading", { name: "QA direct factory jar", exact: true })
	).toBeVisible();
	await expect(
		page.getByRole("status").filter({ hasText: /Your wallet is on/ })
	).toBeVisible();
});

test("connecting on the creation network waits for an explicit final submit", async ({
	page,
	wallet,
}) => {
	await page.goto("/create", { waitUntil: "domcontentloaded" });
	await expect(
		page.getByRole("button", { name: "Connect", exact: true })
	).toBeVisible();
	await page.locator("#jarName").fill("QA reviewed local jar");
	await page
		.locator("#jarOwner")
		.fill("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.locator("#fixedAmount").fill("0.1");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page
		.getByRole("button", { name: "Connect Wallet to Create", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Choose wallet", exact: true })
		.click();
	await page
		.getByRole("button", {
			name: /Anvil QA Wallet|Browser Wallet|MetaMask|Injected/,
		})
		.first()
		.click();
	await expect(
		page.getByRole("heading", { name: "Deployment review", exact: true })
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Create Jar", exact: true })
	).toBeEnabled();
	expect(wallet.hashes).toHaveLength(0);
	await page.getByRole("button", { name: "Create Jar", exact: true }).click();
	await wallet.signTransaction();
	await expect(page).toHaveURL(/\/jar\/0x[0-9a-fA-F]{40}\?chainId=31337/, {
		timeout: 30000,
	});
	expect(wallet.hashes).toHaveLength(1);
});

test("preset stays editable and wallet connection returns to review without a write", async ({
	page,
	wallet,
}, info) => {
	await page.goto("/create");
	await captureThemes(page, info, "preset-create-start");
	await page
		.getByRole("button", { name: "Use Green Goods stipend preset" })
		.click();
	await expect(page.locator("#jarOwner")).toHaveValue(
		"0xe09315A86ED0A39862158f5631b928145987fE05"
	);
	await expect(
		page.getByRole("combobox", { name: "Network", exact: true })
	).toHaveText(/Arbitrum/);
	await expect(
		page.getByRole("button", { name: "Next", exact: true })
	).toBeEnabled({ timeout: 30000 });
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await expect(page.locator("#maxWithdrawal")).toHaveValue("800");
	await expect(page.locator("#withdrawalInterval")).toHaveValue("28");
	for (const control of await page.getByRole("checkbox").all()) {
		const rect = await control.boundingBox();
		expect(rect?.width).toBeGreaterThanOrEqual(44);
		expect(rect?.height).toBeGreaterThanOrEqual(44);
	}

	await page.locator("#maxWithdrawal").fill("700");
	await expect(
		page.getByText("Customized stipend preset", { exact: true })
	).toBeVisible();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await expect(page.getByLabel("Minimum deposit (tokens)")).toHaveValue("1");
	await expect(
		page.getByText("Deposit fee: 0%", { exact: true })
	).toBeVisible();
	await captureThemes(page, info, "preset-review");
	await page
		.getByRole("button", { name: "Connect Wallet to Create", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Choose wallet", exact: true })
		.click();
	await page
		.getByRole("button", {
			name: /Anvil QA Wallet|Browser Wallet|MetaMask|Injected/,
		})
		.first()
		.click();
	await expect(
		page.getByRole("heading", { name: "Deployment review", exact: true })
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Create Jar", exact: true })
	).toBeVisible();
	expect(wallet.hashes).toHaveLength(0);
	await page.getByRole("button", { name: "Previous", exact: true }).click();
	await page.getByRole("button", { name: "Previous", exact: true }).click();
	await page.getByRole("button", { name: "Previous", exact: true }).click();
	await expect(page.locator("#jarOwner")).toHaveValue(
		"0xe09315A86ED0A39862158f5631b928145987fE05"
	);
});

test("custom creation review has no unsupported streaming controls and passes accessibility", async ({
	page,
}, info) => {
	await page.goto("/create");
	await page.locator("#jarName").fill("QA streaming unavailable");
	await page
		.locator("#jarOwner")
		.fill("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.locator("#fixedAmount").fill("0.1");
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await expect(
		page.getByRole("checkbox", { name: "Enable token streaming" })
	).toHaveCount(0);
	await expect(
		page.getByText("Streaming: Not configured during creation", { exact: true })
	).toBeVisible();
	await expect(
		page.getByText("Token streaming cannot be configured during jar creation.")
	).toBeVisible();
	for (const theme of ["light", "dark"] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await expect(page.locator("html")).toHaveClass(new RegExp(theme));
		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
			.analyze();
		expect(results.violations).toEqual([]);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth
			)
		).toBe(true);
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({
			path: info.outputPath(`custom-review-${theme}.png`),
			fullPage: true,
			animations: "disabled",
		});
	}
});
