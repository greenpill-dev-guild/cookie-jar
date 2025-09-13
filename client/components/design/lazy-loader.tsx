"use client"

import React, { Suspense, lazy, ComponentType } from 'react'
import { Loader2 } from 'lucide-react'

interface LazyLoaderProps {
  /** Fallback component to show while loading */
  fallback?: React.ReactNode
  /** Minimum loading time to prevent flash */
  minLoadingTime?: number
  /** Show loading indicator with custom styling */
  className?: string
}

/**
 * Default loading spinner component
 */
const DefaultLoadingSpinner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
)

/**
 * Enhanced lazy loading with minimum loading time and custom fallbacks
 */
export function createLazyComponent<T extends ComponentType<any>>(
  componentImporter: () => Promise<{ default: T }>,
  options: LazyLoaderProps = {}
) {
  const LazyComponent = lazy(() => {
    const { minLoadingTime = 200 } = options
    const componentPromise = componentImporter()
    
    if (minLoadingTime > 0) {
      const delayPromise = new Promise<void>(resolve => 
        setTimeout(resolve, minLoadingTime)
      )
      
      return Promise.all([componentPromise, delayPromise])
        .then(([componentModule]) => componentModule)
    }
    
    return componentPromise
  })

  const WrappedComponent = React.forwardRef<any, any>((props, ref) => (
    <Suspense 
      fallback={
        options.fallback || 
        <DefaultLoadingSpinner className={options.className} />
      }
    >
      <LazyComponent {...(props as any)} ref={ref} />
    </Suspense>
  ))

  WrappedComponent.displayName = 'LazyComponent'
  return WrappedComponent
}

/**
 * Lazy load protocol components for better performance
 */
export const LazyProtocolComponents = {
  POAPGateConfig: createLazyComponent(
    () => import('@/components/protocol/POAPGateConfig').then(m => ({ default: m.POAPGateConfig })),
    { fallback: <DefaultLoadingSpinner /> }
  ),
  
  UnlockGateConfig: createLazyComponent(
    () => import('@/components/protocol/UnlockGateConfig').then(m => ({ default: m.UnlockGateConfig })),
    { fallback: <DefaultLoadingSpinner /> }
  ),
  
  HypercertGateConfig: createLazyComponent(
    () => import('@/components/protocol/HypercertGateConfig').then(m => ({ default: m.HypercertGateConfig })),
    { fallback: <DefaultLoadingSpinner /> }
  ),
  
  HatsGateConfig: createLazyComponent(
    () => import('@/components/protocol/HatsGateConfig').then(m => ({ default: m.HatsGateConfig })),
    { fallback: <DefaultLoadingSpinner /> }
  ),
  
  NFTSelector: createLazyComponent(
    () => import('@/components/forms/NFTSelector').then(m => ({ default: m.NFTSelector })),
    { 
      fallback: <div className="h-96 flex items-center justify-center">
        <DefaultLoadingSpinner />
      </div>
    }
  ),
  
  ProtocolAwareWithdrawal: createLazyComponent(
    () => import('@/components/protocol/ProtocolAwareWithdrawal').then(m => ({ default: m.ProtocolAwareWithdrawal })),
    { fallback: <DefaultLoadingSpinner /> }
  )
}

/**
 * Hook for lazy loading with intersection observer
 */
export function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

/**
 * Lazy loading wrapper component
 */
interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
  className?: string
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <DefaultLoadingSpinner />,
  threshold = 0.1,
  className = ""
}) => {
  const { ref, isVisible } = useLazyLoading(threshold)

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  )
}
