import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import { EnhancedNFTGateInput, type EnhancedNFTGate } from '@/components/nft/EnhancedNFTGateInput';

// Mock hooks and dependencies
vi.mock('wagmi', () => ({
  useChainId: vi.fn(() => 1), // Ethereum mainnet
}));

vi.mock('@/hooks/nft/useNFTValidation', () => ({
  useNFTValidation: vi.fn(),
}));

vi.mock('@/lib/nft-providers/config', () => ({
  getAlchemyApiKey: vi.fn(() => 'test-api-key'),
}));

// Mock Alchemy SDK
vi.mock('alchemy-sdk', () => ({
  Alchemy: vi.fn().mockImplementation(() => ({
    nft: {
      getNftMetadata: vi.fn(),
      validateContract: vi.fn(),
    },
  })),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
  },
}));

// Mock viem
vi.mock('viem', () => ({
  isAddress: vi.fn(),
}));

// Test data
const mockValidNFTAddress = '0x1234567890123456789012345678901234567890';
const mockInvalidAddress = 'invalid-address';

const mockValidCollectionPreview = {
  name: 'Test Collection',
  description: 'A test NFT collection',
  image: 'https://example.com/image.png',
  contractType: 'ERC721' as const,
  verified: true,
  isActive: true,
};

describe('EnhancedNFTGateInput Component Integration Tests', () => {
  let queryClient: QueryClient;
  let mockOnAddNFT: ReturnType<typeof vi.fn>;
  const mockuseNFTValidation = vi.mocked(require('@/hooks/useNFTValidation').useNFTValidation);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockOnAddNFT = vi.fn();
    mockuseNFTValidation.mockClear();
    vi.clearAllMocks();

    // Mock isAddress from viem
    const { isAddress } = require('viem');
    (isAddress as Mock).mockImplementation((address: string) => {
      return address.startsWith('0x') && address.length === 42;
    });
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof EnhancedNFTGateInput>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EnhancedNFTGateInput
          onAddNFT={mockOnAddNFT}
          existingGates={[]}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('renders the basic form elements', () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null,
      });

      renderComponent();

      expect(screen.getByText(/NFT Contract Address/i)).toBeInTheDocument();
      expect(screen.getByText(/NFT Type/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add NFT Gate/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i)).toBeInTheDocument();
    });

    it('shows advanced options when toggled', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null,
      });

      renderComponent();

      const advancedButton = screen.getByRole('button', { name: /Show Advanced/i });
      await userEvent.click(advancedButton);

      expect(screen.getByText(/Quantity-based Requirements/i)).toBeInTheDocument();
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('validates NFT address format', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: 'Invalid contract address format',
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockInvalidAddress);

      await waitFor(() => {
        expect(screen.getByText(/Invalid contract address format/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during validation', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: true,
        error: null,
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockValidNFTAddress);

      await waitFor(() => {
        expect(screen.getByText(/Validating contract/i)).toBeInTheDocument();
      });
    });

    it('shows valid state when address is validated', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null,
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockValidNFTAddress);

      await waitFor(() => {
        expect(screen.getByText(/Valid ERC721 contract/i)).toBeInTheDocument();
      });
    });

    it('prevents duplicate NFT addresses', async () => {
      const existingGate: EnhancedNFTGate = {
        address: mockValidNFTAddress,
        type: 1, // ERC721
        name: 'Existing Collection',
      };

      mockuseNFTValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null,
      });

      renderComponent({ existingGates: [existingGate] });

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockValidNFTAddress);

      await waitFor(() => {
        expect(screen.getByText(/already added/i)).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add NFT Gate/i });
      expect(addButton).toBeDisabled();
    });
  });

  describe('NFT Gate Addition', () => {
    it('successfully adds a valid NFT gate', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null,
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockValidNFTAddress);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add NFT Gate/i });
        expect(addButton).toBeEnabled();
      });

      const addButton = screen.getByRole('button', { name: /Add NFT Gate/i });
      await userEvent.click(addButton);

      expect(mockOnAddNFT).toHaveBeenCalledWith(
        expect.objectContaining({
          address: mockValidNFTAddress,
          type: 1, // ERC721
        })
      );
    });

    it('resets form after successful addition', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null,
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i) as HTMLInputElement;
      await userEvent.type(addressInput, mockValidNFTAddress);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add NFT Gate/i });
        expect(addButton).toBeEnabled();
      });

      const addButton = screen.getByRole('button', { name: /Add NFT Gate/i });
      await userEvent.click(addButton);

      // Form should reset
      await waitFor(() => {
        expect(addressInput.value).toBe('');
      });
    });
  });

  describe('Advanced Features', () => {
    it('shows quantity controls for ERC1155 tokens', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC1155',
        isLoading: false,
        error: null,
      });

      renderComponent();

      // Show advanced options
      const advancedButton = screen.getByRole('button', { name: /Show Advanced/i });
      await userEvent.click(advancedButton);

      expect(screen.getByText(/Quantity-based Gating/i)).toBeInTheDocument();
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });

    it('integrates validation hook correctly', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: true,
        detectedType: 'ERC721',
        isLoading: false,
        error: null,
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockValidNFTAddress);

      // Verify the hook was called with the address
      await waitFor(() => {
        expect(mockuseNFTValidation).toHaveBeenCalledWith(expect.stringMatching(/0x/));
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockuseNFTValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: 'API request failed',
      });

      renderComponent();

      const addressInput = screen.getByPlaceholderText(/0x... \(paste NFT contract address\)/i);
      await userEvent.type(addressInput, mockValidNFTAddress);

      await waitFor(() => {
        expect(screen.getByText(/API request failed/i)).toBeInTheDocument();
      });
    });
  });
});

// Helper function to create integration test scenarios
export const createNFTGateTestScenarios = () => {
  return {
    validERC721Gate: {
      address: '0x1234567890123456789012345678901234567890',
      type: 1,
      name: 'Test ERC721',
      verified: true,
    } as EnhancedNFTGate,

    validERC1155Gate: {
      address: '0x9876543210987654321098765432109876543210',
      type: 2,
      name: 'Test ERC1155',
      enableQuantityGating: true,
      minQuantity: 1,
      maxQuantity: 100,
    } as EnhancedNFTGate,

    maliciousGate: {
      address: '0xbadcontract123456789012345678901234567890',
      type: 1,
      name: 'Suspicious Contract',
      verified: false,
    } as EnhancedNFTGate,
  };
};
