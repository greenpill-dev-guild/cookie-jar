import type React from "react"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full">
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#2b1d0e] p-4 flex items-center">
        <Link
          href="/"
          className="flex items-center text-white hover:text-[#ff5e14] bg-[#3c2a14] rounded-full px-4 py-2 shadow-md ml-[80px]"
        >
          <div className="bg-[#ff5e14] rounded-full p-2">
            <ChevronLeft className="h-5 w-5 text-white" />
          </div>
          <span className="ml-2 font-medium">Go Back</span>
        </Link>
      </div>
      <div className="pt-20">{children}</div>
    </div>
  )
}
