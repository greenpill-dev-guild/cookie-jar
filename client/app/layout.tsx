import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import { Header } from "@/components/app/header";
import { NetworkSwitcher } from "@/components/app/NetworkSwitcher";
import { PageTransition } from "@/components/app/PageTransition";
import { ThemeProvider } from "@/components/app/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { RainbowKitProviderWrapper } from "@/components/wallet/RainbowKitProviderWrapper";
import {
	FEATURED_JAR,
	SITE_DESCRIPTION,
	SITE_NAME,
} from "@/config/featured-jar";
import { THEME_COLORS } from "@/lib/app/theme-colors";

import "./loading-animation.css";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL(FEATURED_JAR.siteUrl),
	title: {
		default: SITE_NAME,
		template: `%s | ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	openGraph: {
		type: "website",
		siteName: SITE_NAME,
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		url: "/",
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
	},
	robots: { index: true, follow: true },
};

export const viewport: Viewport = {
	themeColor: [
		{
			media: "(prefers-color-scheme: light)",
			color: THEME_COLORS.light.canvas,
		},
		{ media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark.canvas },
	],
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning className={inter.variable}>
			<body className="custom-scrollbar cj-bg-main" suppressHydrationWarning>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
					suppressHydrationWarning
				>
					<RainbowKitProviderWrapper>
						<Header />
						<main className="pt-16 pb-8 cj-bg-main">
							<div className="px-4 py-4 md:px-6 lg:px-8">
								<PageTransition>{children}</PageTransition>
							</div>
						</main>
						<NetworkSwitcher />
						<Toaster />
					</RainbowKitProviderWrapper>
				</ThemeProvider>
			</body>
		</html>
	);
}
