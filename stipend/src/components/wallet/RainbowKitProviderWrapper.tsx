"use client";

import {
	darkTheme,
	lightTheme,
	RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { FEATURED_JAR } from "@/config/featured-jar";
import { wagmiConfig } from "@/config/supported-networks";
import { THEME_COLORS } from "@/lib/app/theme-colors";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

export function RainbowKitProviderWrapper({
	children,
}: {
	children: ReactNode;
}) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const isDarkMode = mounted && resolvedTheme === "dark";
	const colors = isDarkMode ? THEME_COLORS.dark : THEME_COLORS.light;

	const baseTheme = (isDarkMode ? darkTheme : lightTheme)({
		accentColor: colors.action,
		accentColorForeground: isDarkMode ? colors.accentInk : "#FFFFFF",
		borderRadius: "medium",
		fontStack: "system",
		overlayBlur: "small",
	});

	const themeWithCustomColors = {
		...baseTheme,
		colors: {
			...baseTheme.colors,
			connectButtonBackground: colors.action,
			connectButtonBackgroundError: "#DC2626",
			connectButtonInnerBackground: colors.card,
			connectButtonText: isDarkMode ? colors.accentInk : "#FFFFFF",
			connectButtonTextError: "#FFFFFF",
			modalBackground: colors.card,
			modalBackdrop: "rgba(28, 25, 23, 0.55)",
			modalBorder: colors.border,
			profileAction: colors.canvas,
			profileActionHover: colors.border,
			profileForeground: colors.ink,
		},
	};

	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider
					theme={themeWithCustomColors}
					coolMode={false}
					initialChain={FEATURED_JAR.chainId}
				>
					{children}
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
