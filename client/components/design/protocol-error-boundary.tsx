"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProtocolErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
}

interface ProtocolErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void; goBack: () => void }>
  maxRetries?: number
  protocolName?: string
  showDetails?: boolean
}

/**
 * Enhanced Error Boundary specifically designed for protocol integrations
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Protocol-specific error messages
 * - User-friendly fallback UI
 * - Error reporting capabilities
 */
export class ProtocolErrorBoundary extends React.Component<
  ProtocolErrorBoundaryProps,
  ProtocolErrorBoundaryState
> {
  private retryTimeoutId: number | null = null

  constructor(props: ProtocolErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): ProtocolErrorBoundaryState {
    return {
      hasError: true,
      error,
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    this.logError(error, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    const { protocolName } = this.props
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Protocol Error Boundary')
      console.error('Protocol:', protocolName || 'Unknown')
      console.error('Error:', error)
      console.error('Stack:', error.stack)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // Send to monitoring service in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to monitoring service
        // analytics.track('Protocol Error', {
        //   protocol: protocolName,
        //   error: error.message,
        //   stack: error.stack,
        //   componentStack: errorInfo.componentStack
        // })
      } catch (monitoringError) {
        console.warn('Failed to log error to monitoring service:', monitoringError)
      }
    }
  }

  private retry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      return
    }

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount) * 1000

    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }))
    }, delay) as unknown as number
  }

  private goBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  private getErrorMessage = (error?: Error): string => {
    const { protocolName } = this.props

    if (!error) return 'An unexpected error occurred'

    // Protocol-specific error messages
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return `Unable to connect to ${protocolName || 'the protocol'} service. Please check your internet connection and try again.`
    }

    if (error.message.includes('wallet') || error.message.includes('connection')) {
      return 'Wallet connection error. Please reconnect your wallet and try again.'
    }

    if (error.message.includes('contract') || error.message.includes('abi')) {
      return `${protocolName || 'Protocol'} contract interaction failed. This may be due to network congestion or contract issues.`
    }

    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return `You don't have the required permissions to access this ${protocolName || 'protocol'} feature.`
    }

    // Generic error message
    return `An error occurred while loading the ${protocolName || 'protocol'} interface. Please try again.`
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback: CustomFallback, maxRetries = 3, protocolName, showDetails = false } = this.props

    if (!hasError) {
      return children
    }

    // Use custom fallback if provided
    if (CustomFallback) {
      return <CustomFallback error={error} retry={this.retry} goBack={this.goBack} />
    }

    // Default fallback UI
    return (
      <Card className="w-full max-w-2xl mx-auto my-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {protocolName ? `${protocolName} Error` : 'Something went wrong'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            {this.getErrorMessage(error)}
          </p>

          {/* Error Details (Development/Debug) */}
          {showDetails && error && (
            <details className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
              <summary className="cursor-pointer text-gray-700 font-medium">
                Technical Details
              </summary>
              <div className="mt-2 space-y-1 text-gray-600 font-mono text-xs">
                <div><strong>Error:</strong> {error.message}</div>
                {error.stack && (
                  <div className="max-h-32 overflow-y-auto">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {retryCount < maxRetries && (
              <Button
                onClick={this.retry}
                className="flex items-center gap-2"
                variant="default"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again {retryCount > 0 && `(${maxRetries - retryCount} attempts left)`}
              </Button>
            )}
            
            <Button
              onClick={this.goBack}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>If this problem persists, please try:</p>
            <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
              <li>• Refreshing the page</li>
              <li>• Checking your wallet connection</li>
              <li>• Switching to a different network</li>
              <li>• Contacting support if the issue continues</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }
}

/**
 * Hook version for functional components
 */
export function useProtocolErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const retry = React.useCallback((callback: () => void) => {
    clearError()
    try {
      callback()
    } catch (err) {
      if (err instanceof Error) {
        captureError(err)
      }
    }
  }, [clearError, captureError])

  return {
    error,
    captureError,
    clearError,
    retry
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withProtocolErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options?: {
    protocolName?: string
    maxRetries?: number
    showDetails?: boolean
  }
) {
  const WrappedComponent = React.forwardRef<any, T>((props, ref) => (
    <ProtocolErrorBoundary {...options}>
      <Component {...(props as T)} ref={ref} />
    </ProtocolErrorBoundary>
  ))

  WrappedComponent.displayName = `withProtocolErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
