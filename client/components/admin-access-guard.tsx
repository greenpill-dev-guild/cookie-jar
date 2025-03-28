"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { isAdminAddress } from "@/lib/admin-utils"

interface AdminAccessGuardProps {
  children: React.ReactNode
}

export function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [redirect, setRedirect] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setIsAdmin(false)
      return
    }

    // Check if the connected address is in the admin list
    const checkIsAdmin = () => {
      console.log("Connected address:", address)
      const adminStatus = isAdminAddress(address)
      console.log("Is admin address:", adminStatus)
      setIsAdmin(adminStatus)
    }

    checkIsAdmin()
  }, [address, isConnected])

  useEffect(() => {
    if (isAdmin === false) {
      console.log("Not an admin, preparing to redirect...")
      // Add a small delay to ensure the console logs are visible
      const timer = setTimeout(() => {
        setRedirect(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isAdmin])

  useEffect(() => {
    if (redirect) {
      router.push("/")
    }
  }, [redirect, router])

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#2c1e10]">
        <Loader2 className="h-12 w-12 text-[#ff5e14] animate-spin" />
        <p className="mt-4 text-xl text-white">Checking admin access...</p>
      </div>
    )
  }

  // Not admin - redirect to home
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#2c1e10]">
        <p className="text-2xl text-white">Access denied. Redirecting...</p>
      </div>
    )
  }

  // Is admin - show children
  return <>{children}</>
}

