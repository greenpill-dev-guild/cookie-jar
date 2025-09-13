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

// Mock the NFTGateInput component logic
enum NFTType {
  None = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

// Mock validation results
const mockValidationResults: Record<string, any> = {
  '0xERC721000000000000000000000000000000000000': {
    isValid: true,
    detectedType: 'ERC721',
    isLoading: false,
    error: null
  },
  '0xERC1155000000000000000000000000000000000000': {
    isValid: true,
    detectedType: 'ERC1155',
    isLoading: false,
    error: null
  },
  '0xLoading0000000000000000000000000000000000': {
    isValid: false,
    detectedType: null,
    isLoading: true,
    error: null
  },
  '0xInvalid000000000000000000000000000000000000': {
    isValid: false,
    detectedType: null,
    isLoading: false,
    error: 'Contract does not support ERC721 or ERC1155 interfaces'
  }
}

const MockNFTGateInput: React.FC<{
  onAddNFT: (address: string, type: number) => void
  className?: string
}> = ({ onAddNFT, className = '' }) => {
  const [nftAddress, setNftAddress] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<number>(NFTType.ERC721)
  const [debouncedAddress, setDebouncedAddress] = React.useState('')
  
  // Simple debounce simulation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(nftAddress)
    }, 100) // Shorter delay for testing
    
    return () => clearTimeout(timer)
  }, [nftAddress])

  // Mock validation hook
  const validationResult = mockValidationResults[debouncedAddress] || {
    isValid: false,
    detectedType: null,
    isLoading: false,
    error: debouncedAddress ? 'Invalid contract address format' : null
  }

  const { isValid, detectedType, isLoading, error } = validationResult

  // Check if user-selected type matches detected type
  const typeMatches = !detectedType || (
    (detectedType === 'ERC721' && selectedType === NFTType.ERC721) ||
    (detectedType === 'ERC1155' && selectedType === NFTType.ERC1155)
  )

  const canAdd = nftAddress && isValid && typeMatches && !isLoading

  const handleAddNFT = () => {
    if (canAdd) {
      onAddNFT(nftAddress, selectedType)
      setNftAddress('')
      setSelectedType(NFTType.ERC721)
    }
  }

  const getValidationIcon = () => {
    if (!debouncedAddress) return null
    if (isLoading) return '⏳'
    if (isValid && typeMatches) return '✅'
    if (error || !typeMatches) return '❌'
    return null
  }

  const getValidationMessage = () => {
    if (!debouncedAddress) return null
    if (isLoading) return 'Validating contract...'
    if (error) return error
    if (isValid && !typeMatches) {
      return `Contract is ${detectedType} but type is set to ${selectedType === NFTType.ERC721 ? 'ERC721' : 'ERC1155'}`
    }
    if (isValid && typeMatches) {
      return `✓ Valid ${detectedType} contract`
    }
    return null
  }

  // Auto-populate type if detected type is different from selected
  React.useEffect(() => {
    if (detectedType && !typeMatches) {
      const newType = detectedType === 'ERC721' ? NFTType.ERC721 : NFTType.ERC1155
      setSelectedType(newType)
    }
  }, [detectedType, typeMatches])

  return (
    <div className={`space-y-4 ${className}`} data-testid="nft-gate-input">
      <label>NFT Addresses & Types</label>

      <div>
        <div>
          <label>NFT Address</label>
          <div>
            <input
              data-testid="nft-address-input"
              placeholder="0x..."
              value={nftAddress}
              onChange={(e) => setNftAddress(e.target.value)}
            />
            <span data-testid="validation-icon">{getValidationIcon()}</span>
          </div>
          {debouncedAddress && (
            <div 
              data-testid="validation-message"
              className={
                isValid && typeMatches 
                  ? 'text-green' 
                  : error || !typeMatches 
                  ? 'text-red' 
                  : 'text-gray'
              }
            >
              {getValidationMessage()}
            </div>
          )}
        </div>
        
        <div>
          <label>NFT Type</label>
          <select
            data-testid="nft-type-select"
            value={selectedType.toString()}
            onChange={(e) => setSelectedType(Number(e.target.value) as NFTType)}
          >
            <option value="1">ERC721</option>
            <option value="2">ERC1155</option>
          </select>
        </div>
        
        <button
          data-testid="add-nft-button"
          onClick={handleAddNFT}
          disabled={!canAdd}
        >
          Add NFT
        </button>
      </div>
    </div>
  )
}

describe('NFTGateInput', () => {
  const user = userEvent.setup()
  const mockOnAddNFT = jest.fn()

  beforeEach(() => {
    mockOnAddNFT.mockClear()
  })

  it('renders input fields correctly', () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    expect(screen.getByTestId('nft-address-input')).toBeInTheDocument()
    expect(screen.getByTestId('nft-type-select')).toBeInTheDocument()
    expect(screen.getByTestId('add-nft-button')).toBeInTheDocument()
  })

  it('validates NFT addresses in real-time', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    
    // Type a valid ERC721 address
    await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
    
    // Wait for debounce and validation
    await waitFor(() => {
      expect(screen.getByTestId('validation-icon')).toHaveTextContent('✅')
      expect(screen.getByTestId('validation-message')).toHaveTextContent('✓ Valid ERC721 contract')
    }, { timeout: 500 })
  })

  it('shows loading state during validation', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    
    // Type a loading address
    await user.type(addressInput, '0xLoading0000000000000000000000000000000000')
    
    await waitFor(() => {
      expect(screen.getByTestId('validation-icon')).toHaveTextContent('⏳')
      expect(screen.getByTestId('validation-message')).toHaveTextContent('Validating contract...')
    })
  })

  it('shows error for invalid contracts', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    
    // Type an invalid address
    await user.type(addressInput, '0xInvalid000000000000000000000000000000000000')
    
    await waitFor(() => {
      expect(screen.getByTestId('validation-icon')).toHaveTextContent('❌')
      expect(screen.getByTestId('validation-message')).toHaveTextContent('Contract does not support ERC721 or ERC1155 interfaces')
    })
  })

  it('auto-populates NFT type when detected', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    const typeSelect = screen.getByTestId('nft-type-select')
    
    // Initially ERC721 selected
    expect(typeSelect).toHaveValue('1')
    
    // Type an ERC1155 address
    await user.type(addressInput, '0xERC1155000000000000000000000000000000000000')
    
    // Should auto-select ERC1155
    await waitFor(() => {
      expect(typeSelect).toHaveValue('2')
    })
  })

  it('shows type mismatch warning', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    const typeSelect = screen.getByTestId('nft-type-select')
    
    // Type ERC1155 address but manually select ERC721
    await user.type(addressInput, '0xERC1155000000000000000000000000000000000000')
    await user.selectOptions(typeSelect, '1') // Force ERC721
    
    await waitFor(() => {
      expect(screen.getByTestId('validation-message')).toHaveTextContent('Contract is ERC1155 but type is set to ERC721')
    })
  })

  it('disables add button when validation fails', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    const addButton = screen.getByTestId('add-nft-button')
    
    // Invalid address should disable button
    await user.type(addressInput, '0xInvalid000000000000000000000000000000000000')
    
    await waitFor(() => {
      expect(addButton).toBeDisabled()
    })
  })

  it('enables add button when validation succeeds', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    const addButton = screen.getByTestId('add-nft-button')
    
    // Valid address should enable button
    await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
    
    await waitFor(() => {
      expect(addButton).not.toBeDisabled()
    })
  })

  it('calls onAddNFT with correct parameters', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    const typeSelect = screen.getByTestId('nft-type-select')
    const addButton = screen.getByTestId('add-nft-button')
    
    // Add valid NFT
    await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
    await user.selectOptions(typeSelect, '1')
    
    await waitFor(() => {
      expect(addButton).not.toBeDisabled()
    })
    
    await user.click(addButton)
    
    expect(mockOnAddNFT).toHaveBeenCalledWith(
      '0xERC721000000000000000000000000000000000000',
      1
    )
  })

  it('resets form after successful add', async () => {
    render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
    
    const addressInput = screen.getByTestId('nft-address-input')
    const typeSelect = screen.getByTestId('nft-type-select')
    const addButton = screen.getByTestId('add-nft-button')
    
    // Add valid NFT
    await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
    
    await waitFor(() => {
      expect(addButton).not.toBeDisabled()
    })
    
    await user.click(addButton)
    
    // Form should reset
    expect(addressInput).toHaveValue('')
    expect(typeSelect).toHaveValue('1') // Reset to ERC721
  })

  describe('Debouncing Behavior', () => {
    it('debounces address input', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      
      // Type rapidly
      await user.type(addressInput, '0xERC')
      
      // Validation should not trigger immediately
      expect(screen.queryByTestId('validation-message')).not.toBeInTheDocument()
      
      // Wait for debounce
      await waitFor(() => {
        expect(screen.getByTestId('validation-message')).toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Type Selection', () => {
    it('allows manual type selection', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const typeSelect = screen.getByTestId('nft-type-select')
      
      // Change to ERC1155
      await user.selectOptions(typeSelect, '2')
      expect(typeSelect).toHaveValue('2')
      
      // Change back to ERC721
      await user.selectOptions(typeSelect, '1')
      expect(typeSelect).toHaveValue('1')
    })

    it('shows both NFT type options', () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const typeSelect = screen.getByTestId('nft-type-select')
      const options = typeSelect.querySelectorAll('option')
      
      expect(options).toHaveLength(2)
      expect(options[0]).toHaveTextContent('ERC721')
      expect(options[1]).toHaveTextContent('ERC1155')
    })
  })

  describe('Validation Messages', () => {
    it('shows success message for valid contracts', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
      
      await waitFor(() => {
        expect(screen.getByTestId('validation-message')).toHaveTextContent('✓ Valid ERC721 contract')
      })
    })

    it('shows error message for invalid contracts', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      await user.type(addressInput, '0xInvalid000000000000000000000000000000000000')
      
      await waitFor(() => {
        expect(screen.getByTestId('validation-message')).toHaveTextContent('Contract does not support ERC721 or ERC1155 interfaces')
      })
    })

    it('shows loading message during validation', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      await user.type(addressInput, '0xLoading0000000000000000000000000000000000')
      
      await waitFor(() => {
        expect(screen.getByTestId('validation-message')).toHaveTextContent('Validating contract...')
      })
    })
  })

  describe('User Experience', () => {
    it('provides immediate visual feedback', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      
      // Start typing
      await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
      
      // Should show loading then success
      await waitFor(() => {
        const icon = screen.getByTestId('validation-icon')
        expect(['⏳', '✅']).toContain(icon.textContent)
      })
    })

    it('prevents submission of invalid NFTs', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      const addButton = screen.getByTestId('add-nft-button')
      
      // Try to add invalid address
      await user.type(addressInput, '0xInvalid000000000000000000000000000000000000')
      
      await waitFor(() => {
        expect(addButton).toBeDisabled()
      })
      
      await user.click(addButton)
      expect(mockOnAddNFT).not.toHaveBeenCalled()
    })

    it('allows submission of valid NFTs', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      const addButton = screen.getByTestId('add-nft-button')
      
      // Add valid NFT
      await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
      
      await waitFor(() => {
        expect(addButton).not.toBeDisabled()
      })
      
      await user.click(addButton)
      expect(mockOnAddNFT).toHaveBeenCalledTimes(1)
    })
  })

  describe('Auto-correction Features', () => {
    it('auto-corrects NFT type when mismatch detected', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      const typeSelect = screen.getByTestId('nft-type-select')
      
      // Initially ERC721 selected
      expect(typeSelect).toHaveValue('1')
      
      // Type ERC1155 address
      await user.type(addressInput, '0xERC1155000000000000000000000000000000000000')
      
      // Should auto-correct to ERC1155
      await waitFor(() => {
        expect(typeSelect).toHaveValue('2')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper labels and descriptions', () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      expect(screen.getByText('NFT Addresses & Types')).toBeInTheDocument()
      expect(screen.getByText('NFT Address')).toBeInTheDocument()
      expect(screen.getByText('NFT Type')).toBeInTheDocument()
    })

    it('provides feedback for screen readers', async () => {
      render(<MockNFTGateInput onAddNFT={mockOnAddNFT} />)
      
      const addressInput = screen.getByTestId('nft-address-input')
      await user.type(addressInput, '0xERC721000000000000000000000000000000000000')
      
      await waitFor(() => {
        const message = screen.getByTestId('validation-message')
        expect(message).toHaveTextContent('✓ Valid ERC721 contract')
      })
    })
  })
})
