import type React from "react"
import { ThemeProvider } from "@/components/design/theme-provider"
import { RainbowKitProviderWrapper } from "@/components/wallet/rainbow-kit-provider"
import { Toaster } from "@/components/ui/toaster"
import { PageTransition } from "@/components/design/page-transition"
import { CollapsibleSidebar } from "@/components/design/collapsible-sidebar"
import { NetworkSwitcher } from "@/components/network/network-switcher"
import localFont from "next/font/local"
import "./countdown-animation.css"
import "./loading-animation.css"
import "./globals.css"

const clashDisplay = localFont({
  src: "../ClashDisplay.ttf",
  variable: "--font-clash-display",
  display: 'swap',     // ⚡ Add font-display: swap for faster rendering
  preload: true,       // ⚡ Preload font for better performance
})

export const metadata = {
  title: "Cookie Jar V3 | Shared Token Pools",
  description: "A platform for creating and managing shared token pools with customizable access rules",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="custom-scrollbar" suppressHydrationWarning>
        <div className={`${clashDisplay.variable} font-clash`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange suppressHydrationWarning>
            <RainbowKitProviderWrapper>
              <CollapsibleSidebar />
              <div className="ml-[80px]">
                <PageTransition>{children}</PageTransition>
              </div>
              <NetworkSwitcher />
              <Toaster />
            </RainbowKitProviderWrapper>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
