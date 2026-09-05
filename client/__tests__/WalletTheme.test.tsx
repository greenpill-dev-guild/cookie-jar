import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { RainbowKitProviderWrapper } from "@/components/wallet/RainbowKitProviderWrapper";
import { THEME_COLORS } from "@/lib/app/theme-colors";

const state = vi.hoisted(() => ({ resolvedTheme: "dark" }));
vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: "system", resolvedTheme: state.resolvedTheme }),
}));
vi.mock("@/config/supported-networks", () => ({ wagmiConfig: {} }));
vi.mock("@/config/featured-jar", () => ({ FEATURED_JAR: { chainId: 31337 } }));
vi.mock("wagmi", () => ({
	WagmiProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@rainbow-me/rainbowkit", () => ({
	lightTheme: () => ({ colors: {} }),
	darkTheme: () => ({ colors: {} }),
	RainbowKitProvider: ({
		theme,
		children,
	}: {
		theme: { colors: { connectButtonBackground: string } };
		children: ReactNode;
	}) => (
		<div
			data-testid="wallet-theme"
			data-accent={theme.colors.connectButtonBackground}
		>
			{children}
		</div>
	),
}));
afterEach(cleanup);
it("uses a stable server theme then follows the resolved system preference", () => {
	expect(
		renderToString(
			<RainbowKitProviderWrapper>Wallet</RainbowKitProviderWrapper>
		)
	).toContain(THEME_COLORS.light.action);
	const view = render(
		<RainbowKitProviderWrapper>Wallet</RainbowKitProviderWrapper>
	);
	expect(screen.getByTestId("wallet-theme")).toHaveAttribute(
		"data-accent",
		THEME_COLORS.dark.action
	);
	state.resolvedTheme = "light";
	view.rerender(<RainbowKitProviderWrapper>Wallet</RainbowKitProviderWrapper>);
	expect(screen.getByTestId("wallet-theme")).toHaveAttribute(
		"data-accent",
		THEME_COLORS.light.action
	);
});
