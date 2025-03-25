import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { RainbowKitProviderWrapper } from "@/components/rainbow-kit-provider"
import { Toaster } from "@/components/ui/toaster"
import { PageTransition } from "@/components/page-transition"
import localFont from "next/font/local"
import "./globals.css"

const clashDisplay = localFont({
  src: "../ClashDisplay.ttf",
  variable: "--font-clash-display",
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
      <body className={`${clashDisplay.variable} font-clash`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <RainbowKitProviderWrapper>
            <PageTransition>{children}</PageTransition>
            <Toaster />
          </RainbowKitProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}

