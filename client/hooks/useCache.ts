/**
 * Comprehensive Caching System
 * 
 * Provides multiple caching strategies for different data types:
 * - Memory cache for fast access
 * - LocalStorage cache for persistence
 * - Session cache for temporary data
 * - LRU cache for memory management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  version: string
}

// Cache configuration
interface CacheConfig {
  /** Cache duration in milliseconds */
  ttl: number
  /** Maximum number of entries (for LRU cache) */
  maxSize?: number
  /** Storage type */
  storage: 'memory' | 'localStorage' | 'sessionStorage'
  /** Namespace for cache keys */
  namespace?: string
  /** Version for cache invalidation */
  version?: string
}

// Default configurations for different data types
const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  nftData: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    storage: 'localStorage',
    namespace: 'nft',
    version: '1.0'
  },
  protocolData: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 50,
    storage: 'memory',
    namespace: 'protocol',
    version: '1.0'
  },
  tokenBalances: {
    ttl: 1 * 60 * 1000, // 1 minute
    maxSize: 200,
    storage: 'sessionStorage',
    namespace: 'balance',
    version: '1.0'
  },
  userPreferences: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 10,
    storage: 'localStorage',
    namespace: 'prefs',
    version: '1.0'
  }
}

/**
 * LRU Cache implementation
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key)
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, entry)
    }
    return entry
  }

  set(key: string, entry: CacheEntry<T>): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, entry)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): IterableIterator<string> {
    return this.cache.keys()
  }
}

// Global memory caches
const memoryCaches = new Map<string, LRUCache<any>>()

/**
 * Cache Manager Class
 */
class CacheManager<T> {
  private config: CacheConfig
  private memoryCache!: LRUCache<T>

  constructor(config: CacheConfig) {
    this.config = config
    
    if (config.storage === 'memory') {
      const cacheKey = config.namespace || 'default'
      if (!memoryCaches.has(cacheKey)) {
        memoryCaches.set(cacheKey, new LRUCache<T>(config.maxSize))
      }
      this.memoryCache = memoryCaches.get(cacheKey)!
    }
  }

  private getCacheKey(key: string): string {
    const namespace = this.config.namespace || 'cache'
    return `${namespace}:${key}`
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt
  }

  private isVersionMismatch(entry: CacheEntry<T>): boolean {
    return !!(this.config.version && entry.version !== this.config.version)
  }

  get(key: string): T | null {
    const cacheKey = this.getCacheKey(key)

    try {
      let entry: CacheEntry<T> | undefined

      if (this.config.storage === 'memory') {
        entry = this.memoryCache.get(cacheKey)
      } else {
        const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage
        const stored = storage.getItem(cacheKey)
        if (stored) {
          entry = JSON.parse(stored)
        }
      }

      if (entry && !this.isExpired(entry) && !this.isVersionMismatch(entry)) {
        return entry.data
      }

      // Clean up expired entry
      if (entry) {
        this.delete(key)
      }

      return null
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  set(key: string, data: T): void {
    const cacheKey = this.getCacheKey(key)
    const now = Date.now()
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.config.ttl,
      version: this.config.version || '1.0'
    }

    try {
      if (this.config.storage === 'memory') {
        this.memoryCache.set(cacheKey, entry)
      } else {
        const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage
        storage.setItem(cacheKey, JSON.stringify(entry))
      }
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  delete(key: string): boolean {
    const cacheKey = this.getCacheKey(key)

    try {
      if (this.config.storage === 'memory') {
        return this.memoryCache.delete(cacheKey)
      } else {
        const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage
        const existed = storage.getItem(cacheKey) !== null
        storage.removeItem(cacheKey)
        return existed
      }
    } catch (error) {
      console.warn('Cache delete error:', error)
      return false
    }
  }

  clear(): void {
    try {
      if (this.config.storage === 'memory') {
        this.memoryCache.clear()
      } else {
        const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage
        const keysToRemove: string[] = []
        const prefix = this.getCacheKey('')

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key)
          }
        }

        keysToRemove.forEach(key => storage.removeItem(key))
      }
    } catch (error) {
      console.warn('Cache clear error:', error)
    }
  }
}

/**
 * Hook for using cache with automatic cleanup
 */
export function useCache<T>(
  cacheType: keyof typeof DEFAULT_CONFIGS | CacheConfig,
  dependencies: any[] = []
): {
  get: (key: string) => T | null
  set: (key: string, data: T) => void
  delete: (key: string) => boolean
  clear: () => void
  invalidateOnChange: (keys: string[]) => void
} {
  const config = typeof cacheType === 'string' ? DEFAULT_CONFIGS[cacheType] : cacheType
  const cacheManager = useRef<CacheManager<T>>()
  
  // Initialize cache manager
  if (!cacheManager.current) {
    cacheManager.current = new CacheManager<T>(config)
  }

  // Auto-invalidation based on dependencies
  const prevDependencies = useRef(dependencies)
  useEffect(() => {
    const hasChanged = dependencies.some(
      (dep, index) => dep !== prevDependencies.current[index]
    )
    
    if (hasChanged) {
      cacheManager.current?.clear()
      prevDependencies.current = dependencies
    }
  }, dependencies)

  const invalidateOnChange = useCallback((keys: string[]) => {
    keys.forEach(key => cacheManager.current?.delete(key))
  }, [])

  return {
    get: useCallback((key: string) => cacheManager.current?.get(key) || null, []),
    set: useCallback((key: string, data: T) => cacheManager.current?.set(key, data), []),
    delete: useCallback((key: string) => cacheManager.current?.delete(key) || false, []),
    clear: useCallback(() => cacheManager.current?.clear(), []),
    invalidateOnChange
  }
}

/**
 * Hook for caching async operations
 */
export function useCachedAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheType: keyof typeof DEFAULT_CONFIGS | CacheConfig = 'protocolData',
  dependencies: any[] = []
): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const cache = useCache<T>(cacheType, dependencies)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const fetch = useCallback(async () => {
    // Check cache first
    const cached = cache.get(key)
    if (cached) {
      setData(cached)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetcherRef.current()
      setData(result)
      cache.set(key, result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [key, cache])

  const invalidate = useCallback(() => {
    cache.delete(key)
    setData(null)
  }, [key, cache])

  // Initial fetch
  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    data,
    loading,
    error,
    refetch: fetch,
    invalidate
  }
}

/**
 * Network-aware caching - invalidates cache when network changes
 */
export function useNetworkAwareCache<T>(
  cacheType: keyof typeof DEFAULT_CONFIGS | CacheConfig
) {
  const { address } = useAccount()
  const chainId = useChainId()
  
  return useCache<T>(cacheType, [address, chainId])
}

/**
 * Utility functions for cache management
 */
export const CacheUtils = {
  /**
   * Clear all caches (useful for logout)
   */
  clearAll(): void {
    memoryCaches.forEach(cache => cache.clear())
    
    try {
      // Clear localStorage caches
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes(':') || key.startsWith('cache:'))) {
          toRemove.push(key)
        }
      }
      toRemove.forEach(key => localStorage.removeItem(key))

      // Clear sessionStorage caches
      sessionStorage.clear()
    } catch (error) {
      console.warn('Error clearing caches:', error)
    }
  },

  /**
   * Get cache statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    
    memoryCaches.forEach((cache, key) => {
      stats[`memory_${key}`] = Array.from(cache.keys()).length
    })

    try {
      let localStorageCount = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(':')) localStorageCount++
      }
      stats.localStorage = localStorageCount
      stats.sessionStorage = sessionStorage.length
    } catch (error) {
      // Storage not available
    }

    return stats
  }
}
