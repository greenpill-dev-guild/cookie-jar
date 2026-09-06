import { describe, expect, it, vi } from "vitest";

vi.mock("@jar-core/config/deployments.auto", () => ({
	isV2Chain: () => true,
	DEPLOYMENTS: {},
	FACTORY_ADDRESSES: {},
	V2_CHAINS: [42161],
	getDeploymentInfo: () => undefined,
	getFactoryAddress: () => undefined,
}));

import {
	parseJarConfigResults,
	type ReadResult,
} from "@jar-core/hooks/jar/useJar";
import { HATS_PROTOCOL_ADDRESS } from "@jar-core/lib/blockchain/constants";

const JAR = "0xF2d6629DeAe335f98AbE540098b64aD55D5fb0Bf" as const;
const OWNER = "0xe09315A86ED0A39862158f5631b928145987fE05" as const;
const ROLE =
	"0x1111111111111111111111111111111111111111111111111111111111111111" as const;
const HAT_ID =
	0x0000005c00010000000000000000000000000000000000000000000000000000n;

function results(
	overrides: Partial<Record<number, unknown>> = {}
): ReadResult[] {
	const base: unknown[] = [
		2, // ACCESS_TYPE (ERC1155)
		false, // hasRole JAR_OWNER
		1, // WITHDRAWAL_OPTION (Variable)
		0n, // fixedAmount
		800_000_000n, // maxWithdrawal
		2_419_200n, // withdrawalInterval
		true, // STRICT_PURPOSE
		true, // EMERGENCY_WITHDRAWAL_ENABLED
		false, // ONE_TIME_WITHDRAWAL
		OWNER, // feeCollector
		false, // hasRole JAR_ALLOWLISTED
		0n, // lastWithdrawalTime
		0n, // totalWithdrawn
		0n, // withdrawnInCurrentPeriod
		4_800_000_000n, // currencyHeldByJar
		"0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // CURRENCY
		[HATS_PROTOCOL_ADDRESS, HAT_ID, 1n, false], // nftRequirement
		0n, // FEE_PERCENTAGE_ON_DEPOSIT
		1_000_000n, // MIN_DEPOSIT
		[OWNER, 1_770_000_000n, '{"name":"Green Goods Stipend"}'], // getJarInfo
	];
	return base.map((result, index) => ({
		result: index in overrides ? overrides[index] : result,
		status: "success",
	}));
}

describe("parseJarConfigResults", () => {
	it("maps the batched reads for a Hats-gated USDC jar", () => {
		const config = parseJarConfigResults(results(), {
			address: JAR,
			chainId: 42161,
			jarOwnerRole: ROLE,
		});

		expect(config.accessType).toBe("Hats");
		expect(config.accessTypeIndex).toBe(2);
		expect(config.withdrawalOption).toBe("Variable");
		expect(config.maxWithdrawal).toBe(800_000_000n);
		expect(config.withdrawalInterval).toBe(2_419_200n);
		expect(config.strictPurpose).toBe(true);
		expect(config.balance).toBe(4_800_000_000n);
		expect(config.nftRequirement).toEqual({
			nftContract: HATS_PROTOCOL_ADDRESS,
			tokenId: HAT_ID,
			minBalance: 1n,
			isPoapEventGate: false,
		});
		expect(config.feePercentageOnDeposit).toBe(0n);
		expect(config.minDeposit).toBe(1_000_000n);
		expect(config.metadata).toBe('{"name":"Green Goods Stipend"}');
		expect(config.creator).toBe(OWNER);
		expect(config.denylist).toBe(false);
		expect(config.lastWithdrawalTime).toBe(0n);
	});

	it("keeps an allowlist jar plain and tolerates a failed factory read", () => {
		const config = parseJarConfigResults(
			results({
				0: 0,
				10: true,
				16: ["0x0000000000000000000000000000000000000000", 0n, 0n, false],
				19: undefined,
			}),
			{ address: JAR, chainId: 42161, jarOwnerRole: ROLE }
		);
		expect(config.accessType).toBe("Allowlist");
		expect(config.allowlist).toBe(true);
		expect(config.nftRequirement).toBeUndefined();
		expect(config.metadata).toBeUndefined();
	});

	it("leaves everything undefined before the reads resolve", () => {
		const config = parseJarConfigResults([], {
			address: JAR,
			chainId: 42161,
			jarOwnerRole: ROLE,
		});
		expect(config.accessType).toBeUndefined();
		expect(config.balance).toBeUndefined();
		expect(config.contractAddress).toBe(JAR);
	});
});
