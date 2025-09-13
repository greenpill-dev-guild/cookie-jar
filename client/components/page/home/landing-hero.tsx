"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomConnectButton } from "@/components/wallet/custom-connect-button"
import { useAccount } from "wagmi"

export function LandingHero() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isConnected } = useAccount()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleExploreClick = () => {
    router.push("/jars")
  }

  if (!mounted) return null

  return (
    <>
      <div className="relative cream-bg min-h-screen flex flex-col">
        <header className="page-header">
          <div className="section-container flex items-center justify-between">
            <div className="md:hidden">
              {/* Mobile logo - sidebar will be visible on the left */}
              <Image src="/logo.png" alt="Cookie Jar Logo" width={52} height={52} priority />
            </div>
            <div className="hidden md:block">
              <span className="text-3xl md:text-4xl font-bold text-[#3c2a14]">Cookie Jar V3</span>
            </div>

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/jars" className="text-lg font-medium text-[#3c2a14] hover:text-primary transition-colors">
                EXPLORE
              </Link>
              <Link href="/create" className="text-lg font-medium text-[#3c2a14] hover:text-primary transition-colors">
                CREATE
              </Link>
              {/* <Link href="/docs" className="text-lg font-medium text-[#3c2a14] hover:text-primary transition-colors">
                DOCS
              </Link> */}
              <CustomConnectButton />
            </nav>
          </div>
        </header>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="absolute inset-x-0 top-20 z-50 bg-background/95 backdrop-blur-sm border-b md:hidden">
            <nav className="container flex flex-col gap-6 p-6">
              <Link
                href="/jars"
                className="text-xl font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                EXPLORE
              </Link>
              <Link
                href="/create"
                className="text-xl font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                CREATE
              </Link>
              <Link
                href="/docs"
                className="text-xl font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                DOCS
              </Link>
              <div className="py-2">
                <CustomConnectButton />
              </div>
            </nav>
          </div>
        )}

        {/* Hero content */}
        <div className="flex-1 flex items-center w-full">
          <div className="section-container py-16 md:py-24 w-full">
            <div className="hero-content">
              <h1 className="mega-text mb-8">
                SHARE <span className="text-primary">RESOURCES</span>
                <br />
                WITH <span className="block mt-4">COOKIE JARS</span>
              </h1>
              <p className="text-xl md:text-2xl text-[#4a3520] max-w-3xl mb-12">
                Create controlled token pools with customizable access rules, withdrawal limits, and transparent
                tracking.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-12">
                <Button
                  onClick={handleExploreClick}
                  className="bg-[#ff5e14] hover:bg-[#e54d00] text-white text-xl py-6 px-10 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl w-full sm:w-auto"
                >
                  EXPLORE JARS
                </Button>
                <Link href="/create">
                  <Button
                    variant="outline"
                    className="border-[#ff5e14] text-[#ff5e14] hover:bg-[#fff0e0] text-xl py-6 px-10 rounded-full shadow-md transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
                  >
                    <span className="text-[#ff5e14]">CREATE A JAR</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="page-section cream-bg">
        <div className="section-container">
          <h2 className="text-center mb-16 text-[#3c2a14]">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-primary">1</span>
              </div>
              <h3 className="mb-4 text-[#3c2a14]">Create a Jar</h3>
              <p className="text-xl text-[#4a3520]">
                Set up a new jar with custom access controls and withdrawal rules.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-primary">2</span>
              </div>
              <h3 className="mb-4 text-[#3c2a14]">Deposit Funds</h3>
              <p className="text-xl text-[#4a3520]">Add ETH or ERC20 tokens to your jar for your team or community.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-primary">3</span>
              </div>
              <h3 className="mb-4 text-[#3c2a14]">Manage Withdrawals</h3>
              <p className="text-xl text-[#4a3520]">
                Control who can withdraw funds and track all transactions transparently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
