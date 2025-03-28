"use client"

import { JarsList } from "@/components/jars-list"
import { JarsHeader } from "@/components/jars-header"
import { PageTransition } from "@/components/page-transition"

export function JarsPageClient() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <JarsHeader />
        <JarsList />
      </div>
    </PageTransition>
  )
}

