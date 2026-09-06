import type { JarCreationFormData } from "@jar-core/hooks/jar/schemas/jarCreationSchema";
import { HATS_PROTOCOL_ADDRESS } from "@jar-core/lib/blockchain/constants";
import { DEFAULT_CREATION_VALUES } from "@jar-core/lib/jar/creation-values";

// Launch-window values from docs/DEPLOYMENT.md. Applying this preset is an explicit user action.
export const STIPEND_PRESET: JarCreationFormData = {
	...DEFAULT_CREATION_VALUES,
	jarName: "Green Goods Stipend Jar",
	jarOwnerAddress: "0xe09315A86ED0A39862158f5631b928145987fE05",
	supportedCurrency: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
	metadata:
		"Monthly stipend for Green Goods contributors, backed by Linear-tracked accepted work. Include a Linear link in your note.",
	imageUrl: "https://cookies.greengoods.app/opengraph-image",
	externalLink:
		"https://github.com/greenpill-dev-guild/.github/blob/main/routines/scoped-work-compensation.md",
	showCustomCurrency: true,
	customCurrencyAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
	withdrawalOption: 1,
	maxWithdrawal: "800",
	minDeposit: "1",
	enableCustomFee: true,
	customFee: "0",
	accessType: 5,
	protocolConfig: {
		accessType: "Hats",
		method: "Hats",
		hatsAddress: HATS_PROTOCOL_ADDRESS,
		hatsId:
			"0x0000005c00010000000000000000000000000000000000000000000000000000",
	},
};
