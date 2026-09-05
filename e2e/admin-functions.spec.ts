import { createRequire } from "node:module";
import { cookieJarAbi } from "../client/generated";
import { anvilRpc, captureThemes, expect, test } from "./utils/wallet-utils";

const { encodeFunctionData } = createRequire(
	`${__dirname}/../client/package.json`
)("viem");

test("owner updates the maximum and interval, pauses, and withdraws emergency funds", async ({
	page,
	wallet,
}, info) => {
	await wallet.connectWallet(0);
	await page.getByRole("tab", { name: "Admin", exact: true }).click();
	await page.getByLabel("Maximum per claim").fill("0.6");
	await page.getByRole("button", { name: "Update maximum" }).click();
	const hash = await wallet.signTransaction();
	const jar = (await anvilRpc("eth_getTransactionReceipt", [hash])).to;
	const read = (functionName: string) =>
		anvilRpc("eth_call", [
			{
				to: jar,
				data: encodeFunctionData({ abi: cookieJarAbi, functionName }),
			},
			"latest",
		]);
	await expect
		.poll(async () => BigInt(await read("maxWithdrawal")))
		.toBe(600000000000000000n);
	await page.getByLabel("Claim interval (days)").fill("14");
	await page.getByRole("button", { name: "Update interval" }).click();
	await expect
		.poll(async () => BigInt(await read("withdrawalInterval")))
		.toBe(1209600n);
	await page.getByRole("button", { name: "Pause jar", exact: true }).click();
	await expect.poll(async () => BigInt(await read("paused"))).toBe(1n);
	await page.getByRole("button", { name: "Unpause jar", exact: true }).click();
	await expect.poll(async () => BigInt(await read("paused"))).toBe(0n);
	await page.getByRole("tab", { name: "Emergency", exact: true }).click();
	await page.locator("#withdrawalAmount").fill("0.1");
	await page
		.getByRole("button", { name: "Emergency Withdraw", exact: true })
		.click();
	await expect
		.poll(async () => BigInt(await read("currencyHeldByJar")))
		.toBe(2900000000000000000n);
	await captureThemes(page, info, "owner-admin-confirmed");
});
