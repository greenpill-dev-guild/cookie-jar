"use client"

import { useAccount } from "wagmi"
import { Badge } from "@/components/ui/badge"
import { Crown, Check } from "lucide-react"
import { keccak256, toUtf8Bytes } from "ethers"
import { useReadCookieJarHasRole } from "@/generated"
import { useAllowlistStatus } from "@/hooks/useAllowlistStatus"

// Constants for roles
const JAR_OWNER_ROLE = keccak256(toUtf8Bytes("JAR_OWNER")) as `0x${string}`

interface JarStatusBadgeProps {
  jarAddress: string
}

export function JarStatusBadge({ jarAddress }: JarStatusBadgeProps) {
  const { address: userAddress } = useAccount()
  const { isAllowlisted } = useAllowlistStatus(jarAddress)
  const { data: hasJarOwnerRole } = useReadCookieJarHasRole({
    address: jarAddress as `0x${string}`,
    args: userAddress ? [JAR_OWNER_ROLE, userAddress as `0x${string}`] : undefined,
  })
  
  const isAdmin = hasJarOwnerRole === true
  
  // Flexible container that prevents layout shift while handling overflow
  return (
    <div className="flex justify-end min-w-0 flex-shrink-0">
      {isAdmin ? (
        <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800 text-xs flex items-center gap-1 truncate">
          <Crown className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Admin</span>
        </Badge>
      ) : isAllowlisted ? (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800 text-xs flex items-center gap-1 truncate max-w-[80px]">
          <Check className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Allowlisted</span>
        </Badge>
      ) : null}
    </div>
  )
}
