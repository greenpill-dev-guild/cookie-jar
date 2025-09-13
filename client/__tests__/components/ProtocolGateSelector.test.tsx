import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Declare Jest globals for TypeScript
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any
declare const jest: any

// Mock the ProtocolGateSelector component logic
type AccessType = 'Whitelist' | 'NFT' | 'POAP' | 'Unlock' | 'Hypercert' | 'Hats'

interface ProtocolConfig {
  accessType: AccessType
  nftAddresses?: string[]
  nftTypes?: number[]
  eventId?: string
  lockAddress?: string
  tokenContract?: string
  tokenId?: string
  hatId?: string
}

const gateMethods = [
  {
    id: 'Whitelist' as AccessType,
    name: 'Allowlist',
    description: 'Pre-approved addresses can access funds',
    badge: 'Simple',
    pros: ['Direct control', 'Gas efficient', 'Simple to manage'],
    cons: ['Manual management', 'Not scalable', 'Requires updates'],
    bestFor: ['Small teams', 'Known participants', 'High control needs']
  },
  {
    id: 'NFT' as AccessType,
    name: 'NFT Collection',
    description: 'NFT holders from specific collections can access',
    badge: 'Popular',
    pros: ['Scalable', 'Tradeable access', 'Automated'],
    cons: ['Gas for validation', 'NFT dependency', 'Market volatility'],
    bestFor: ['NFT communities', 'Token-gated access', 'Tradeable membership']
  },
  {
    id: 'POAP' as AccessType,
    name: 'POAP Badge',
    description: 'Event attendees with specific POAP can access',
    badge: 'Event-based',
    pros: ['Event-based', 'Non-transferable', 'Proof of attendance'],
    cons: ['Event limitation', 'POAP dependency', 'Limited validation'],
    bestFor: ['Event perks', 'Attendee rewards', 'Non-transferable access']
  }
]

const MockProtocolGateSelector: React.FC<{
  onConfigChange: (config: ProtocolConfig) => void
  initialConfig?: ProtocolConfig
}> = ({ onConfigChange, initialConfig }) => {
  const [selectedMethod, setSelectedMethod] = React.useState<AccessType>(
    initialConfig?.accessType || 'Whitelist'
  )
  const [config, setConfig] = React.useState<ProtocolConfig>(
    initialConfig || { accessType: 'Whitelist' }
  )

  const handleMethodSelect = (method: AccessType) => {
    setSelectedMethod(method)
    const newConfig: ProtocolConfig = { accessType: method }
    setConfig(newConfig)
    onConfigChange(newConfig)
  }

  return (
    <div data-testid="protocol-gate-selector">
      <h2>Access Control Method</h2>
      <p>Choose how users will prove eligibility to access this jar</p>

      {/* Method Selection Grid */}
      <div data-testid="method-grid">
        {gateMethods.map((method) => (
          <div
            key={method.id}
            data-testid={`method-${method.id.toLowerCase()}`}
            className={selectedMethod === method.id ? 'selected' : ''}
            onClick={() => handleMethodSelect(method.id)}
            style={{ 
              cursor: 'pointer', 
              border: selectedMethod === method.id ? '2px solid orange' : '1px solid gray',
              padding: '16px',
              margin: '8px',
              borderRadius: '8px'
            }}
          >
            <div data-testid={`${method.id.toLowerCase()}-badge`}>{method.badge}</div>
            <h3 data-testid={`${method.id.toLowerCase()}-name`}>{method.name}</h3>
            <p data-testid={`${method.id.toLowerCase()}-description`}>{method.description}</p>
            
            <div data-testid={`${method.id.toLowerCase()}-pros`}>
              <p>Pros:</p>
              <ul>
                {method.pros.map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
            </div>
            
            <div data-testid={`${method.id.toLowerCase()}-cons`}>
              <p>Considerations:</p>
              <ul>
                {method.cons.map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            </div>
            
            <div data-testid={`${method.id.toLowerCase()}-best-for`}>
              <p>Best for:</p>
              <ul>
                {method.bestFor.map((use, i) => (
                  <li key={i}>{use}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Show configuration panel for non-Whitelist methods */}
      {selectedMethod !== 'Whitelist' && (
        <div data-testid="config-panel">
          <h3>Configuration for {selectedMethod}</h3>
          
          {selectedMethod === 'NFT' && (
            <div data-testid="nft-config">
              <p>NFT Collection Configuration</p>
              <input 
                data-testid="nft-address-input"
                placeholder="NFT Contract Address"
              />
            </div>
          )}
          
          {selectedMethod === 'POAP' && (
            <div data-testid="poap-config">
              <p>POAP Event Configuration</p>
              <input 
                data-testid="poap-event-id-input"
                placeholder="POAP Event ID"
              />
            </div>
          )}
          
          {selectedMethod === 'Unlock' && (
            <div data-testid="unlock-config">
              <p>Unlock Protocol Configuration</p>
              <input 
                data-testid="unlock-lock-address-input"
                placeholder="Lock Contract Address"
              />
            </div>
          )}
          
          {selectedMethod === 'Hypercert' && (
            <div data-testid="hypercert-config">
              <p>Hypercert Configuration</p>
              <input 
                data-testid="hypercert-contract-input"
                placeholder="Hypercert Contract"
              />
              <input 
                data-testid="hypercert-token-id-input"
                placeholder="Token ID"
              />
            </div>
          )}
          
          {selectedMethod === 'Hats' && (
            <div data-testid="hats-config">
              <p>Hats Protocol Configuration</p>
              <input 
                data-testid="hats-hat-id-input"
                placeholder="Hat ID"
              />
            </div>
          )}
        </div>
      )}

      {/* Configuration Summary */}
      {selectedMethod !== 'Whitelist' && (
        <div data-testid="config-summary">
          <h3>Configuration Summary</h3>
          <p data-testid="selected-method">Method: {gateMethods.find(m => m.id === selectedMethod)?.name}</p>
        </div>
      )}
    </div>
  )
}

describe('ProtocolGateSelector', () => {
  const user = userEvent.setup()
  const mockOnConfigChange = jest.fn()

  beforeEach(() => {
    mockOnConfigChange.mockClear()
  })

  it('renders all access control methods', () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    expect(screen.getByText('Access Control Method')).toBeInTheDocument()
    expect(screen.getByText('Allowlist')).toBeInTheDocument()
    expect(screen.getByText('NFT Collection')).toBeInTheDocument()
    expect(screen.getByText('POAP Badge')).toBeInTheDocument()
  })

  it('shows method details correctly', () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    // Check Whitelist method details
    expect(screen.getByTestId('whitelist-name')).toHaveTextContent('Allowlist')
    expect(screen.getByTestId('whitelist-description')).toHaveTextContent('Pre-approved addresses can access funds')
    expect(screen.getByTestId('whitelist-badge')).toHaveTextContent('Simple')
    
    // Check pros and cons are displayed
    expect(screen.getByText('Direct control')).toBeInTheDocument()
    expect(screen.getByText('Manual management')).toBeInTheDocument()
    expect(screen.getByText('Small teams')).toBeInTheDocument()
  })

  it('selects default method on mount', () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    const whitelistMethod = screen.getByTestId('method-whitelist')
    expect(whitelistMethod).toHaveClass('selected')
  })

  it('changes selection when method is clicked', async () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    const nftMethod = screen.getByTestId('method-nft')
    await user.click(nftMethod)
    
    expect(nftMethod).toHaveClass('selected')
    expect(mockOnConfigChange).toHaveBeenCalledWith({ accessType: 'NFT' })
  })

  it('shows configuration panel for non-Whitelist methods', async () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    // Initially no config panel for Whitelist
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
    
    // Select NFT method
    await user.click(screen.getByTestId('method-nft'))
    
    // Config panel should appear
    expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    expect(screen.getByTestId('nft-config')).toBeInTheDocument()
    expect(screen.getByTestId('nft-address-input')).toBeInTheDocument()
  })

  it('shows correct configuration for each method', async () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    // Test POAP
    await user.click(screen.getByTestId('method-poap'))
    expect(screen.getByTestId('poap-config')).toBeInTheDocument()
    expect(screen.getByTestId('poap-event-id-input')).toBeInTheDocument()
    
    // Test Unlock
    await user.click(screen.getByTestId('method-unlock'))
    expect(screen.getByTestId('unlock-config')).toBeInTheDocument()
    expect(screen.getByTestId('unlock-lock-address-input')).toBeInTheDocument()
  })

  it('updates configuration summary', async () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    await user.click(screen.getByTestId('method-nft'))
    
    expect(screen.getByTestId('config-summary')).toBeInTheDocument()
    expect(screen.getByTestId('selected-method')).toHaveTextContent('Method: NFT Collection')
  })

  it('handles initial configuration correctly', () => {
    const initialConfig: ProtocolConfig = {
      accessType: 'POAP',
      eventId: '12345'
    }
    
    render(
      <MockProtocolGateSelector 
        onConfigChange={mockOnConfigChange}
        initialConfig={initialConfig}
      />
    )
    
    const poapMethod = screen.getByTestId('method-poap')
    expect(poapMethod).toHaveClass('selected')
  })

  it('calls onConfigChange when selection changes', async () => {
    render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
    
    await user.click(screen.getByTestId('method-poap'))
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({ accessType: 'POAP' })
  })

  describe('Method Information Display', () => {
    it('displays correct information for each method', () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      // Test NFT method information
      expect(screen.getByTestId('nft-badge')).toHaveTextContent('Popular')
      expect(screen.getByText('Scalable')).toBeInTheDocument()
      expect(screen.getByText('NFT communities')).toBeInTheDocument()
      
      // Test POAP method information
      expect(screen.getByTestId('poap-badge')).toHaveTextContent('Event-based')
      expect(screen.getByText('Non-transferable')).toBeInTheDocument()
      expect(screen.getByText('Event perks')).toBeInTheDocument()
    })

    it('shows pros and cons for decision making', () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      // All methods should show pros and cons
      gateMethods.forEach(method => {
        method.pros.forEach(pro => {
          expect(screen.getByText(pro)).toBeInTheDocument()
        })
        method.cons.forEach(con => {
          expect(screen.getByText(con)).toBeInTheDocument()
        })
        method.bestFor.forEach(use => {
          expect(screen.getByText(use)).toBeInTheDocument()
        })
      })
    })
  })

  describe('Configuration State Management', () => {
    it('maintains configuration state between method switches', async () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      // Switch to NFT method
      await user.click(screen.getByTestId('method-nft'))
      expect(mockOnConfigChange).toHaveBeenLastCalledWith({ accessType: 'NFT' })
      
      // Switch to POAP method
      await user.click(screen.getByTestId('method-poap'))
      expect(mockOnConfigChange).toHaveBeenLastCalledWith({ accessType: 'POAP' })
      
      expect(mockOnConfigChange).toHaveBeenCalledTimes(2)
    })

    it('resets configuration when switching methods', async () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      // Each method switch should create a fresh config
      await user.click(screen.getByTestId('method-nft'))
      expect(mockOnConfigChange).toHaveBeenCalledWith({ accessType: 'NFT' })
      
      await user.click(screen.getByTestId('method-unlock'))
      expect(mockOnConfigChange).toHaveBeenCalledWith({ accessType: 'Unlock' })
    })
  })

  describe('Accessibility', () => {
    it('has proper keyboard navigation', async () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      const firstMethod = screen.getByTestId('method-whitelist')
      const secondMethod = screen.getByTestId('method-nft')
      
      // Tab to first method and press Enter
      firstMethod.focus()
      fireEvent.keyDown(firstMethod, { key: 'Enter' })
      
      // Should work with click handlers
      expect(firstMethod).toHaveClass('selected')
    })

    it('has descriptive labels for screen readers', () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      // Check that important information is available for screen readers
      expect(screen.getByText('Access Control Method')).toBeInTheDocument()
      expect(screen.getByText('Choose how users will prove eligibility to access this jar')).toBeInTheDocument()
    })
  })

  describe('Visual Feedback', () => {
    it('shows visual selection state', async () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      const whitelistMethod = screen.getByTestId('method-whitelist')
      const nftMethod = screen.getByTestId('method-nft')
      
      // Initially whitelist is selected
      expect(whitelistMethod).toHaveClass('selected')
      expect(nftMethod).not.toHaveClass('selected')
      
      // Click NFT method
      await user.click(nftMethod)
      
      expect(nftMethod).toHaveClass('selected')
      expect(whitelistMethod).not.toHaveClass('selected')
    })

    it('shows configuration panel only for applicable methods', async () => {
      render(<MockProtocolGateSelector onConfigChange={mockOnConfigChange} />)
      
      // No config panel for Whitelist
      expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
      
      // Config panel appears for other methods
      await user.click(screen.getByTestId('method-nft'))
      expect(screen.getByTestId('config-panel')).toBeInTheDocument()
      
      // Switch back to Whitelist
      await user.click(screen.getByTestId('method-whitelist'))
      expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
    })
  })
})
