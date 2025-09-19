"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, Cookie, ChefHat } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export function Header() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", href: "/", icon: <Home className="h-5 w-5" /> },
    { name: "Jars", href: "/jars", icon: <Cookie className="h-5 w-5" /> },
    { name: "Bake", href: "/create", icon: <ChefHat className="h-5 w-5" /> },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--cj-nav-bg))] border-b border-border shadow-lg">
      <div className="px-4 h-16 flex items-center">
        {/* Left Section - Logo */}
        <div className="flex-none md:flex-1 flex items-center justify-start min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-[hsl(var(--cj-warm-white))] flex items-center justify-center flex-shrink-0">
              <Image src="/logo.png" alt="Cookie Jar Logo" width={28} height={28} priority />
            </div>
            <div className="text-responsive-lg font-bold text-[hsl(var(--cj-dark-brown))] hidden sm:block truncate">
              Cookie Jar V3
            </div>
          </Link>
        </div>

        {/* Center Section - Navigation always centered */}
        <div className="flex-none">
          <nav className="hidden md:flex">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 w-16 sm:w-20 h-12 sm:h-14 px-1 sm:px-2 py-2 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-[hsl(var(--cj-brand-orange))] text-[hsl(var(--cj-warm-white))] shadow-lg transform scale-105"
                        : "text-[hsl(var(--cj-medium-brown))] hover:bg-[hsl(var(--cj-warm-white))]/10 hover:text-[hsl(var(--cj-dark-brown))] hover:transform hover:scale-105",
                    )}
                  >
                    {item.icon}
                    <span className="text-xs font-medium truncate max-w-full">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>

        {/* Right Section - Wallet */}
        <div className="flex-1 md:flex-1 flex items-center justify-end">
          <ConnectButton 
            showBalance={false} 
            chainStatus="icon"
            label="Connect"
          />
        </div>
      </div>
    </header>
  )
}