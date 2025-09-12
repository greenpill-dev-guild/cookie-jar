"use client"
import { Suspense, lazy } from "react"
import { useAccount } from "wagmi"
import { MemoizedCustomConnectButton } from "@/components/wallet/custom-connect-button"
import { JarGridSkeleton } from "@/components/loading/jar-skeleton"

// Lazy load the heavy jar content component
const JarContentLazy = lazy(() => 
  import("@/components/jars/jar-content-lazy").then(module => ({ default: module.JarContentLazy }))
)

export default function CookieJarPage() {
  const { isConnected, address: userAddress } = useAccount()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] py-10">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-[#3c2a14] mb-4">Connect Your Wallet</h2>
          <p className="text-lg text-[#4a3520] mb-6">Please connect your wallet to view Cookie Jars.</p>
          <MemoizedCustomConnectButton className="w-full mx-auto mt-4" />
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<JarGridSkeleton />}>
      <JarContentLazy userAddress={userAddress!} />
    </Suspense>
  )
}
