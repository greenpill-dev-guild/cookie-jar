import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { RainbowKitProviderWrapper } from "@/components/wallet/RainbowKitProviderWrapper"
import { Toaster } from "@/components/ui/toaster"
import { PageTransition } from "@/components/design/PageTransition"
import { Header } from "@/components/design/Header"
import { MobileAppBar } from "@/components/design/MobileAppBar"
import { NetworkSwitcher } from "@/components/network/NetworkSwitcher"
import localFont from "next/font/local"
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
      <body className="custom-scrollbar cj-bg-main" suppressHydrationWarning>
        <div className={`${clashDisplay.variable} font-clash`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange suppressHydrationWarning>
            <RainbowKitProviderWrapper>
              <Header />
              <main className="pt-16 pb-4 md:pb-4 cj-bg-main">
                <div className="px-4 py-4 md:px-6 lg:px-8">
                  <PageTransition>{children}</PageTransition>
                </div>
              </main>
              <MobileAppBar />
              <NetworkSwitcher />
              <Toaster />
            </RainbowKitProviderWrapper>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
