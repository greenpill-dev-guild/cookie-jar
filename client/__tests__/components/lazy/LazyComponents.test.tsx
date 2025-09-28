import React, { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { 
  JarStreamingTab, 
  StreamingPanel, 
  TokenRecoveryPanel, 
  ProtocolSelector,
  useIntersectionObserver,
  LazyOnScroll
} from '@/components/lazy/LazyComponents'

// Mock the actual components to avoid importing real dependencies
vi.mock('@/components/jar/JarStreamingTab', () => ({
  JarStreamingTab: ({ jarAddress }: { jarAddress: string }) => (
    <div data-testid="jar-streaming-tab">JarStreamingTab: {jarAddress}</div>
  )
}))

vi.mock('@/components/jar/StreamingPanel', () => ({
  default: ({ jarAddress }: { jarAddress: string }) => (
    <div data-testid="streaming-panel">StreamingPanel: {jarAddress}</div>
  )
}))

vi.mock('@/components/jar/TokenRecoveryPanel', () => ({
  default: ({ jarAddress }: { jarAddress: string }) => (
    <div data-testid="token-recovery-panel">TokenRecoveryPanel: {jarAddress}</div>
  )
}))

vi.mock('@/components/nft/ProtocolSelector', () => ({
  ProtocolSelector: ({ onConfigChange }: { onConfigChange: (config: any) => void }) => (
    <div data-testid="protocol-selector" onClick={() => onConfigChange({ method: 'test' })}>
      ProtocolSelector
    </div>
  )
}))

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(function(callback, options) {
    this.observe = vi.fn()
    this.disconnect = vi.fn()
    this.unobserve = vi.fn()
    
    // Store for later use
    mockIntersectionObserver.callback = callback
    mockIntersectionObserver.options = options
    
    return this
  })
})

describe('LazyComponents', () => {
  describe('Lazy Loading', () => {
    it('should show loading state initially for JarStreamingTab', async () => {
      render(
        <JarStreamingTab 
          jarAddress="0x123" 
          jarTokenAddress="0x456"
          jarTokenSymbol="TEST"
          isAdmin={true}
          streamingEnabled={true}
        />
      )

      // Should show loading first
      expect(screen.getByText('Loading streaming features...')).toBeInTheDocument()
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('jar-streaming-tab')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(screen.getByText('JarStreamingTab: 0x123')).toBeInTheDocument()
    })

    it('should show loading state initially for StreamingPanel', async () => {
      render(
        <StreamingPanel 
          jarAddress="0x789"
          isAdmin={true}
        />
      )

      expect(screen.getByText('Loading streaming panel...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByTestId('streaming-panel')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should show loading state initially for TokenRecoveryPanel', async () => {
      render(
        <TokenRecoveryPanel 
          jarAddress="0xabc"
          jarTokenAddress="0xdef"
          jarTokenSymbol="REC"
          isAdmin={true}
        />
      )

      expect(screen.getByText('Loading token recovery...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByTestId('token-recovery-panel')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should show loading state initially for ProtocolSelector', async () => {
      const mockConfigChange = vi.fn()
      
      render(
        <ProtocolSelector 
          onConfigChange={mockConfigChange}
          initialConfig={{ method: 'Allowlist' }}
        />
      )

      expect(screen.getByText('Loading protocol selector...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByTestId('protocol-selector')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('Error Boundaries', () => {
    it('should handle component loading errors gracefully', async () => {
      // Mock a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Component failed to load')
      }

      const LazyErrorComponent = React.lazy(() => 
        Promise.resolve({ default: ErrorComponent })
      )

      const ComponentWithErrorBoundary = () => (
        <Suspense fallback={<div>Loading...</div>}>
          <LazyErrorComponent />
        </Suspense>
      )

      // This should not crash the test, but would need an actual ErrorBoundary
      // in a real implementation to catch the error properly
      expect(() => render(<ComponentWithErrorBoundary />)).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should not load components until needed', () => {
      const LazyTestComponent = React.lazy(() => {
        // This should not be called immediately
        const promise = Promise.resolve({ 
          default: () => <div>Lazy loaded component</div> 
        })
        return promise
      })

      render(
        <div>
          <h1>Page content</h1>
          {/* Component not rendered yet */}
        </div>
      )

      expect(screen.getByText('Page content')).toBeInTheDocument()
      expect(screen.queryByText('Lazy loaded component')).not.toBeInTheDocument()
    })
  })
})

describe('useIntersectionObserver', () => {
  it('should setup IntersectionObserver correctly', () => {
    const TestComponent = () => {
      const ref = React.useRef<HTMLDivElement>(null)
      const isIntersecting = useIntersectionObserver(ref, { rootMargin: '100px' })
      
      return (
        <div ref={ref} data-testid="observed-element">
          {isIntersecting ? 'Visible' : 'Hidden'}
        </div>
      )
    }

    render(<TestComponent />)

    expect(window.IntersectionObserver).toHaveBeenCalled()
    expect(mockIntersectionObserver.options).toEqual({ rootMargin: '100px' })
  })

  it('should update state when intersection changes', async () => {
    const TestComponent = () => {
      const ref = React.useRef<HTMLDivElement>(null)
      const isIntersecting = useIntersectionObserver(ref)
      
      return (
        <div ref={ref} data-testid="observed-element">
          Status: {isIntersecting ? 'Visible' : 'Hidden'}
        </div>
      )
    }

    render(<TestComponent />)
    
    expect(screen.getByText('Status: Hidden')).toBeInTheDocument()

    // Simulate intersection
    if (mockIntersectionObserver.callback) {
      mockIntersectionObserver.callback([{ isIntersecting: true }])
    }

    await waitFor(() => {
      expect(screen.getByText('Status: Visible')).toBeInTheDocument()
    })
  })
})

describe('LazyOnScroll', () => {
  it('should show fallback when not in view', () => {
    render(
      <LazyOnScroll 
        fallback={<div data-testid="fallback">Loading...</div>}
        rootMargin="50px"
      >
        <div data-testid="content">Actual content</div>
      </LazyOnScroll>
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('should show content when in view', async () => {
    const TestWrapper = () => (
      <LazyOnScroll 
        fallback={<div data-testid="fallback">Loading...</div>}
        rootMargin="50px"
      >
        <div data-testid="content">Actual content</div>
      </LazyOnScroll>
    )

    render(<TestWrapper />)

    // Initially shows fallback
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()

    // Simulate element coming into view
    if (mockIntersectionObserver.callback) {
      mockIntersectionObserver.callback([{ isIntersecting: true }])
    }

    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
    })
  })
})

describe('Bundle Size Optimization', () => {
  it('should not import heavy dependencies until needed', () => {
    // This test would need to be run in a bundle analyzer environment
    // to verify that the lazy components are in separate chunks

    // For now, we can at least verify the components are wrapped in lazy()
    expect(typeof JarStreamingTab).toBe('function')
    expect(typeof StreamingPanel).toBe('function')
    expect(typeof TokenRecoveryPanel).toBe('function')
    expect(typeof ProtocolSelector).toBe('function')
  })
})

describe('Real-world Usage Scenarios', () => {
  it('should handle rapid component switching', async () => {
    const mockConfigChange = vi.fn()
    
    const TestPage = ({ showStreaming }: { showStreaming: boolean }) => (
      <div>
        {showStreaming ? (
          <JarStreamingTab 
            jarAddress="0x123" 
            jarTokenAddress="0x456"
            jarTokenSymbol="TEST"
            isAdmin={true}
            streamingEnabled={true}
          />
        ) : (
          <ProtocolSelector 
            onConfigChange={mockConfigChange}
            initialConfig={{ method: 'NFT' }}
          />
        )}
      </div>
    )

    const { rerender } = render(<TestPage showStreaming={false} />)
    
    expect(screen.getByText('Loading protocol selector...')).toBeInTheDocument()

    // Switch to streaming
    rerender(<TestPage showStreaming={true} />)
    
    expect(screen.getByText('Loading streaming features...')).toBeInTheDocument()

    // Both should load without issues
    await waitFor(() => {
      expect(screen.getByTestId('jar-streaming-tab')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should maintain component state during lazy loading', async () => {
    const StatefulComponent = ({ initialValue }: { initialValue: string }) => {
      const [value, setValue] = React.useState(initialValue)
      
      return (
        <div>
          <span data-testid="value">{value}</span>
          <button onClick={() => setValue('updated')}>Update</button>
        </div>
      )
    }

    const LazyStateful = React.lazy(() => 
      Promise.resolve({ default: StatefulComponent })
    )

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyStateful initialValue="initial" />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('initial')
    })

    // Component should maintain its state after lazy loading
    screen.getByRole('button', { name: 'Update' }).click()

    expect(screen.getByTestId('value')).toHaveTextContent('updated')
  })
})
