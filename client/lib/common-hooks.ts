/**
 * Common Hooks - Consolidated utility hooks to reduce code redundancy
 * 
 * This module contains reusable hooks that were being duplicated across
 * different components and other hooks.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/useToast'

/**
 * Common async operation states
 */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Hook for managing common async operation patterns
 * Reduces boilerplate in protocol hooks and API calls
 */
export function useAsyncOperation<T>(): {
  state: AsyncState<T>
  execute: (operation: () => Promise<T>) => Promise<T | null>
  reset: () => void
  setData: (data: T) => void
  setError: (error: string) => void
} {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await operation()
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed'
      setState(prev => ({ ...prev, loading: false, error: message }))
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }))
  }, [])

  return { state, execute, reset, setData, setError }
}

/**
 * Debounced input hook - used across many components
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = 300
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Form validation state hook - reduces validation boilerplate
 */
export interface ValidationRule<T> {
  validate: (value: T) => boolean
  message: string
}

export function useFormValidation<T>() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = useCallback(
    (fieldName: string, value: T, rules: ValidationRule<T>[]) => {
      const fieldError = rules.find(rule => !rule.validate(value))?.message || ''
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldError
      }))

      return !fieldError
    },
    []
  )

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const { [fieldName]: _, ...rest } = prev
      return rest
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const hasErrors = Object.values(errors).some(error => !!error)

  return {
    errors,
    validateField,
    clearError,
    clearAllErrors,
    hasErrors
  }
}

/**
 * Loading state aggregation hook - for components with multiple loading states
 */
export function useAggregatedLoading(...loadingStates: boolean[]): boolean {
  return loadingStates.some(Boolean)
}

/**
 * Error aggregation hook - for components with multiple error sources
 */
export function useAggregatedErrors(...errors: (string | null)[]): string | null {
  return errors.find(error => !!error) || null
}

/**
 * Toast notifications with common patterns
 */
export function useCommonToasts() {
  const { toast } = useToast()

  return {
    success: useCallback((title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'default'
      })
    }, [toast]),

    error: useCallback((title: string, description?: string) => {
      toast({
        title,
        description: description || 'Please try again or contact support if the problem persists.',
        variant: 'destructive'
      })
    }, [toast]),

    loading: useCallback((title: string, description?: string) => {
      toast({
        title,
        description: description || 'This may take a moment...',
        variant: 'default'
      })
    }, [toast]),

    networkError: useCallback(() => {
      toast({
        title: 'Network Error',
        description: 'Please check your connection and try again.',
        variant: 'destructive'
      })
    }, [toast]),

    walletError: useCallback(() => {
      toast({
        title: 'Wallet Error',
        description: 'Please check your wallet connection and try again.',
        variant: 'destructive'
      })
    }, [toast]),

    protocolError: useCallback((protocolName: string) => {
      toast({
        title: `${protocolName} Error`,
        description: `Unable to connect to ${protocolName}. Please try again later.`,
        variant: 'destructive'
      })
    }, [toast])
  }
}

/**
 * Retry logic hook - common retry patterns with exponential backoff
 */
export function useRetry(
  maxRetries: number = 3,
  initialDelay: number = 1000
) {
  const [retryCount, setRetryCount] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const retry = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | null> => {
      if (retryCount >= maxRetries) {
        throw new Error('Max retries exceeded')
      }

      try {
        const result = await operation()
        setRetryCount(0) // Reset on success
        return result
      } catch (error) {
        const nextRetryCount = retryCount + 1
        setRetryCount(nextRetryCount)

        if (nextRetryCount < maxRetries) {
          const delay = initialDelay * Math.pow(2, nextRetryCount - 1)
          
          return new Promise((resolve) => {
            timeoutRef.current = setTimeout(async () => {
              const retryResult = await retry(operation)
              resolve(retryResult)
            }, delay)
          })
        } else {
          throw error
        }
      }
    },
    [retryCount, maxRetries, initialDelay]
  )

  const resetRetryCount = useCallback(() => {
    setRetryCount(0)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { retry, retryCount, resetRetryCount, canRetry: retryCount < maxRetries }
}

/**
 * Local storage hook with error handling and serialization
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key])

  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, defaultValue])

  return [storedValue, setValue, removeValue]
}

/**
 * Previous value hook - useful for detecting changes
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

/**
 * Toggle hook - simple boolean state toggle
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => setValue(prev => !prev), [])
  const set = useCallback((newValue: boolean) => setValue(newValue), [])

  return [value, toggle, set]
}
