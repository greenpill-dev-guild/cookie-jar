import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NFTGateInput } from "@/components/forms/NFTGateInput";

enum NFTType {
  None = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

// Mock the validation hook with different return values based on address
vi.mock("@/hooks/useNftValidation", () => ({
  useNftValidation: vi.fn(),
}));

// Mock validation results for testing
const mockValidationResults = {
  "0xERC721000000000000000000000000000000000000": {
    isValid: true,
    detectedType: "ERC721",
    isLoading: false,
    error: null,
  },
  "0xERC1155000000000000000000000000000000000000": {
    isValid: true,
    detectedType: "ERC1155",
    isLoading: false,
    error: null,
  },
  "0xLoading0000000000000000000000000000000000": {
    isValid: false,
    detectedType: null,
    isLoading: true,
    error: null,
  },
  "0xInvalid000000000000000000000000000000000000": {
    isValid: false,
    detectedType: null,
    isLoading: false,
    error: "Contract does not support ERC721 or ERC1155 interfaces",
  },
};

describe("NFTGateInput", () => {
  const user = userEvent.setup();
  const mockOnAddNFT = vi.fn();
  let queryClient: QueryClient;
  const mockUseNftValidation = vi.mocked(require("@/hooks/useNftValidation").useNftValidation);

  beforeEach(() => {
    mockOnAddNFT.mockClear();
    mockUseNftValidation.mockClear();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProviders = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NFTGateInput onAddNFT={mockOnAddNFT} {...props} />
      </QueryClientProvider>
    );
  };

  it("renders input fields correctly", () => {
    mockUseNftValidation.mockReturnValue({
      isValid: false,
      detectedType: null,
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    expect(screen.getByPlaceholderText("0x...")).toBeInTheDocument();
    expect(screen.getByText("NFT Type")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("validates NFT addresses in real-time", async () => {
    // Start with loading state
    mockUseNftValidation.mockReturnValue({
      isValid: false,
      detectedType: null,
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");

    // Mock successful validation after debounce
    mockUseNftValidation.mockReturnValue({
      isValid: true,
      detectedType: "ERC721",
      isLoading: false,
      error: null,
    });

    // Type a valid ERC721 address
    await user.type(addressInput, "0xERC721000000000000000000000000000000000000");

    // Wait for debounce and validation
    await waitFor(() => {
      expect(screen.getByText(/✓ Valid ERC721 contract/)).toBeInTheDocument();
    });
  });

  it("shows loading state during validation", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: false,
      detectedType: null,
      isLoading: true,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");

    await user.type(addressInput, "0xLoading0000000000000000000000000000000000");

    await waitFor(() => {
      expect(screen.getByText("Validating contract...")).toBeInTheDocument();
    });
  });

  it("shows error for invalid contracts", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: false,
      detectedType: null,
      isLoading: false,
      error: "Contract does not support ERC721 or ERC1155 interfaces",
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");

    await user.type(addressInput, "0xInvalid000000000000000000000000000000000000");

    await waitFor(() => {
      expect(screen.getByText("Contract does not support ERC721 or ERC1155 interfaces")).toBeInTheDocument();
    });
  });

  it("auto-populates NFT type when detected", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: true,
      detectedType: "ERC1155",
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");
    const typeSelect = screen.getByRole("combobox");

    await user.type(addressInput, "0xERC1155000000000000000000000000000000000000");

    // Should auto-select ERC1155 - this tests the auto-detection logic in the component
    await waitFor(() => {
      expect(screen.getByText("ERC1155")).toBeInTheDocument();
    });
  });

  it("shows type mismatch warning", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: true,
      detectedType: "ERC1155",
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");

    await user.type(addressInput, "0xERC1155000000000000000000000000000000000000");

    // The component should show a validation message about type mismatch
    await waitFor(() => {
      expect(screen.getByText(/Contract is.*but type is set to/)).toBeInTheDocument();
    });
  });

  it("disables add button when validation fails", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: false,
      detectedType: null,
      isLoading: false,
      error: "Invalid contract",
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");
    const addButton = screen.getByRole("button");

    await user.type(addressInput, "0xInvalid000000000000000000000000000000000000");

    await waitFor(() => {
      expect(addButton).toBeDisabled();
    });
  });

  it("enables add button when validation succeeds", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: true,
      detectedType: "ERC721",
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");
    const addButton = screen.getByRole("button");

    await user.type(addressInput, "0xERC721000000000000000000000000000000000000");

    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });
  });

  it("calls onAddNFT with correct parameters", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: true,
      detectedType: "ERC721",
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");
    const addButton = screen.getByRole("button");

    await user.type(addressInput, "0xERC721000000000000000000000000000000000000");

    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });

    await user.click(addButton);

    expect(mockOnAddNFT).toHaveBeenCalledWith(
      "0xERC721000000000000000000000000000000000000",
      1
    );
  });

  it("resets form after successful add", async () => {
    mockUseNftValidation.mockReturnValue({
      isValid: true,
      detectedType: "ERC721",
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const addressInput = screen.getByPlaceholderText("0x...");
    const addButton = screen.getByRole("button");

    await user.type(addressInput, "0xERC721000000000000000000000000000000000000");

    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });

    await user.click(addButton);

    // Form should reset
    await waitFor(() => {
    expect(addressInput).toHaveValue("");
    });
  });

  describe("Type Selection", () => {
    it("allows manual type selection", async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      // The component should allow type selection through the Select component
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows both NFT type options", async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      const typeSelect = screen.getByRole("combobox");
      await user.click(typeSelect);

      // Should show both options
      expect(screen.getByText("ERC721")).toBeInTheDocument();
      expect(screen.getByText("ERC1155")).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("integrates validation hook correctly", async () => {
      // Test that the component properly uses the validation hook
      mockUseNftValidation.mockReturnValue({
        isValid: true,
        detectedType: "ERC721",
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      const addressInput = screen.getByPlaceholderText("0x...");
      await user.type(addressInput, "0xERC721000000000000000000000000000000000000");

      // Verify the hook was called with the address
      await waitFor(() => {
        expect(mockUseNftValidation).toHaveBeenCalledWith(expect.stringMatching(/0x/));
      });
    });

    it("handles debouncing correctly", async () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      const addressInput = screen.getByPlaceholderText("0x...");
      
      // Type rapidly - debouncing should prevent excessive validation calls
      await user.type(addressInput, "0xERC");

      // Should handle debouncing properly
      expect(mockUseNftValidation).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper labels and structure", () => {
      mockUseNftValidation.mockReturnValue({
        isValid: false,
        detectedType: null,
        isLoading: false,
        error: null,
      });

      renderWithProviders();

      expect(screen.getByText("NFT Addresses & Types")).toBeInTheDocument();
      expect(screen.getByText("NFT Address")).toBeInTheDocument();
      expect(screen.getByText("NFT Type")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});
