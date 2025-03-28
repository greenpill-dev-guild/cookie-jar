"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Home, Cookie, Plus, FileText, Settings, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAccount, useDisconnect } from "wagmi"
import { isAdminAddress } from "@/lib/admin-utils"

export function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if the connected address is an admin
  useEffect(() => {
    if (isConnected && address) {
      console.log("Sidebar - Connected address:", address)
      const adminStatus = isAdminAddress(address)
      console.log("Sidebar - Is admin:", adminStatus)
      setIsAdmin(adminStatus)
    } else {
      setIsAdmin(false)
    }
  }, [isConnected, address])

  // Navigation items - filter out Admin for non-admins
  const navItems = [
    { name: "Home", href: "/", icon: <Home className="h-5 w-5" /> },
    { name: "Explore Jars", href: "/jars", icon: <Cookie className="h-5 w-5" /> },
    { name: "Create Jar", href: "/create", icon: <Plus className="h-5 w-5" /> },
    { name: "Documentation", href: "/docs", icon: <FileText className="h-5 w-5" /> },
    // Only include Admin link if user is an admin
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: <Settings className="h-5 w-5" /> }] : []),
  ]

  return (
    <div
      id="collapsible-sidebar"
      className={cn(
        "fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out",
        isExpanded ? "w-[320px]" : "w-[80px]",
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Sidebar background with solid color */}
      <div className="absolute inset-0 bg-[#3c2a14]" />

      {/* Content container */}
      <div className="relative h-full flex flex-col py-6">
        {/* Logo */}
        <div className="px-4 mb-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#f5e6d8] flex items-center justify-center">
              <Image src="/logo.png" alt="Cookie Jar Logo" width={36} height={36} />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-2xl font-bold text-white overflow-hidden whitespace-nowrap"
                >
                  Cookie Jar V3
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-2 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center h-14 px-4 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-[#ff5e14] bg-opacity-20 border-[#ff5e14] border-2"
                    : "hover:bg-white hover:bg-opacity-10 border-2 border-transparent",
                )}
              >
                <div className={cn("text-white", isActive ? "text-[#ff5e14]" : "")}>{item.icon}</div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("ml-4 text-lg font-medium text-white", isActive ? "text-[#ff5e14]" : "")}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="mt-auto px-4 pt-4 space-y-2">
          {isConnected && (
            <>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center h-14 px-4 rounded-xl transition-all duration-200",
                  pathname === "/profile"
                    ? "bg-[#ff5e14] bg-opacity-20 border-[#ff5e14] border-2"
                    : "hover:bg-white hover:bg-opacity-10 border-2 border-transparent",
                )}
              >
                <div className={cn("text-white", pathname === "/profile" ? "text-[#ff5e14]" : "")}>
                  <User className="h-5 w-5" />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "ml-4 text-lg font-medium text-white",
                        pathname === "/profile" ? "text-[#ff5e14]" : "",
                      )}
                    >
                      Profile
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              <button
                onClick={() => disconnect()}
                className="flex items-center h-14 px-4 rounded-xl w-full text-left hover:bg-white hover:bg-opacity-10 transition-all duration-200 border-2 border-transparent"
              >
                <LogOut className="h-5 w-5 text-white" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-4 text-lg font-medium text-white"
                    >
                      Disconnect
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

