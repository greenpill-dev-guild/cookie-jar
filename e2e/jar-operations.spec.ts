import { createRequire } from "node:module";
import { anvilRpc, captureThemes, expect, test } from "./utils/wallet-utils";

const { encodeFunctionData, decodeErrorResult } = createRequire(
	`${__dirname}/../client/package.json`
)("viem");

import { cookieJarAbi } from "../client/generated";

test("claim and deposit update the seeded stipend jar and enforce the interval", async ({
	page,
	wallet,
}, info) => {
	await wallet.connectWallet(1);
	await expect(
		page.getByText("Holds the gate token", { exact: true }).first()
	).toBeVisible();
	await captureThemes(page, info, "eligible");
	await page.getByLabel("Claim amount").fill("0.1");
	await page
		.getByLabel(/note/i)
		.fill("Local QA accepted work https://linear.app/greenpill/issue/PRD-718");
	await page.getByRole("button", { name: /^Claim [0-9]/ }).click();
	const claimHash = await wallet.signTransaction();
	const receipt = await anvilRpc("eth_getTransactionReceipt", [claimHash]);
	const jar = receipt.to;
	await expect(
		page.getByText(/Next claim in|Available in|days/i).first()
	).toBeVisible();
	const balance = () =>
		anvilRpc("eth_call", [
			{
				to: jar,
				data: encodeFunctionData({
					abi: cookieJarAbi,
					functionName: "currencyHeldByJar",
				}),
			},
			"latest",
		]);
	await expect
		.poll(async () => BigInt(await balance()))
		.toBe(2900000000000000000n);
	await expect(
		page.getByRole("button", { name: /^Claim [0-9]/ })
	).toBeDisabled();
	await captureThemes(page, info, "claimed-cooldown");
	const claim = await anvilRpc("eth_getTransactionByHash", [claimHash]);
	const refusal = await anvilRpc("eth_call", [
		{ from: claim.from, to: claim.to, data: claim.input },
		"latest",
	]).catch((error) => error);
	expect(refusal).toBeInstanceOf(Error);
	expect(
		decodeErrorResult({ abi: cookieJarAbi, data: refusal.data }).errorName
	).toBe("WithdrawalTooSoon");
	await info.attach("interval-refusal", {
		body: JSON.stringify({
			chainId: 31337,
			error: "WithdrawalTooSoon",
			data: refusal.data,
		}),
		contentType: "application/json",
	});
	await page.getByRole("tab", { name: "Deposit", exact: true }).click();
	await page.getByLabel("Amount to deposit").fill("1");
	const count = wallet.hashes.length;
	await page.getByRole("button", { name: "Deposit", exact: true }).click();
	await expect.poll(() => wallet.hashes.length).toBe(count + 1);
	await wallet.signTransaction();
	await expect
		.poll(async () => BigInt(await balance()))
		.toBe(3900000000000000000n);
	await captureThemes(page, info, "confirmed-claim-and-deposit");
	await wallet.switchAccount(3);
	await page.getByRole("tab", { name: "Claim", exact: true }).click();
	await expect(
		page.getByText("Not eligible", { exact: true }).first()
	).toBeVisible();
	await expect(page.getByRole("button", { name: /^Claim [0-9]/ })).toHaveCount(
		0
	);
	await captureThemes(page, info, "ineligible");
});

test("wrong network disables local jar writes", async ({
	page,
	wallet,
}, info) => {
	await wallet.connectWallet(1);
	await captureThemes(page, info, "before-network-switch");
	await wallet.switchNetwork(42161);
	await expect(
		page.getByRole("status").filter({ hasText: /Your wallet is on/ })
	).toBeVisible();
	await page.getByRole("tab", { name: "Deposit", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Deposit", exact: true })
	).toBeDisabled();
	expect(wallet.hashes).toHaveLength(0);
	await captureThemes(page, info, "wrong-network");
});
