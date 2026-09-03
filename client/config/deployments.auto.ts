/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * Source of truth: client/config/deployments.json
 * Regenerate with: bun sync:deployment -- --chain <chainId> [--script Deploy.s.sol]
 * Last synced chain: 42161
 */

export interface DeploymentInfo {
	chainId: number;
	factoryAddress: string;
	blockNumber?: number;
	timestamp?: number;
	isV2: boolean;
	deploymentHash?: string;
}

export const DEPLOYMENTS: Record<number, DeploymentInfo> = {
	31337: {
		chainId: 31337,
		factoryAddress: "0xcb0975928B97C217F73F2866Ef7ED39f85e62B74",
		isV2: true,
	},
	42161: {
		chainId: 42161,
		factoryAddress: "0xfe367D31d181D305dcF5AAaa345a70A65c345153",
		isV2: true,
		blockNumber: 431219808,
		timestamp: 1770876044224,
	},
	42220: {
		chainId: 42220,
		factoryAddress: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
		isV2: false,
	},
	44787: {
		chainId: 44787,
		factoryAddress: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9",
		isV2: false,
	},
};

export const V2_CHAINS = Object.entries(DEPLOYMENTS)
	.filter(([, info]) => info.isV2)
	.map(([chainId]) => Number.parseInt(chainId, 10));

export const FACTORY_ADDRESSES = Object.fromEntries(
	Object.entries(DEPLOYMENTS).map(([chainId, info]) => [chainId, info.factoryAddress]),
) as Record<number, string>;

export function isV2Chain(chainId: number): boolean {
	return DEPLOYMENTS[chainId]?.isV2 || false;
}

export function getFactoryAddress(chainId: number): string | undefined {
	return DEPLOYMENTS[chainId]?.factoryAddress;
}

export function getDeploymentInfo(chainId: number): DeploymentInfo | undefined {
	return DEPLOYMENTS[chainId];
}

export const GENERATED_AT = "1770876044224";
export const GENERATOR = "scripts/sync-deployments.ts";
export const DEPLOYED_CHAIN = 42161;
