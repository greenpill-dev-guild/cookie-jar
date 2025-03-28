"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useCookieJars } from "@/hooks/use-cookie-jars"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function JarsList() {
  const { jars, loading, error } = useCookieJars()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <LoadingState />
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-semibold mb-2">Error loading jars</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (jars.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-semibold mb-2">No jars found</h3>
        <p className="text-muted-foreground mb-4">Be the first to create a jar!</p>
        <Link href="/create">
          <Button>Create a Jar</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {jars.map((jar) => (
        <Link href={`/jars/${jar.address}`} key={jar.address}>
          <Card className="h-full hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="truncate">{jar.name}</CardTitle>
              <CardDescription className="truncate">{jar.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-medium">{jar.balance} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Access:</span>
                  <span className="font-medium capitalize">{jar.accessType}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-full">
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

