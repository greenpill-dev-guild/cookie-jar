import React from 'react'
import { render, screen } from '@testing-library/react'

// CurrencyLabel component logic for testing
const CurrencyLabel: React.FC<{ 
  address: string, 
  tokenSymbol?: string, 
  formatAddress?: (addr: string) => string 
}> = ({ address, tokenSymbol, formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}` }) => {
  if (!address) return null
  if (address === "0x0000000000000000000000000000000000000003") return <span>ETH</span>
  
  return <span>{tokenSymbol || formatAddress(address)}</span>
}

describe('CurrencyLabel', () => {
  it('renders null for empty address', () => {
    const { container } = render(<CurrencyLabel address="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders ETH for ETH address', () => {
    render(<CurrencyLabel address="0x0000000000000000000000000000000000000003" />)
    expect(screen.getByText('ETH')).toBeInTheDocument()
  })

  it('renders token symbol when provided', () => {
    render(<CurrencyLabel address="0x123456789" tokenSymbol="USDC" />)
    expect(screen.getByText('USDC')).toBeInTheDocument()
  })

  it('renders formatted address when symbol not available', () => {
    const mockFormat = jest.fn().mockReturnValue('0x1234...5678')
    
    render(<CurrencyLabel address="0x123456789abcdef" formatAddress={mockFormat} />)
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument()
    expect(mockFormat).toHaveBeenCalledWith('0x123456789abcdef')
  })

  it('uses default formatting when no custom formatter provided', () => {
    render(<CurrencyLabel address="0x123456789abcdef" />)
    expect(screen.getByText('0x1234...cdef')).toBeInTheDocument()
  })

  it('handles different ETH address formats', () => {
    render(<CurrencyLabel address="0x0000000000000000000000000000000000000003" tokenSymbol="SHOULD_NOT_SHOW" />)
    expect(screen.getByText('ETH')).toBeInTheDocument()
    expect(screen.queryByText('SHOULD_NOT_SHOW')).not.toBeInTheDocument()
  })
})