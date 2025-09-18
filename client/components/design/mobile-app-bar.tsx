'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Cookie, ChefHat, User } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { useIsMobile } from '@/components/ui/use-mobile'
import { useNavigateToTop } from '@/hooks/useNavigateToTop'

const mobileNavItems = [
  { name: "Jars", href: "/jars", icon: Cookie },
  { name: "Bake", href: "/create", icon: ChefHat },
  { name: "Profile", href: "/profile", icon: User },
]

const slideUpBounce = {
  initial: { 
    y: 100, 
    opacity: 0 
  },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
      duration: 0.6
    }
  }
}

interface MobileTabButtonProps {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
}

function MobileTabButton({ name, href, icon: Icon, isActive }: MobileTabButtonProps) {
  const { navigateToTop } = useNavigateToTop()
  
  const handleClick = () => {
    navigateToTop(href)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center justify-center py-3 transition-all duration-200 flex-1 min-h-[50px]",
        isActive
          ? "text-[hsl(var(--cj-brand-orange))]"
          : "text-[hsl(var(--cj-medium-brown))] hover:text-[hsl(var(--cj-brand-orange))]"
      )}
    >
      <Icon className={cn("h-5 w-5 mb-1", isActive ? "text-[hsl(var(--cj-brand-orange))]" : "")} />
      <span className="text-xs font-medium">{name}</span>
    </button>
  )
}

export function MobileAppBar() {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  
  if (!isMobile) return null

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={slideUpBounce}
      className="mobile-app-bar fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--cj-nav-bg))] border-t border-border shadow-lg"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        position: 'fixed'
      }}
    >
      <div className="flex justify-around">
        {mobileNavItems.map((item) => (
          <MobileTabButton
            key={item.name}
            name={item.name}
            href={item.href}
            icon={item.icon}
            isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
          />
        ))}
      </div>
    </motion.div>
  )
}
