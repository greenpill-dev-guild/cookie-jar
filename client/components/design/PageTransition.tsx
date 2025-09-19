"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isScrollComplete, setIsScrollComplete] = useState(false)

  // Handle scroll on route changes
  useEffect(() => {
    setIsScrollComplete(false)
    
    // Immediate scroll to header on route change
    const header = document.querySelector('header') || document.querySelector('[role="banner"]')
    if (header) {
      header.scrollIntoView({ 
        behavior: 'instant', 
        block: 'start',
        inline: 'nearest' 
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    
    // Mark scroll as complete after a brief moment
    setTimeout(() => {
      setIsScrollComplete(true)
    }, 50)
  }, [pathname])

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 30 }}
      animate={{ 
        opacity: isScrollComplete ? 1 : 0, 
        y: isScrollComplete ? 0 : 30 
      }}
      exit={{ opacity: 0, y: -30 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.4,
      }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  )
}
