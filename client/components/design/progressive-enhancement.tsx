/**
 * Progressive Enhancement Utilities
 * 
 * This module provides utilities and components that ensure the application
 * works gracefully across different environments, connection states, and
 * JavaScript availability levels.
 */

"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, Wifi, WifiOff, Smartphone, Monitor, Tablet } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Network Status Hook
 * Tracks online/offline status and connection quality
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [effectiveType, setEffectiveType] = useState<string>('4g')

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)

    // Network connection info (if supported)
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    let handleConnectionChange: (() => void) | null = null

    if (connection) {
      setConnectionType(connection.type || 'unknown')
      setEffectiveType(connection.effectiveType || '4g')

      handleConnectionChange = () => {
        setConnectionType(connection.type || 'unknown')
        setEffectiveType(connection.effectiveType || '4g')
      }

      connection.addEventListener('change', handleConnectionChange)
    }

    // Online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (connection && handleConnectionChange) {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g'
  }
}

/**
 * Device Capabilities Hook
 * Detects device type and capabilities for progressive enhancement
 */
export function useDeviceCapabilities() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [hasTouch, setHasTouch] = useState(false)
  const [hasHover, setHasHover] = useState(true)
  const [supportsWebGL, setSupportsWebGL] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Device type detection
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 640) return 'mobile'
      if (width < 1024) return 'tablet'
      return 'desktop'
    }

    setDeviceType(checkDeviceType())

    // Touch support
    setHasTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Hover support
    setHasHover(window.matchMedia('(hover: hover)').matches)

    // WebGL support
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    setSupportsWebGL(!!gl)

    // Reduced motion preference
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    // Listen for resize events
    const handleResize = () => {
      setDeviceType(checkDeviceType())
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    deviceType,
    hasTouch,
    hasHover,
    supportsWebGL,
    prefersReducedMotion,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop'
  }
}

/**
 * Progressive Loading Component
 * Shows different content based on JavaScript availability and loading state
 */
interface ProgressiveLoadingProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  noJsFallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  className?: string
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  children,
  fallback,
  noJsFallback,
  loadingComponent,
  errorComponent,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [jsEnabled, setJsEnabled] = useState(false)

  useEffect(() => {
    setJsEnabled(true)
    
    try {
      // Simulate loading process
      const timer = setTimeout(() => {
        setIsLoaded(true)
      }, 100)

      return () => clearTimeout(timer)
    } catch (error) {
      setHasError(true)
    }
  }, [])

  if (hasError && errorComponent) {
    return <div className={className}>{errorComponent}</div>
  }

  if (!jsEnabled && noJsFallback) {
    return (
      <noscript>
        <div className={className}>{noJsFallback}</div>
      </noscript>
    )
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        {loadingComponent || fallback || (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        )}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

/**
 * Network Status Indicator
 */
interface NetworkStatusProps {
  className?: string
  showDetails?: boolean
}

export const NetworkStatusIndicator: React.FC<NetworkStatusProps> = ({
  className = '',
  showDetails = false
}) => {
  const { isOnline, effectiveType, isSlowConnection } = useNetworkStatus()

  if (isOnline && !showDetails && !isSlowConnection) {
    return null // Don't show anything when everything is normal
  }

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500'
    if (isSlowConnection) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (isSlowConnection) return `Slow connection (${effectiveType})`
    return `Online (${effectiveType})`
  }

  return (
    <div className={cn('flex items-center space-x-2 text-sm', getStatusColor(), className)}>
      {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {showDetails && <span>{getStatusText()}</span>}
    </div>
  )
}

/**
 * Adaptive Image Component
 * Progressively enhances images based on connection and device capabilities
 */
interface AdaptiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  lowQualitySrc?: string
  placeholder?: string
  webpSrc?: string
  avifSrc?: string
  lazy?: boolean
}

export const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  src,
  lowQualitySrc,
  placeholder,
  webpSrc,
  avifSrc,
  lazy = true,
  className = '',
  alt,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { isSlowConnection } = useNetworkStatus()
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!lazy) {
      loadImage()
      return
    }

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage()
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy])

  const loadImage = () => {
    // Choose appropriate image source based on connection and browser support
    let targetSrc = src

    // Use low quality version for slow connections
    if (isSlowConnection && lowQualitySrc) {
      targetSrc = lowQualitySrc
    }
    // Use modern formats if supported and available
    else if (avifSrc && supportsFormat('avif')) {
      targetSrc = avifSrc
    }
    else if (webpSrc && supportsFormat('webp')) {
      targetSrc = webpSrc
    }

    const img = new Image()
    img.onload = () => {
      setImageSrc(targetSrc)
      setIsLoaded(true)
    }
    img.onerror = () => {
      setHasError(true)
      // Fallback to original src if optimized version fails
      if (targetSrc !== src) {
        const fallbackImg = new Image()
        fallbackImg.onload = () => {
          setImageSrc(src)
          setIsLoaded(true)
        }
        fallbackImg.onerror = () => setHasError(true)
        fallbackImg.src = src
      }
    }
    img.src = targetSrc
  }

  const supportsFormat = (format: string): boolean => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0
    } catch {
      return false
    }
  }

  if (hasError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 text-gray-500', className)}>
        <AlertCircle className="h-8 w-8" />
        <span className="ml-2">Image failed to load</span>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}

/**
 * Responsive Container
 * Adapts layout based on device capabilities and screen size
 */
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  mobileFirst?: boolean
  adaptToTouch?: boolean
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  mobileFirst = true,
  adaptToTouch = true
}) => {
  const { deviceType, hasTouch, hasHover } = useDeviceCapabilities()

  const containerClasses = cn(
    // Base classes
    'w-full',
    
    // Device-specific spacing
    deviceType === 'mobile' ? 'px-4 py-2' : 
    deviceType === 'tablet' ? 'px-6 py-4' : 'px-8 py-6',
    
    // Touch-specific adjustments
    adaptToTouch && hasTouch && 'touch-manipulation',
    
    // Hover support adjustments
    !hasHover && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
    
    className
  )

  return (
    <div className={containerClasses}>
      {children}
    </div>
  )
}

/**
 * Feature Detection Hook
 * Detects various browser features for progressive enhancement
 */
export function useFeatureDetection() {
  const [features, setFeatures] = useState({
    webgl: false,
    webp: false,
    avif: false,
    intersectionObserver: false,
    resizeObserver: false,
    mutationObserver: false,
    serviceWorker: false,
    webAssembly: false,
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    crypto: false
  })

  useEffect(() => {
    const detectFeatures = async () => {
      const newFeatures = { ...features }

      // WebGL
      const canvas = document.createElement('canvas')
      newFeatures.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))

      // Modern image formats
      newFeatures.webp = await supportsImageFormat('webp')
      newFeatures.avif = await supportsImageFormat('avif')

      // Observer APIs
      newFeatures.intersectionObserver = 'IntersectionObserver' in window
      newFeatures.resizeObserver = 'ResizeObserver' in window
      newFeatures.mutationObserver = 'MutationObserver' in window

      // Service Worker
      newFeatures.serviceWorker = 'serviceWorker' in navigator

      // WebAssembly
      newFeatures.webAssembly = 'WebAssembly' in window

      // Storage APIs
      newFeatures.localStorage = 'localStorage' in window
      newFeatures.sessionStorage = 'sessionStorage' in window
      newFeatures.indexedDB = 'indexedDB' in window

      // Crypto API
      newFeatures.crypto = 'crypto' in window && 'subtle' in window.crypto

      setFeatures(newFeatures)
    }

    detectFeatures()
  }, [])

  const supportsImageFormat = (format: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = `data:image/${format};base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA`
    })
  }

  return features
}

/**
 * Offline First Component
 * Provides fallback content when offline
 */
interface OfflineFirstProps {
  children: React.ReactNode
  offlineFallback?: React.ReactNode
  className?: string
}

export const OfflineFirst: React.FC<OfflineFirstProps> = ({
  children,
  offlineFallback,
  className = ''
}) => {
  const { isOnline } = useNetworkStatus()

  if (!isOnline) {
    return (
      <div className={cn('offline-mode', className)}>
        {offlineFallback || (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <WifiOff className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">You're Offline</h3>
            <p className="text-center">
              Some features may be limited. Check your connection and try again.
            </p>
          </div>
        )}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

/**
 * Device-Aware Icon Component
 * Shows different icons based on device type
 */
interface DeviceAwareIconProps {
  className?: string
  size?: number
}

export const DeviceAwareIcon: React.FC<DeviceAwareIconProps> = ({
  className = '',
  size = 24
}) => {
  const { deviceType } = useDeviceCapabilities()

  const IconComponent = {
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor
  }[deviceType]

  return <IconComponent className={className} size={size} />
}
