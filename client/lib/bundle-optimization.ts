/**
 * Bundle Optimization Utilities
 * 
 * This module contains utilities and configurations for optimizing
 * bundle size and enabling better tree-shaking.
 */

/**
 * Dynamic import utilities for code splitting
 */
export const DynamicImports = {
  /**
   * Lazy load heavy protocol SDKs only when needed
   */
  async loadPOAPSDK() {
    try {
      // Dynamic import prevents the POAP SDK from being included in main bundle
      const poapSdk = await import('@poap-xyz/poap-sdk')
      return poapSdk
    } catch (error) {
      console.warn('Failed to load POAP SDK:', error)
      return null
    }
  },

  async loadUnlockSDK() {
    try {
      const unlock = await import('@unlock-protocol/unlock-js')
      return unlock
    } catch (error) {
      console.warn('Failed to load Unlock SDK:', error)
      return null
    }
  },

  async loadHypercertSDK() {
    try {
      const hypercerts = await import('@hypercerts-org/sdk')
      return hypercerts
    } catch (error) {
      console.warn('Failed to load Hypercerts SDK:', error)
      return null
    }
  },

  /**
   * Lazy load chart library for analytics
   */
  async loadChartLibrary() {
    try {
      const chartModule = await import('chart.js' as any)
      return chartModule.Chart || chartModule.default || chartModule
    } catch (error) {
      console.warn('Failed to load Chart.js:', error)
      return null
    }
  },

  /**
   * Lazy load animation library
   */
  async loadAnimationLibrary() {
    try {
      const lottie = await import('lottie-web' as any)
      return lottie.default || lottie
    } catch (error) {
      console.warn('Failed to load Lottie:', error)
      return null
    }
  }
}

/**
 * Tree-shakeable utility functions
 * These are designed to be imported individually to enable better tree-shaking
 */

// Address utilities - can be imported individually
export { isAddress, getAddress, checksumAddress } from 'viem'

// Format utilities - tree-shakeable
export const formatEther = (value: bigint) => {
  return (Number(value) / 1e18).toFixed(4)
}

export const formatToken = (value: bigint, decimals: number) => {
  return (Number(value) / Math.pow(10, decimals)).toFixed(4)
}

export const formatUSD = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

// Date utilities - tree-shakeable
export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export const formatRelativeTime = (date: Date) => {
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  const diff = date.getTime() - Date.now()
  const days = Math.round(diff / (1000 * 60 * 60 * 24))
  
  if (Math.abs(days) >= 1) {
    return rtf.format(days, 'day')
  }
  
  const hours = Math.round(diff / (1000 * 60 * 60))
  return rtf.format(hours, 'hour')
}

/**
 * Conditional imports based on environment
 */
export const ConditionalImports = {
  /**
   * Load development-only utilities
   */
  async loadDevTools() {
    if (process.env.NODE_ENV === 'development') {
      try {
        const devtools = await import('react-devtools' as any)
        return devtools.default || devtools
      } catch {
        return null
      }
    }
    return null
  },

  /**
   * Load analytics only in production
   */
  async loadAnalytics() {
    if (process.env.NODE_ENV === 'production') {
      try {
        const analytics = await import('@analytics/core' as any)
        return analytics.default || analytics
      } catch {
        return null
      }
    }
    return null
  },

  /**
   * Load testing utilities only in test environment
   */
  async loadTestUtils() {
    if (process.env.NODE_ENV === 'test') {
      try {
        const testUtils = await import('@testing-library/react')
        return testUtils
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Lazy component loading with preloading
 */
export const ComponentLoader = {
  /**
   * Preload components that might be needed soon
   */
  preloadProtocolComponents() {
    // Preload protocol components in the background
    const components = [
      () => import('@/components/protocol/POAPGateConfig'),
      () => import('@/components/protocol/UnlockGateConfig'),
      () => import('@/components/protocol/HypercertGateConfig'),
      () => import('@/components/protocol/HatsGateConfig')
    ]

    components.forEach(importFn => {
      // Preload in the background
      setTimeout(() => importFn().catch(() => {}), 100)
    })
  },

  /**
   * Preload components based on user interaction hints
   */
  preloadOnHover(componentImporter: () => Promise<any>) {
    // Return a function that can be used in onMouseEnter
    return () => {
      componentImporter().catch(() => {})
    }
  },

  /**
   * Preload components on route change preparation
   */
  preloadForRoute(route: string) {
    const routeComponents: Record<string, Array<() => Promise<any>>> = {
      '/create': [
        () => import('@/components/protocol/ProtocolGateSelector'),
        () => import('@/components/forms/NFTSelector')
      ],
      '/jar/[address]': [
        () => import('@/components/protocol/ProtocolAwareWithdrawal'),
        () => import('@/components/users/ConfigView')
      ],
      '/admin': [
        () => import('@/components/admin/AdminFunctions')
      ]
    }

    const components = routeComponents[route] || []
    components.forEach(importFn => {
      importFn().catch(() => {})
    })
  }
}

/**
 * Bundle size monitoring utilities
 */
export const BundleMonitoring = {
  /**
   * Log bundle size information in development
   */
  logBundleInfo() {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Monitor performance entries
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            console.log('Bundle metrics:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              transferSize: navEntry.transferSize,
              encodedBodySize: navEntry.encodedBodySize,
              decodedBodySize: navEntry.decodedBodySize
            })
          }
        })
      })

      observer.observe({ entryTypes: ['navigation'] })

      return () => observer.disconnect()
    }
    return () => {}
  },

  /**
   * Estimate memory usage of objects
   */
  estimateMemoryUsage(obj: any): number {
    const seen = new WeakSet()
    
    function sizeOf(obj: any): number {
      if (obj === null) return 0
      if (typeof obj === 'boolean') return 1
      if (typeof obj === 'number') return 8
      if (typeof obj === 'string') return obj.length * 2
      if (typeof obj === 'symbol') return 8
      
      if (seen.has(obj)) return 0
      seen.add(obj)
      
      if (Array.isArray(obj)) {
        return obj.reduce((acc, item) => acc + sizeOf(item), 0)
      }
      
      if (typeof obj === 'object') {
        return Object.values(obj).reduce((acc: number, val) => acc + sizeOf(val), 0) +
               Object.keys(obj).reduce((acc: number, key) => acc + key.length * 2, 0)
      }
      
      return 0
    }
    
    return sizeOf(obj)
  }
}

/**
 * Performance optimization utilities
 */
export const PerformanceUtils = {
  /**
   * Debounce function for expensive operations
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait) as unknown as number
    }
  },

  /**
   * Throttle function for high-frequency events
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  /**
   * Memoize expensive computations
   */
  memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map()
    return ((...args: any[]) => {
      const key = JSON.stringify(args)
      if (cache.has(key)) {
        return cache.get(key)
      }
      const result = fn(...args)
      cache.set(key, result)
      return result
    }) as T
  },

  /**
   * Batch function calls
   */
  batchCalls<T>(
    fn: (items: T[]) => void,
    delay: number = 100
  ): (item: T) => void {
    let batch: T[] = []
    let timeout: number | null = null

    return (item: T) => {
      batch.push(item)
      
      if (timeout) {
        clearTimeout(timeout)
      }
      
      timeout = setTimeout(() => {
        fn(batch)
        batch = []
        timeout = null
      }, delay) as unknown as number
    }
  }
}
