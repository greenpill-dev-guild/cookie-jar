import type React from "react"
import { BackButton } from "@/components/back-button"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full">
      <div className="p-4">
        <BackButton />
      </div>
      {children}
    </div>
  )
}

