"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import type { ReactNode } from "react"

interface StyledButtonProps {
  children: ReactNode
  onClick?: () => void
  href?: string
  className?: string
  type?: "button" | "submit" | "reset"
}

export function StyledButton({ children, onClick, href, className, type = "button" }: StyledButtonProps) {
  const buttonClasses = cn(
    "w-[9em] h-[3em] rounded-[30em] text-[15px] font-inherit relative overflow-hidden z-[1]",
    "shadow-[6px_6px_12px_#c5c5c5,-6px_-6px_12px_#ffffff]",
    "border-2 border-[#ff5e14]", // Added orange border
    "before:content-[''] before:w-0 before:h-[3em] before:rounded-[30em] before:absolute before:top-0 before:left-0",
    "before:bg-gradient-to-r before:from-[#ff5e14] before:to-[#ff8e14]",
    "before:transition-[width] before:duration-500 before:ease before:block before:-z-[1]",
    "hover:before:w-[9em] hover:text-white",
    "text-[#3c2a14] font-medium",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        <span className="flex items-center justify-center h-full">{children}</span>
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={buttonClasses}>
      {children}
    </button>
  )
}
