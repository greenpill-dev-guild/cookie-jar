/**
 * Accessibility Components and Utilities
 * 
 * This module provides comprehensive accessibility features including
 * screen reader support, keyboard navigation, focus management, and
 * progressive enhancement capabilities.
 */

"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * Screen Reader Only Content
 * Content that's only visible to screen readers
 */
interface ScreenReaderOnlyProps {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({
  children,
  as: Component = 'span',
  className = ''
}) => {
  return (
    <Component
      className={cn(
        'sr-only absolute -left-10000px top-auto w-px h-px overflow-hidden',
        className
      )}
    >
      {children}
    </Component>
  )
}

/**
 * Skip Link - allows keyboard users to skip to main content
 */
interface SkipLinkProps {
  href?: string
  children?: React.ReactNode
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  href = '#main-content',
  children = 'Skip to main content'
}) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                 bg-blue-600 text-white px-4 py-2 rounded-md z-50 
                 transition-all duration-200 focus:outline-none focus:ring-2 
                 focus:ring-blue-500 focus:ring-offset-2"
    >
      {children}
    </a>
  )
}

/**
 * Focus Trap - traps keyboard focus within a container
 */
interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  className?: string
  onEscape?: () => void
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  className = '',
  onEscape
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Find all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return []
      
      const focusableQuery = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ')
      
      return Array.from(containerRef.current.querySelectorAll(focusableQuery))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape()
        return
      }

      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: focus previous element
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: focus next element
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Set initial focus
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore previous focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [active, onEscape])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

/**
 * Live Region - announces dynamic content changes to screen readers
 */
interface LiveRegionProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  className?: string
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  politeness = 'polite',
  atomic = false,
  className = ''
}) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  )
}

/**
 * Announcement Hook - programmatically announce messages to screen readers
 */
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('')
    // Small delay to ensure screen reader picks up the change
    setTimeout(() => {
      setAnnouncement(message)
    }, 10)
  }, [])

  const clear = useCallback(() => {
    setAnnouncement('')
  }, [])

  return {
    announce,
    clear,
    AnnouncementRegion: () => (
      <LiveRegion politeness="polite">
        {announcement}
      </LiveRegion>
    )
  }
}

/**
 * Keyboard Navigation Helper
 */
interface KeyboardNavigationProps {
  children: React.ReactNode
  onArrowDown?: () => void
  onArrowUp?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onEnter?: () => void
  onEscape?: () => void
  onTab?: (shiftKey: boolean) => void
  className?: string
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  onArrowDown,
  onArrowUp,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onEscape,
  onTab,
  className = ''
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (onArrowDown) {
          e.preventDefault()
          onArrowDown()
        }
        break
      case 'ArrowUp':
        if (onArrowUp) {
          e.preventDefault()
          onArrowUp()
        }
        break
      case 'ArrowLeft':
        if (onArrowLeft) {
          e.preventDefault()
          onArrowLeft()
        }
        break
      case 'ArrowRight':
        if (onArrowRight) {
          e.preventDefault()
          onArrowRight()
        }
        break
      case 'Enter':
        if (onEnter) {
          e.preventDefault()
          onEnter()
        }
        break
      case 'Escape':
        if (onEscape) {
          e.preventDefault()
          onEscape()
        }
        break
      case 'Tab':
        if (onTab) {
          onTab(e.shiftKey)
        }
        break
    }
  }

  return (
    <div onKeyDown={handleKeyDown} className={className}>
      {children}
    </div>
  )
}

/**
 * Accessible Button with enhanced keyboard and screen reader support
 */
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  describedBy?: string
  pressed?: boolean
  expanded?: boolean
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = 'Loading...',
  describedBy,
  pressed,
  expanded,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-describedby={describedBy}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-busy={loading}
      {...props}
    >
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="sr-only">{loadingText}</span>
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
    </button>
  )
}

/**
 * Progress Indicator with accessibility features
 */
interface AccessibleProgressProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  className?: string
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const valueText = showValue ? `${Math.round(percentage)}%` : undefined

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
          {showValue && (
            <span className="text-sm text-gray-600">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
        aria-label={label}
        className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
      >
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Tooltip with accessibility support
 */
interface AccessibleTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  children,
  content,
  placement = 'top',
  delay = 500
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`)

  const showTooltip = useCallback(() => {
    if (timeoutId) clearTimeout(timeoutId)
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }, [delay, timeoutId])

  const hideTooltip = useCallback(() => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }, [timeoutId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideTooltip()
    }
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
        aria-describedby={isVisible ? tooltipId.current : undefined}
      >
        {children}
      </div>
      {isVisible && (
        <div
          id={tooltipId.current}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg',
            placement === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            placement === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            placement === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            placement === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2'
          )}
        >
          {content}
          <div
            className={cn(
              'absolute w-2 h-2 bg-gray-900 rotate-45',
              placement === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1',
              placement === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
              placement === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1',
              placement === 'right' && 'right-full top-1/2 -translate-y-1/2 -mr-1'
            )}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Accessibility utilities
 */
export const AccessibilityUtils = {
  /**
   * Generate unique IDs for ARIA relationships
   */
  generateId: (prefix: string = 'element') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  /**
   * Check if user prefers dark mode
   */
  prefersDarkMode: () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  },

  /**
   * Check if user prefers high contrast
   */
  prefersHighContrast: () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-contrast: high)').matches
  },

  /**
   * Focus management utilities
   */
  focusUtils: {
    /**
     * Move focus to the first focusable element in a container
     */
    focusFirst: (container: HTMLElement) => {
      const firstFocusable = container.querySelector(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      
      if (firstFocusable) {
        firstFocusable.focus()
      }
    },

    /**
     * Restore focus to a previously focused element
     */
    restoreFocus: (element: HTMLElement | null) => {
      if (element && document.contains(element)) {
        element.focus()
      }
    }
  }
}
