import {
	type BrowserContext,
	test as base,
	expect,
	type Page,
	type TestInfo,
} from "@playwright/test";
import { ANVIL_ACCOUNTS } from "./constants";

const RPC = "http://127.0.0.1:8545";
export async function anvilRpc(
	method: string,
	params: unknown[] = []
): Promise<any> {
	const response = await fetch(RPC, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	const result = await response.json();
	if (result.error)
		throw Object.assign(new Error(result.error.message), {
			data: result.error.data,
		});
	return result.result;
}

export const test = base.extend<{ wallet: WalletTester }>({
	wallet: async ({ page, context }, use) => {
		if ((await anvilRpc("eth_chainId")) !== "0x7a69")
			throw new Error("Wallet tests require local Anvil chain 31337.");
		const snapshot = await anvilRpc("evm_snapshot");
		const wallet = new WalletTester(page, context);
		try {
			await wallet.install();
			if (test.info().project.name === "Mobile Chrome")
				await page.setViewportSize({ width: 375, height: 900 });
			await use(wallet);
		} finally {
			try {
				const receipts = await Promise.all(
					wallet.hashes.map((hash) =>
						anvilRpc("eth_getTransactionReceipt", [hash])
					)
				);
				await test.info().attach("local-anvil-receipts", {
					body: JSON.stringify({ chainId: 31337, receipts }, null, 2),
					contentType: "application/json",
				});
			} finally {
				expect(await anvilRpc("evm_revert", [snapshot])).toBe(true);
			}
		}
	},
});
export { expect };

export class WalletTester {
	readonly hashes: string[] = [];
	constructor(
		private page: Page,
		private context: BrowserContext
	) {}
	async install() {
		await this.context.exposeBinding(
			"__anvilRpc",
			async (_, method: string, params: unknown[]) => {
				if (!/^(eth_|net_|web3_)/.test(method))
					throw new Error("Unsupported local wallet method");
				if (method === "eth_sendTransaction") {
					const tx = params[0] as { from: string };
					if (
						!ANVIL_ACCOUNTS.some(
							(a) => a.address.toLowerCase() === tx.from.toLowerCase()
						)
					)
						throw new Error("Only seeded local accounts may transact.");
					if ((await anvilRpc("eth_chainId")) !== "0x7a69")
						throw new Error("Wrong RPC chain");
				}
				const result = await anvilRpc(method, params);
				if (method === "eth_sendTransaction") this.hashes.push(result);
				return result;
			}
		);
		await this.context.addInitScript(
			({ accounts }) => {
				let selected = sessionStorage.getItem("qa-account") || accounts[0];
				let connected = sessionStorage.getItem("qa-connected") === "true";
				let chainId = sessionStorage.getItem("qa-chain") || "0x7a69";
				const listeners = new Map<string, Set<(value: unknown) => void>>();
				const emit = (event: string, value: unknown) =>
					listeners.get(event)?.forEach((callback) => callback(value));
				const provider = {
					isMetaMask: true,
					on(event: string, callback: (value: unknown) => void) {
						if (!listeners.has(event)) listeners.set(event, new Set());
						listeners.get(event)!.add(callback);
					},
					removeListener(event: string, callback: (value: unknown) => void) {
						listeners.get(event)?.delete(callback);
					},
					async request({
						method,
						params = [],
					}: {
						method: string;
						params?: any[];
					}) {
						if (method === "eth_chainId") return chainId;
						if (method === "eth_accounts") return connected ? [selected] : [];
						if (method === "eth_requestAccounts") {
							connected = true;
							sessionStorage.setItem("qa-connected", "true");
							emit("accountsChanged", [selected]);
							return [selected];
						}
						if (method === "wallet_getPermissions")
							return connected ? [{ parentCapability: "eth_accounts" }] : [];
						if (method === "wallet_requestPermissions")
							return [{ parentCapability: "eth_accounts" }];
						if (method === "wallet_switchEthereumChain") {
							chainId = params[0].chainId;
							emit("chainChanged", chainId);
							return null;
						}
						if (method === "eth_sendTransaction" && chainId !== "0x7a69")
							throw new Error("Test wallet writes are restricted to Anvil.");
						return (window as any).__anvilRpc(method, params);
					},
				};
				Object.defineProperty(window, "ethereum", {
					value: provider,
					configurable: true,
				});
				(window as any).__localWallet = {
					select(index: number) {
						selected = accounts[index];
						sessionStorage.setItem("qa-account", selected);
						emit("accountsChanged", connected ? [selected] : []);
					},
					switchChain(id: number) {
						chainId = `0x${id.toString(16)}`;
						sessionStorage.setItem("qa-chain", chainId);
						emit("chainChanged", chainId);
					},
				};
				const announce = () =>
					dispatchEvent(
						new CustomEvent("eip6963:announceProvider", {
							detail: {
								info: {
									uuid: "10c68cf7-61a8-4fe4-93a5-bd9bd00b4824",
									name: "Anvil QA Wallet",
									icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
									rdns: "io.metamask",
								},
								provider,
							},
						})
					);
				addEventListener("eip6963:requestProvider", announce);
				announce();
			},
			{ accounts: ANVIL_ACCOUNTS.map((account) => account.address) }
		);
	}
	async connectWallet(index = 0) {
		await this.page.goto("/", { waitUntil: "domcontentloaded" });
		await this.switchAccount(index);
		await this.page
			.getByRole("button", { name: "Connect", exact: true })
			.click();
		await this.page
			.getByRole("button", {
				name: /Anvil QA Wallet|Browser Wallet|MetaMask|Injected/,
			})
			.first()
			.click();
		await expect(
			this.page.getByRole("button", { name: "Connect", exact: true })
		).toHaveCount(0);
	}
	async switchAccount(index: number) {
		await this.page.evaluate(
			(value) => (window as any).__localWallet.select(value),
			index
		);
	}
	async switchNetwork(chainId: number) {
		await this.page.evaluate(
			(value) => (window as any).__localWallet.switchChain(value),
			chainId
		);
	}
	async signTransaction() {
		await expect.poll(() => this.hashes.length).toBeGreaterThan(0);
		const hash = this.hashes[this.hashes.length - 1];
		await expect
			.poll(
				async () =>
					(await anvilRpc("eth_getTransactionReceipt", [hash]))?.status
			)
			.toBe("0x1");
		return hash;
	}
	async disconnectWallet() {
		await this.page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});
		await this.page.reload();
	}
}

export async function captureThemes(page: Page, info: TestInfo, name: string) {
	await expect
		.poll(() =>
			page
				.locator("main > div > div")
				.first()
				.evaluate((el) => Number(getComputedStyle(el).opacity))
		)
		.toBe(1);
	for (const theme of ["light", "dark"] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await expect(page.locator("html")).toHaveClass(new RegExp(theme));
		await page.screenshot({
			path: info.outputPath(`${name}-${theme}.png`),
			fullPage: true,
			caret: "initial",
		});
	}
	await page.emulateMedia({ colorScheme: "light" });
}
