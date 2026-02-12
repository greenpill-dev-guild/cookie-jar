import { decodeFunctionData, encodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";
import { cookieJarFactoryAbi } from "@/generated";
import {
	FACTORY_DEFAULT_FEE_SENTINEL,
	buildV2CreateCookieJarArgs,
	getFeePercentageOnDeposit,
} from "@/hooks/jar/createV2CreateArgs";
import { ETH_ADDRESS, HATS_PROTOCOL_ADDRESS, POAP_TOKEN_ADDRESS } from "@/lib/blockchain/constants";

vi.mock("@/hooks/jar/schemas/jarCreationSchema", () => ({
	AccessType: {
		Allowlist: 0,
		NFTGated: 1,
		POAP: 2,
		Unlock: 3,
		Hypercert: 4,
		Hats: 5,
	},
	NFTType: {
		None: 0,
		ERC721: 1,
		ERC1155: 2,
	},
}));

const AccessType = {
	Allowlist: 0,
	NFTGated: 1,
	POAP: 2,
	Unlock: 3,
	Hypercert: 4,
	Hats: 5,
} as const;

const NFTType = {
	None: 0,
	ERC721: 1,
	ERC1155: 2,
} as const;

type JarCreationFormData = Parameters<typeof buildV2CreateCookieJarArgs>[0]["values"];
type ProtocolConfig = JarCreationFormData["protocolConfig"];

type MakeValuesOverrides = Partial<Omit<JarCreationFormData, "protocolConfig">> & {
	protocolConfig?: Partial<ProtocolConfig>;
};

function makeValues(overrides: MakeValuesOverrides = {}): JarCreationFormData {
	const baseValues: JarCreationFormData = {
		jarName: "Test Jar",
		jarOwnerAddress: "0x1234567890123456789012345678901234567890",
		supportedCurrency: ETH_ADDRESS,
		metadata: "Test metadata",
		imageUrl: "",
		externalLink: "",
		showCustomCurrency: false,
		customCurrencyAddress: "",
		withdrawalOption: 0,
		fixedAmount: "1",
		maxWithdrawal: "2",
		withdrawalInterval: "7",
		strictPurpose: true,
		emergencyWithdrawalEnabled: true,
		oneTimeWithdrawal: false,
		accessType: AccessType.Allowlist,
		nftAddresses: [] as string[],
		nftTypes: [] as number[],
		protocolConfig: { accessType: "Allowlist" },
		enableCustomFee: false,
		customFee: "",
		streamingEnabled: false,
		requireStreamApproval: true,
		maxStreamRate: "1.0",
		minStreamDuration: "1",
		autoSwapEnabled: false,
	};

	return {
		...baseValues,
		...overrides,
		protocolConfig: {
			...baseValues.protocolConfig,
			...overrides.protocolConfig,
		},
	};
}

describe("buildV2CreateCookieJarArgs", () => {
	it("encodes createCookieJar args compatible with current factory ABI", () => {
		const args = buildV2CreateCookieJarArgs({
			values: makeValues(),
			metadata: "metadata",
			parseAmount: (amount) => BigInt(Math.floor(Number.parseFloat(amount) * 1e18)),
		});

		const data = encodeFunctionData({
			abi: cookieJarFactoryAbi,
			functionName: "createCookieJar",
			args,
		});
		expect(data.startsWith("0x")).toBe(true);

		const decoded = decodeFunctionData({
			abi: cookieJarFactoryAbi,
			data,
		});
		expect(decoded.functionName).toBe("createCookieJar");
		expect(decoded.args?.length).toBe(3);
	});

	it("uses default fee sentinel when custom fee is disabled", () => {
		const fee = getFeePercentageOnDeposit(makeValues({ enableCustomFee: false }));
		expect(fee).toBe(FACTORY_DEFAULT_FEE_SENTINEL);
	});

	it("uses explicit custom fee when provided", () => {
		const fee = getFeePercentageOnDeposit(
			makeValues({ enableCustomFee: true, customFee: "2.5" }),
		);
		expect(fee).toBe(250n);
	});

	it("supports explicit zero-percent fee", () => {
		const fee = getFeePercentageOnDeposit(
			makeValues({ enableCustomFee: true, customFee: "0" }),
		);
		expect(fee).toBe(0n);
	});

	it("maps NFT ERC721 access to contract enum ERC721", () => {
		const [jarConfig, accessConfig] = buildV2CreateCookieJarArgs({
			values: makeValues({
				accessType: AccessType.NFTGated,
				nftAddresses: ["0x1111111111111111111111111111111111111111"],
				nftTypes: [NFTType.ERC721],
			}),
			metadata: "metadata",
			parseAmount: () => 1n,
		});
		expect(jarConfig.accessType).toBe(1);
		expect(accessConfig.nftRequirement.nftContract).toBe(
			"0x1111111111111111111111111111111111111111",
		);
	});

	it("maps NFT ERC1155 access to contract enum ERC1155", () => {
		const [jarConfig] = buildV2CreateCookieJarArgs({
			values: makeValues({
				accessType: AccessType.NFTGated,
				nftAddresses: ["0x1111111111111111111111111111111111111111"],
				nftTypes: [NFTType.ERC1155],
			}),
			metadata: "metadata",
			parseAmount: () => 1n,
		});
		expect(jarConfig.accessType).toBe(2);
	});

	it("maps POAP, Unlock, Hypercert, and Hats to supported contract enum domain", () => {
		const [poapJar, poapAccess] = buildV2CreateCookieJarArgs({
			values: makeValues({
				accessType: AccessType.POAP,
				protocolConfig: { accessType: "POAP", eventId: "1234" },
			}),
			metadata: "metadata",
			parseAmount: () => 1n,
		});
		expect(poapJar.accessType).toBe(1);
		expect(poapAccess.nftRequirement.nftContract).toBe(POAP_TOKEN_ADDRESS);
		expect(poapAccess.nftRequirement.tokenId).toBe(1234n);
		expect(poapAccess.nftRequirement.minBalance).toBe(1n);

		const [unlockJar] = buildV2CreateCookieJarArgs({
			values: makeValues({
				accessType: AccessType.Unlock,
				protocolConfig: {
					accessType: "Unlock",
					unlockAddress: "0x2222222222222222222222222222222222222222",
				},
			}),
			metadata: "metadata",
			parseAmount: () => 1n,
		});
		expect(unlockJar.accessType).toBe(1);

		const [hypercertJar] = buildV2CreateCookieJarArgs({
			values: makeValues({
				accessType: AccessType.Hypercert,
				protocolConfig: {
					accessType: "Hypercert",
					hypercertAddress: "0x3333333333333333333333333333333333333333",
					hypercertTokenId: "42",
					hypercertMinBalance: 5,
				},
			}),
			metadata: "metadata",
			parseAmount: () => 1n,
		});
		expect(hypercertJar.accessType).toBe(2);

		const [hatsJar, hatsAccess] = buildV2CreateCookieJarArgs({
			values: makeValues({
				accessType: AccessType.Hats,
				protocolConfig: { accessType: "Hats", hatsId: 99 },
			}),
			metadata: "metadata",
			parseAmount: () => 1n,
		});
		expect(hatsJar.accessType).toBe(2);
		expect(hatsAccess.nftRequirement.nftContract).toBe(HATS_PROTOCOL_ADDRESS);
	});
});
