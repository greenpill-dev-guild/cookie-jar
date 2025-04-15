"use client"

import { useState, useEffect } from "react"
import { useReadCookieJarRegistryGetAllJars } from "../generated"

interface JarData {
  jarAddress: string
  currency: string
  jarCreator: string
  metadata: string
  registrationTime: number
  accessType: number
  withdrawalOption: number
  fixedAmount: number
  maxWithdrawal: number
  withdrawalInterval: number
  strictPurpose: boolean
  emergencyWithdrawalEnabled: boolean
}

export function useCookieJarData() {
  const [cookieJarsData, setCookieJarsData] = useState<Array<JarData>>([])
  const [error, setError] = useState<Error | null>(null)
  const [shouldFetchJar, setShouldFetchJar] = useState(true)

  // Query: Get the jar data
  const {
    data: jarResponse,
    isSuccess: isJarSuccess,
    isLoading: isJarLoading,
    error: jarError,
  } = useReadCookieJarRegistryGetAllJars({
    args: [],
    query: {
      enabled: shouldFetchJar,
    },
  })
  console.log(jarResponse)
  useEffect(() => {
    if (isJarSuccess && jarResponse) {
      try {
        // Map jarResponse to match JarData structure
        const formattedData: JarData[] = jarResponse.map((jar: any) => ({
          jarAddress: jar.jarAddress,
          currency: jar.currency,
          jarCreator: jar.jarCreator,
          metadata: jar.metadata,
          registrationTime: Number(jar.registrationTime),
          accessType: Number(jar.accessType),
          withdrawalOption: Number(jar.withdrawalOption),
          fixedAmount: Number(jar.fixedAmount),
          maxWithdrawal: Number(jar.maxWithdrawal),
          withdrawalInterval: Number(jar.withdrawalInterval),
          strictPurpose: Boolean(jar.strictPurpose),
          emergencyWithdrawalEnabled: Boolean(jar.emergencyWithdrawalEnabled),
        }))

        setCookieJarsData(formattedData)
        setShouldFetchJar(false)
      } catch (err) {
        setError(err as Error)
      }
    }
  }, [jarResponse, isJarSuccess])

  return {
    cookieJarsData,
    isLoading: isJarLoading,
    error: error || jarError,
  }
}
