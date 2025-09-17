"use client"
import { Suspense, lazy } from "react"
import { useAccount } from "wagmi"
import { JarGridSkeleton } from "@/components/loading/jar-skeleton"

// Lazy load the heavy jar content component
const JarContentLazy = lazy(() => 
  import("@/components/jars/jar-content-lazy").then(module => ({ default: module.JarContentLazy }))
)

export default function CookieJarPage() {
  const { address: userAddress } = useAccount()

  return (
    <Suspense fallback={<JarGridSkeleton />}>
      <JarContentLazy userAddress={userAddress} />
    </Suspense>
  )
}
