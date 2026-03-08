import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";

// Mock the deployments.auto module first
vi.mock("@/config/deployments.auto", () => ({
	isV2Chain: vi.fn().mockReturnValue(true),
	DEPLOYMENTS: {
		31337: {
			chainId: 31337,
			factoryAddress: "0xa2Cc1f3479E194B1aa16BeCc975aA25618f8d3AD",
			isV2: true,
			blockNumber: 0,
			timestamp: 1759019328,
		},
	},
}));

import { ETH_ADDRESS } from "@/lib/blockchain/constants";

// Mock wagmi hooks
vi.mock("wagmi", () => ({
	useAccount: vi.fn(() => ({
		isConnected: true,
		address: "0x1234567890123456789012345678901234567890",
	})),
	useChainId: vi.fn(() => 8453), // Base mainnet (v1)
	useWriteContract: vi.fn(() => ({
		writeContract: vi.fn(),
		data: "0xabcdef",
		error: null,
		isPending: false,
	})),
	useWaitForTransactionReceipt: vi.fn(() => ({
		isLoading: false,
		isSuccess: false,
		data: null,
	})),
}));

// Mock router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

// Mock config
vi.mock("@/config/supported-networks", () => ({
	contractAddresses: {
		cookieJarFactory: {
			8453: "0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9", // Base
			31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Anvil
		},
	},
	isV2Chain: vi.fn((chainId: number) => chainId === 31337),
}));

// Mock toast
vi.mock("@/hooks/app/useToast", () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

// Skip useJarCreation tests by default - they require full WagmiProvider setup
// Run with: RUN_WAGMI_TESTS=true bun test
const describeOrSkip =
	process.env.RUN_WAGMI_TESTS === "true" ? describe : describe.skip;

describeOrSkip("useJarCreation", () => {
	let queryClient: QueryClient;
	let useJarCreation: typeof import("@/hooks/jar/useJarCreation").useJarCreation;

	beforeAll(async () => {
		const module = await import("@/hooks/jar/useJarCreation");
		useJarCreation = module.useJarCreation;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
	});

	const renderHookWithProviders = () => {
		if (!useJarCreation) {
			throw new Error("useJarCreation hook not loaded");
		}
		return renderHook(() => useJarCreation(), {
			wrapper: ({ children }: { children: React.ReactNode }) =>
				React.createElement(
					QueryClientProvider,
					{ client: queryClient },
					children,
				),
		});
	};

	describe("ETH Address Fix", () => {
		it("should use address(3) for ETH address", () => {
			const { result } = renderHookWithProviders();

			expect(result.current.ETH_ADDRESS).toBe(ETH_ADDRESS);
		});

		it("should initialize supportedCurrency with correct ETH address", () => {
			const { result } = renderHookWithProviders();

			expect(result.current.form.getValues("supportedCurrency")).toBe(
				ETH_ADDRESS,
			);
		});
	});

	describe("V1 vs V2 Logic", () => {
		it("should detect v1 contracts correctly", () => {
			const { result } = renderHookWithProviders();

			// Base mainnet should be v1
			expect(result.current.isV2Contract).toBe(false);
		});

		it("should detect v2 contracts correctly", () => {
			vi.doMock("@/config/deployments.auto", () => ({
				isV2Chain: vi.fn().mockReturnValue(true),
				DEPLOYMENTS: {
					31337: {
						chainId: 31337,
						factoryAddress:
							"0xa2Cc1f3479E194B1aa16BeCc975aA25618f8d3AD",
						isV2: true,
						blockNumber: 0,
						timestamp: 1759019328,
					},
				},
			}));

			const { result } = renderHookWithProviders();
			expect(result.current.isV2Contract).toBe(true);
		});

		it("should disable custom fees for v1 contracts", () => {
			const { result } = renderHookWithProviders();

			act(() => {
				result.current.form.setValue("enableCustomFee", true);
			});

			// v1 effect should reset to false
			expect(result.current.form.getValues("enableCustomFee")).toBe(
				false,
			);
		});

		it("should force allowlist access type for v1 contracts", () => {
			const { result } = renderHookWithProviders();

			act(() => {
				result.current.form.setValue("accessType", 1); // NFTGated
			});

			// v1 effect should reset to Allowlist
			expect(result.current.form.getValues("accessType")).toBe(0);
		});
	});

	describe("Form Validation", () => {
		it("should validate required jar name", () => {
			const { result } = renderHookWithProviders();

			const validation = result.current.validateStep1();

			expect(validation.isValid).toBe(false);
			expect(validation.errors).toContain("Jar name is required");
		});

		it("should validate withdrawal amounts", () => {
			const { result } = renderHookWithProviders();

			act(() => {
				result.current.form.setValue("withdrawalOption", 0); // Fixed
				result.current.form.setValue("fixedAmount", "0");
			});

			const validation = result.current.validateStep2();

			expect(validation.isValid).toBe(false);
			expect(validation.errors).toContain(
				"Fixed withdrawal amount must be greater than 0",
			);
		});

		it("should validate withdrawal interval", () => {
			const { result } = renderHookWithProviders();

			act(() => {
				result.current.form.setValue("withdrawalInterval", "0");
			});

			const validation = result.current.validateStep2();

			expect(validation.isValid).toBe(false);
			expect(validation.errors).toContain(
				"Withdrawal interval must be greater than 0 days",
			);
		});

		it("should validate custom fee percentage", () => {
			const { result } = renderHookWithProviders();

			act(() => {
				result.current.form.setValue("enableCustomFee", true);
				result.current.form.setValue("customFee", "150"); // Over 100%
			});

			const validation = result.current.validateStep4();

			expect(validation.isValid).toBe(false);
			expect(validation.errors).toContain(
				"Custom fee must be between 0 and 100 percent",
			);
		});
	});

	describe("Currency Handling", () => {
		it("should initialize with custom currency hidden", () => {
			const { result } = renderHookWithProviders();

			expect(result.current.form.getValues("showCustomCurrency")).toBe(
				false,
			);
		});

		it("should allow setting custom currency via form", () => {
			const { result } = renderHookWithProviders();

			act(() => {
				result.current.form.setValue("showCustomCurrency", true);
				result.current.form.setValue(
					"customCurrencyAddress",
					"0x1234567890123456789012345678901234567890",
				);
			});

			expect(result.current.form.getValues("showCustomCurrency")).toBe(
				true,
			);
			expect(
				result.current.form.getValues("customCurrencyAddress"),
			).toBe("0x1234567890123456789012345678901234567890");
		});
	});

	describe("Form Reset", () => {
		it("should reset all form fields", () => {
			const { result } = renderHookWithProviders();

			// Set some values
			act(() => {
				result.current.form.setValue("jarName", "Test Jar");
				result.current.form.setValue("fixedAmount", "0.5");
				result.current.form.setValue("enableCustomFee", true);
			});

			// Verify values are set
			expect(result.current.form.getValues("jarName")).toBe("Test Jar");
			expect(result.current.form.getValues("fixedAmount")).toBe("0.5");
			expect(result.current.form.getValues("enableCustomFee")).toBe(true);

			// Reset form
			act(() => {
				result.current.resetForm();
			});

			// Verify values are reset
			expect(result.current.form.getValues("jarName")).toBe("");
			expect(result.current.form.getValues("fixedAmount")).toBe("0");
			expect(result.current.form.getValues("enableCustomFee")).toBe(
				false,
			);
		});
	});
});
