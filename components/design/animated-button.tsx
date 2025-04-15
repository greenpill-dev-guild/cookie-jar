"use client"
import type { ReactNode } from "react"
import Link from "next/link"

interface AnimatedButtonProps {
  text: string
  href?: string
  onClick?: () => void
  className?: string
  icon?: ReactNode
  small?: boolean
}

export function AnimatedButton({ text, href, onClick, className = "", icon, small = false }: AnimatedButtonProps) {
  // Update the AnimatedButton component to use a button element instead of an anchor when no href is provided
  // This will prevent nested <a> tags when used inside a Link component

  // Update the buttonContent to use a button element when no href is provided
  const buttonContent = (
    <div className={`btn-conteiner ${className}`}>
      <span>{text}</span>
      {icon && <span className="icon">{icon}</span>}
    </div>
  )

  if (href) {
    return <Link href={href}>{buttonContent}</Link>
  }

  return (
    <button onClick={onClick} className={`btn-conteiner ${className}`}>
      <span>{text}</span>
      {icon && <span className="icon">{icon}</span>}
    </button>
  )
}
