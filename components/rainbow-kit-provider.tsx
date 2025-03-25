"use client"

import type { ReactNode } from "react"
import "@rainbow-me/rainbowkit/styles.css"
import { getDefaultConfig, RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit"
import { WagmiProvider } from "wagmi"
import { mainnet, base, optimism, arbitrum, sepolia, gnosis } from "wagmi/chains"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import { http } from "wagmi"
import { useTheme } from "next-themes"

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ""
const infuraId = process.env.NEXT_PUBLIC_INFURA_ID || ""

// Define our custom orange color
const orangeColor = "#ff5e14"

const config = getDefaultConfig({
  appName: "Cookie Jar V3",
  projectId,
  chains: [base, optimism, arbitrum, gnosis, sepolia, mainnet],
  ssr: true,
  transports: {
    [base.id]: http(`https://base-mainnet.infura.io/v3/${infuraId}`),
    [optimism.id]: http(`https://optimism-mainnet.infura.io/v3/${infuraId}`),
    [arbitrum.id]: http(`https://arbitrum-mainnet.infura.io/v3/${infuraId}`),
    [gnosis.id]: http(`https://gnosis-mainnet.infura.io/v3/${infuraId}`),
    [sepolia.id]: http(`https://sepolia.infura.io/v3/${infuraId}`),
    [mainnet.id]: http(`https://mainnet.infura.io/v3/${infuraId}`),
  },
})

const queryClient = new QueryClient()

export function RainbowKitProviderWrapper({ children }: { children: ReactNode }) {
  const { theme } = useTheme()

  // Create custom themes with our orange color
  const customLightTheme = lightTheme({
    accentColor: orangeColor,
    accentColorForeground: "white",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  })

  const customDarkTheme = darkTheme({
    accentColor: orangeColor,
    accentColorForeground: "white",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  })

  // Override the connected button colors
  const themeWithCustomColors = {
    ...(theme === "dark" ? customDarkTheme : customLightTheme),
    colors: {
      ...(theme === "dark" ? customDarkTheme.colors : customLightTheme.colors),
      connectButtonBackground: orangeColor,
      connectButtonBackgroundError: "#FF494A",
      connectButtonInnerBackground: orangeColor,
      connectButtonText: "white",
      connectButtonTextError: "white",
    },
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={themeWithCustomColors} coolMode={false}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

