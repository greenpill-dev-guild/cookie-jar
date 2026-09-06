import { resolveJarChainId } from "@jar-core/lib/jar/jar-location";
import { expect, it } from "vitest";

it("uses a validated URL network, or the configured default for bare links", () => {
	expect(resolveJarChainId(null, 31337, [31337, 42161])).toBe(31337);
	expect(resolveJarChainId("42161", 31337, [31337, 42161])).toBe(42161);
	for (const value of ["", "1e3", "-1", "999", "42161x"])
		expect(resolveJarChainId(value, 31337, [31337, 42161])).toBeUndefined();
});
