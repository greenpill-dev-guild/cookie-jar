"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function LandingHero() {
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
      <div className="relative flex flex-col overflow-x-hidden">

        {/* Hero content */}
        <div className="flex-1 flex items-center w-full">
          <div className="section-container py-8 md:py-12 w-full">
            <div className="hero-content">
              <h1 className="mega-text mb-6 md:mb-8">
                SHARE <span className="text-primary">RESOURCES</span>
                <br />
                WITH <span className="block mt-2 md:mt-4">COOKIE JARS</span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-[#4a3520] max-w-3xl mb-8 md:mb-12 leading-relaxed">
                Create controlled token pools with customizable access rules, withdrawal limits, and transparent
                tracking.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 mt-8 md:mt-12">
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
                    <span className="text-[#ff5e14]">START BAKING</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="page-section cream-bg overflow-x-hidden">
        <div className="section-container">
          <h2 className="text-center mb-12 md:mb-16 text-[#3c2a14] text-3xl md:text-4xl font-bold">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col items-center text-center px-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 md:mb-6">
                <span className="text-2xl md:text-3xl font-bold text-primary">1</span>
              </div>
              <h3 className="mb-3 md:mb-4 text-[#3c2a14] text-xl md:text-2xl font-semibold">Create</h3>
              <p className="text-base md:text-xl text-[#4a3520] leading-relaxed">
                Set up a jar with access controls and withdrawal rules.
              </p>
            </div>
            <div className="flex flex-col items-center text-center px-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 md:mb-6">
                <span className="text-2xl md:text-3xl font-bold text-primary">2</span>
              </div>
              <h3 className="mb-3 md:mb-4 text-[#3c2a14] text-xl md:text-2xl font-semibold">Bake</h3>
              <p className="text-base md:text-xl text-[#4a3520] leading-relaxed">Deposit ETH or any ERC20 tokens to your jar.</p>
            </div>
            <div className="flex flex-col items-center text-center px-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 md:mb-6">
                <span className="text-2xl md:text-3xl font-bold text-primary">3</span>
              </div>
              <h3 className="mb-3 md:mb-4 text-[#3c2a14] text-xl md:text-2xl font-semibold">Eat</h3>
              <p className="text-base md:text-xl text-[#4a3520] leading-relaxed">
                Addresses with access can withdraw funds and leave a note.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
