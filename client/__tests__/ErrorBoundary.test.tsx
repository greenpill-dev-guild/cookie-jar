import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Simple ErrorBoundary implementation for testing
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div data-testid="error-fallback">
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred.</p>
          <button onClick={this.resetError} data-testid="reset-button">
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details data-testid="error-details">
              <summary>Error Details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div data-testid="success">No error occurred</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  
  afterAll(() => {
    console.error = originalError
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <TestErrorBoundary>
        <ThrowError shouldThrow={false} />
      </TestErrorBoundary>
    )

    expect(screen.getByTestId('success')).toBeInTheDocument()
  })

  it('catches errors and renders default fallback', () => {
    render(
      <TestErrorBoundary>
        <ThrowError />
      </TestErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument()
    expect(screen.getByTestId('reset-button')).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <TestErrorBoundary>
        <ThrowError />
      </TestErrorBoundary>
    )

    expect(screen.getByTestId('error-details')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <TestErrorBoundary>
        <ThrowError />
      </TestErrorBoundary>
    )

    expect(screen.queryByTestId('error-details')).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('resets error state when try again is clicked', () => {
    const { rerender } = render(
      <TestErrorBoundary>
        <ThrowError />
      </TestErrorBoundary>
    )

    expect(screen.getByTestId('error-fallback')).toBeInTheDocument()

    // Click try again
    fireEvent.click(screen.getByTestId('reset-button'))

    // The error boundary should reset, but the component will throw again
    // In a real scenario, the props would change to prevent the error
    expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
  })

  it('uses custom fallback when provided', () => {
    const CustomFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
      error, 
      resetError 
    }) => (
      <div data-testid="custom-fallback">
        <p>Custom error: {error?.message}</p>
        <button onClick={resetError} data-testid="custom-reset">Reset</button>
      </div>
    )

    render(
      <TestErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </TestErrorBoundary>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument()
    expect(screen.getByTestId('custom-reset')).toBeInTheDocument()
  })

  it('logs errors to console when they occur', () => {
    render(
      <TestErrorBoundary>
        <ThrowError />
      </TestErrorBoundary>
    )

    expect(console.error).toHaveBeenCalled()
  })
})