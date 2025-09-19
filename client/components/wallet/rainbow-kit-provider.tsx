"use client";

import { wagmiConfig } from "@/config/supported-networks";
import {
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";

// Define Base Sepolia chain if not already defined in wagmi/chains
//commenting this out because I not certain if it's important or not
// const baseSepoliaConfig = {
//   id: 84532,
//   name: "Base Sepolia",
//   network: "base-sepolia",
//   nativeCurrency: {
//     decimals: 18,
//     name: "Ethereum",
//     symbol: "ETH",
//   },
//   rpcUrls: {
//     public: { http: ["https://sepolia.base.org"] },
//     default: { http: ["https://sepolia.base.org"] },
//   },
//   blockExplorers: {
//     default: { name: "BaseScan", url: "https://sepolia-explorer.base.org" },
//   },
//   testnet: true,
// }

// Get Cookie Jar brand orange color - theme aware
// RainbowKit requires hex values, so we use the computed value
const getOrangeColor = (isDark: boolean = false) => {
  // Default fallback for SSR/initial render
  if (typeof window === 'undefined') {
    return isDark ? '#c17a47' : '#ff5e14'; // Desaturated for dark mode
  }
  
  // Theme-aware orange colors (converted from HSL to hex)
  if (isDark) {
    // Dark mode: 20 55% 45% = more desaturated orange
    return '#c17a47';
  } else {
    // Light mode: 20 95% 50% = bright orange
    return '#ff5e14';
  }
};

const queryClient = new QueryClient();

export function RainbowKitProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const { theme } = useTheme();
  
  const isDarkMode = theme === "dark";
  
  // Get the current orange color (theme-aware)
  const currentOrangeColor = getOrangeColor(isDarkMode);

  // Create custom themes with our Cookie Jar orange color
  const customLightTheme = lightTheme({
    accentColor: getOrangeColor(false),
    accentColorForeground: "white",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  });

  const customDarkTheme = darkTheme({
    accentColor: getOrangeColor(true), // Use desaturated orange for dark mode
    accentColorForeground: "white",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  });

  // Override the connected button colors for better theme integration
  const themeWithCustomColors = {
    ...(isDarkMode ? customDarkTheme : customLightTheme),
    colors: {
      ...(isDarkMode ? customDarkTheme.colors : customLightTheme.colors),
      // Connect button colors - use theme-aware orange
      connectButtonBackground: currentOrangeColor,
      connectButtonBackgroundError: "#FF494A",
      connectButtonInnerBackground: isDarkMode ? "#25201a" : "#fff8f0", // Theme-aware inner background
      connectButtonText: "white",
      connectButtonTextError: "white",
      // Modal and overlay colors
      modalBackground: isDarkMode ? "#1f1611" : "#fff8f0",
      modalBackdrop: "rgba(0, 0, 0, 0.5)",
      modalBorder: isDarkMode ? "#3d2f22" : "#e8d6c1",
      // Account modal colors  
      profileAction: isDarkMode ? "#25201a" : "#f5e6d8",
      profileActionHover: isDarkMode ? "#3d2f22" : "#e8d6c1",
      profileForeground: isDarkMode ? "#f5e6d8" : "#3c2a14",
    },
  };

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={themeWithCustomColors} coolMode={false}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
