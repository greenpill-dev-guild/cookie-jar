import { expect, test } from "@playwright/test";

test("local Anvil and seeded factory are available", async ({ request }) => {
	const rpc = await request.post("http://127.0.0.1:8545", {
		data: { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
	});
	expect((await rpc.json()).result).toBe("0x7a69");
	const registry = await request.get("/deployment.json");
	expect(registry.ok()).toBe(true);
	const deployment = await registry.json();
	expect(deployment.factoryAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
});
