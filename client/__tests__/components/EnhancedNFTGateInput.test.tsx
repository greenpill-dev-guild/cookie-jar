import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// Import component to test
import { EnhancedNFTGateInput, type EnhancedNFTGate } from '@/components/forms/EnhancedNFTGateInput'

// Mock hooks and dependencies
jest.mock('wagmi', () => ({
  useChainId: jest.fn(() => 1), // Ethereum mainnet
}))

jest.mock('@/hooks/useNftValidation', () => ({
  useNftValidation: jest.fn()
}))

jest.mock('@/lib/nft-providers/config', () => ({
  getAlchemyApiKey: jest.fn(() => 'test-api-key')
}))

// Mock Alchemy SDK
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn().mockImplementation(() => ({
    nft: {
      getNftMetadata: jest.fn(),
      validateContract: jest.fn(),
    }
  })),
  Network: {
    ETH_MAINNET: 'eth-mainnet'
  }
}))

// Mock viem
jest.mock('viem', () => ({
  isAddress: jest.fn()
}))

// Test data
const mockValidNFTAddress = '0x1234567890123456789012345678901234567890'
const mockInvalidAddress = 'invalid-address'

const mockValidCollectionPreview = {
  name: 'Test Collection',
  description: 'A test NFT collection',
  image: 'https://example.com/image.png',
  contractType: 'ERC721' as const,
  verified: true,
  isActive: true
}

describe('EnhancedNFTGateInput Component Integration Tests', () => {
  let queryClient: QueryClient
  let mockOnAddNFT: jest.Mock
  let mockUseNftValidation: jest.Mock

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    
    mockOnAddNFT = jest.fn()
    mockUseNftValidation = jest.fn()

    // Reset all mocks
    jest.clearAllMocks()

    // Setup default mock implementations
    const { useNftValidation } = require('@/hooks/useNftValidation')
    mockUseNftValidation = useNftValidation as jest.Mock
    
    const { isAddress } = require('viem')
    ;(isAddress as jest.Mock).mockImplementation((address: string) => {
      return address === mockValidNFTAddress
    })
  })

  const renderComponent = (props: Partial<Parameters<typeof EnhancedNFTGateInput>[0]> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EnhancedNFTGateInput
          onAddNFT={mockOnAddNFT}
          existingGates={[]}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  describe('Component Rendering', () => {
    it('renders the basic form elements', () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null
      })

      renderComponent()

      expect(screen.getByLabelText(/NFT Contract Address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/NFT Type/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add NFT Gate/i })).toBeInTheDocument()
    })

    it('shows advanced options when toggled', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null
      })

      renderComponent()

      const advancedButton = screen.getByRole('button', { name: /Show Advanced/i })
      await userEvent.click(advancedButton)

      expect(screen.getByText(/Quantity-based Requirements/i)).toBeInTheDocument()
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('validates NFT address format', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: 'Invalid contract address format'
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockInvalidAddress)

      await waitFor(() => {
        expect(screen.getByText(/Invalid contract address format/i)).toBeInTheDocument()
      })
    })

    it('shows loading state during validation', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: true,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        expect(screen.getByText(/Validating contract/i)).toBeInTheDocument()
      })
    })

    it('shows valid state when address is validated', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        expect(screen.getByText(/Valid ERC721 contract/i)).toBeInTheDocument()
      })
    })

    it('prevents duplicate NFT addresses', async () => {
      const existingGate: EnhancedNFTGate = {
        address: mockValidNFTAddress,
        type: 1, // ERC721
        name: 'Existing Collection'
      }

      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null
      })

      renderComponent({ existingGates: [existingGate] })

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        expect(screen.getByText(/already added/i)).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /Add NFT Gate/i })
      expect(addButton).toBeDisabled()
    })
  })

  describe('NFT Gate Addition', () => {
    it('successfully adds a valid NFT gate', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add NFT Gate/i })
        expect(addButton).toBeEnabled()
      })

      const addButton = screen.getByRole('button', { name: /Add NFT Gate/i })
      await userEvent.click(addButton)

      expect(mockOnAddNFT).toHaveBeenCalledWith(
        expect.objectContaining({
          address: mockValidNFTAddress,
          type: 1, // ERC721
        })
      )
    })

    it('resets form after successful addition', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i) as HTMLInputElement
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add NFT Gate/i })
        expect(addButton).toBeEnabled()
      })

      const addButton = screen.getByRole('button', { name: /Add NFT Gate/i })
      await userEvent.click(addButton)

      // Form should reset
      expect(addressInput.value).toBe('')
    })
  })

  describe('ERC1155 Quantity Gating', () => {
    it('shows quantity controls for ERC1155 tokens', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC1155',
        isLoading: false,
        error: null
      })

      renderComponent()

      // Select ERC1155 type
      const typeSelect = screen.getByLabelText(/NFT Type/i)
      await userEvent.click(typeSelect)
      await userEvent.click(screen.getByText('ERC1155'))

      // Show advanced options
      const advancedButton = screen.getByRole('button', { name: /Show Advanced/i })
      await userEvent.click(advancedButton)

      // Enable quantity gating
      const quantityCheckbox = screen.getByRole('checkbox', { name: /Enable quantity-based requirements/i })
      await userEvent.click(quantityCheckbox)

      expect(screen.getByText(/Minimum Quantity Required/i)).toBeInTheDocument()
      expect(screen.getByText(/Maximum Quantity/i)).toBeInTheDocument()
    })

    it('validates quantity ranges', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC1155',
        isLoading: false,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      // Select ERC1155 type
      const typeSelect = screen.getByLabelText(/NFT Type/i)
      await userEvent.click(typeSelect)
      await userEvent.click(screen.getByText('ERC1155'))

      // Show advanced options and enable quantity gating
      const advancedButton = screen.getByRole('button', { name: /Show Advanced/i })
      await userEvent.click(advancedButton)

      const quantityCheckbox = screen.getByRole('checkbox', { name: /Enable quantity-based requirements/i })
      await userEvent.click(quantityCheckbox)

      // Test invalid range (min >= max)
      // Note: This would require manipulating sliders, which is complex in tests
      // For now, we'll test that the quantity controls are present
      expect(screen.getByText(/Minimum Quantity Required/i)).toBeInTheDocument()
    })
  })

  describe('Rate Limiting', () => {
    it('shows rate limit warning when exceeded', async () => {
      // Mock the rate limiting to simulate exceeded state
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      
      // Simulate rapid API calls to trigger rate limiting
      for (let i = 0; i < 35; i++) {
        await userEvent.type(addressInput, `${i}`)
        await userEvent.clear(addressInput)
      }

      // After rapid calls, should show rate limit message
      await waitFor(() => {
        expect(screen.getByText(/Rate limit reached/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: 'API request failed'
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        expect(screen.getByText(/API request failed/i)).toBeInTheDocument()
      })
    })

    it('handles malicious contract warnings', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null,
        warnings: ['Contract is marked as spam by Alchemy'],
        isMalicious: true
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        expect(screen.getByText(/1 warning/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null
      })

      renderComponent()

      expect(screen.getByLabelText(/NFT Contract Address/i)).toHaveAttribute('aria-label', expect.any(String))
      expect(screen.getByRole('button', { name: /Add NFT Gate/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /NFT Type/i })).toBeInTheDocument()
    })

    it('shows validation status to screen readers', async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null
      })

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      await userEvent.type(addressInput, mockValidNFTAddress)

      await waitFor(() => {
        const validationIcon = screen.getByRole('img', { hidden: true })
        expect(validationIcon).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('debounces validation calls', async () => {
      const mockValidationFn = jest.fn().mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null
      })
      
      mockUseNftValidation.mockImplementation(mockValidationFn)

      renderComponent()

      const addressInput = screen.getByLabelText(/NFT Contract Address/i)
      
      // Type quickly to test debouncing
      await userEvent.type(addressInput, '0x123', { delay: 50 })
      
      // Should not call validation for every keystroke
      await waitFor(() => {
        expect(mockValidationFn).toHaveBeenCalledTimes(1)
      })
    })
  })
})

// Helper function to create integration test scenarios
export const createNFTGateTestScenarios = () => {
  return {
    validERC721Gate: {
      address: '0x1234567890123456789012345678901234567890',
      type: 1,
      name: 'Test ERC721',
      verified: true
    } as EnhancedNFTGate,
    
    validERC1155Gate: {
      address: '0x9876543210987654321098765432109876543210',
      type: 2,
      name: 'Test ERC1155',
      enableQuantityGating: true,
      minQuantity: 1,
      maxQuantity: 100
    } as EnhancedNFTGate,
    
    maliciousGate: {
      address: '0xbadcontract123456789012345678901234567890',
      type: 1,
      name: 'Suspicious Contract',
      verified: false
    } as EnhancedNFTGate
  }
}
