import { expect, it } from "vitest";
import { wagmiConfig } from "@/config/supported-networks";

it("registers a browser wallet that RainbowKit can show on mobile", () => {
	expect(
		wagmiConfig.connectors.some(
			(connector) =>
				(connector as any).rkDetails?.isRainbowKitConnector &&
				(connector as any).rkDetails?.name === "Browser Wallet"
		)
	).toBe(true);
});
