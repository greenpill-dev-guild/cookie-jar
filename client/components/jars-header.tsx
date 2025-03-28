"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAccount } from "wagmi"
import { CustomConnectButton } from "@/components/custom-connect-button"

export function JarsHeader() {
  const { isConnected } = useAccount()

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold">Explore Cookie Jars</h1>
        <p className="text-muted-foreground mt-1">Browse and discover community jars</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {isConnected ? (
          <Link href="/create">
            <Button>Create a Jar</Button>
          </Link>
        ) : (
          <CustomConnectButton />
        )}
      </div>
    </div>
  )
}

