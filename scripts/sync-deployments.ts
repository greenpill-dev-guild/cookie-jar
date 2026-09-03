#!/usr/bin/env bun
/**
 * Merge a Foundry broadcast into the client's deployment registry.
 *
 *   bun scripts/sync-deployments.ts --chain 42161 [--script Deploy.s.sol] [--dry-run]
 *
 * Reads contracts/broadcast/<script>/<chainId>/run-latest.json, takes the CookieJarFactory
 * creation, upserts one entry in client/config/deployments.json (other chains are kept) and
 * regenerates client/config/deployments.auto.ts from that JSON. Solidity no longer writes
 * client files, so this is the only path that changes the registry.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface DeploymentEntry {
	chainId: number;
	factoryAddress: string;
	isV2: boolean;
	blockNumber?: number;
	timestamp?: number;
}

type Registry = Record<string, DeploymentEntry>;

interface BroadcastTransaction {
	transactionType?: string;
	contractName?: string;
	contractAddress?: string;
	hash?: string;
}

interface BroadcastReceipt {
	contractAddress?: string | null;
	blockNumber?: string | number;
	transactionHash?: string;
}

interface Broadcast {
	transactions?: BroadcastTransaction[];
	receipts?: BroadcastReceipt[];
	timestamp?: number;
}

const ROOT = resolve(import.meta.dir, "..");
const REGISTRY_PATH = resolve(ROOT, "client/config/deployments.json");
const GENERATED_PATH = resolve(ROOT, "client/config/deployments.auto.ts");
const LOCAL_CHAIN_ID = 31337;

function parseArgs(argv: string[]) {
	let chain: number | undefined;
	let script = "Deploy.s.sol";
	let dryRun = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--chain") chain = Number(argv[++i]);
		else if (arg.startsWith("--chain=")) chain = Number(arg.slice("--chain=".length));
		else if (arg === "--script") script = argv[++i];
		else if (arg.startsWith("--script=")) script = arg.slice("--script=".length);
		else if (arg === "--dry-run") dryRun = true;
		else if (arg === "--help" || arg === "-h") {
			console.log("Usage: bun scripts/sync-deployments.ts --chain <id> [--script Deploy.s.sol] [--dry-run]");
			process.exit(0);
		}
	}
	if (!chain || !Number.isInteger(chain)) {
		throw new Error("--chain <id> is required (for example --chain 42161)");
	}
	return { chain, script, dryRun };
}

async function checksum(address: string): Promise<string> {
	// viem lives in the client workspace; fall back to the broadcast casing when unavailable.
	for (const specifier of ["viem", resolve(ROOT, "client/node_modules/viem")]) {
		try {
			const mod = (await import(specifier)) as { getAddress?: (a: string) => string };
			if (mod.getAddress) return mod.getAddress(address);
		} catch {
			// try the next location
		}
	}
	return address;
}

function readRegistry(): Registry {
	if (!existsSync(REGISTRY_PATH)) return {};
	return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as Registry;
}

function sortRegistry(registry: Registry): Registry {
	const sorted: Registry = {};
	for (const key of Object.keys(registry).sort((a, b) => Number(a) - Number(b))) {
		sorted[key] = registry[key];
	}
	return sorted;
}

function render(registry: Registry, deployedChain: number, generatedAt: number): string {
	const lines: string[] = [];
	lines.push("/**");
	lines.push(" * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.");
	lines.push(" *");
	lines.push(" * Source of truth: client/config/deployments.json");
	lines.push(" * Regenerate with: bun sync:deployment -- --chain <chainId> [--script Deploy.s.sol]");
	lines.push(` * Last synced chain: ${deployedChain}`);
	lines.push(" */");
	lines.push("");
	lines.push("export interface DeploymentInfo {");
	lines.push("\tchainId: number;");
	lines.push("\tfactoryAddress: string;");
	lines.push("\tblockNumber?: number;");
	lines.push("\ttimestamp?: number;");
	lines.push("\tisV2: boolean;");
	lines.push("\tdeploymentHash?: string;");
	lines.push("}");
	lines.push("");
	lines.push("export const DEPLOYMENTS: Record<number, DeploymentInfo> = {");
	for (const entry of Object.values(registry)) {
		lines.push(`\t${entry.chainId}: {`);
		lines.push(`\t\tchainId: ${entry.chainId},`);
		lines.push(`\t\tfactoryAddress: "${entry.factoryAddress}",`);
		lines.push(`\t\tisV2: ${entry.isV2},`);
		if (entry.blockNumber !== undefined) lines.push(`\t\tblockNumber: ${entry.blockNumber},`);
		if (entry.timestamp !== undefined) lines.push(`\t\ttimestamp: ${entry.timestamp},`);
		lines.push("\t},");
	}
	lines.push("};");
	lines.push("");
	lines.push("export const V2_CHAINS = Object.entries(DEPLOYMENTS)");
	lines.push("\t.filter(([, info]) => info.isV2)");
	lines.push("\t.map(([chainId]) => Number.parseInt(chainId, 10));");
	lines.push("");
	lines.push("export const FACTORY_ADDRESSES = Object.fromEntries(");
	lines.push("\tObject.entries(DEPLOYMENTS).map(([chainId, info]) => [chainId, info.factoryAddress]),");
	lines.push(") as Record<number, string>;");
	lines.push("");
	lines.push("export function isV2Chain(chainId: number): boolean {");
	lines.push("\treturn DEPLOYMENTS[chainId]?.isV2 || false;");
	lines.push("}");
	lines.push("");
	lines.push("export function getFactoryAddress(chainId: number): string | undefined {");
	lines.push("\treturn DEPLOYMENTS[chainId]?.factoryAddress;");
	lines.push("}");
	lines.push("");
	lines.push("export function getDeploymentInfo(chainId: number): DeploymentInfo | undefined {");
	lines.push("\treturn DEPLOYMENTS[chainId];");
	lines.push("}");
	lines.push("");
	lines.push(`export const GENERATED_AT = "${generatedAt}";`);
	lines.push('export const GENERATOR = "scripts/sync-deployments.ts";');
	lines.push(`export const DEPLOYED_CHAIN = ${deployedChain};`);
	lines.push("");
	return lines.join("\n");
}

async function main() {
	const { chain, script, dryRun } = parseArgs(process.argv.slice(2));
	const broadcastPath = resolve(ROOT, "contracts/broadcast", script, String(chain), "run-latest.json");
	if (!existsSync(broadcastPath)) {
		throw new Error(`No broadcast found at ${broadcastPath}. Run the deploy first.`);
	}
	const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as Broadcast;
	const creation = (broadcast.transactions ?? []).find(
		(tx) =>
			(tx.transactionType === "CREATE" || tx.transactionType === "CREATE2") &&
			tx.contractName === "CookieJarFactory" &&
			tx.contractAddress,
	);
	if (!creation?.contractAddress) {
		throw new Error(`No CookieJarFactory creation in ${broadcastPath}`);
	}
	const factoryAddress = await checksum(creation.contractAddress);
	const receipt = (broadcast.receipts ?? []).find(
		(r) => r.contractAddress?.toLowerCase() === creation.contractAddress?.toLowerCase(),
	);
	const blockNumber = receipt?.blockNumber !== undefined ? Number(receipt.blockNumber) : undefined;
	const timestamp = broadcast.timestamp;

	const registry = readRegistry();
	const entry: DeploymentEntry = { chainId: chain, factoryAddress, isV2: true };
	// Anvil redeploys on every start; keep the local entry stable (CREATE2 address only).
	if (chain !== LOCAL_CHAIN_ID) {
		if (blockNumber !== undefined && Number.isFinite(blockNumber)) entry.blockNumber = blockNumber;
		if (timestamp !== undefined) entry.timestamp = timestamp;
	}
	registry[String(chain)] = entry;
	const sorted = sortRegistry(registry);
	const generated = render(sorted, chain, timestamp ?? Math.floor(Date.now() / 1000));

	console.log(`Chain ${chain}: CookieJarFactory ${factoryAddress}` + (blockNumber ? ` (block ${blockNumber})` : ""));
	if (dryRun) {
		console.log("--dry-run: registry not written");
		return;
	}
	writeFileSync(REGISTRY_PATH, `${JSON.stringify(sorted, null, "\t")}\n`);
	writeFileSync(GENERATED_PATH, generated);
	console.log(`Updated ${REGISTRY_PATH}`);
	console.log(`Regenerated ${GENERATED_PATH}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
