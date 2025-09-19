"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId } from "wagmi"
import { keccak256, toUtf8Bytes } from "ethers"
import { useReadCookieJarHasRole } from "@/generated"
import { isV2Chain } from "@/config/supported-networks"

export function useAllowlistStatus(jarAddress: string) {
  const [isAllowlisted, setIsAllowlisted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const { address: userAddress } = useAccount()

  const chainId = useChainId()
  
  // Use correct role name based on contract version
  const roleName = isV2Chain(chainId) ? "JAR_ALLOWLISTED" : "JAR_WHITELISTED"
  const JAR_ROLE = keccak256(toUtf8Bytes(roleName)) as `0x${string}`

  // Use the contract hook to check allowlist status
  const { data, isLoading: isLoadingRole } = useReadCookieJarHasRole({
    address: jarAddress as `0x${string}`,
    args: userAddress ? [JAR_ROLE, userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress && !!jarAddress,
    },
  })

  useEffect(() => {
    if (!isLoadingRole) {
      setIsAllowlisted(!!data)
      setIsLoading(false)
    }
  }, [data, isLoadingRole])

  return { isAllowlisted, isLoading }
}
