import type React from "react"

export default function JarDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // We don't need a back button here since it's already in the parent layout
  return <div className="w-full">{children}</div>
}

