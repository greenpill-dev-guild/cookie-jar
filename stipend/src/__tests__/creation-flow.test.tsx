import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJarCreation } from "@/hooks/jar/useJarCreation";

const state = vi.hoisted(() => ({
	address: "0x1111111111111111111111111111111111111111",
	chainId: 42161,
	decimals: 6 as number | undefined,
	write: vi.fn(),
	simulate: vi.fn(),
	push: vi.fn(),
	toast: vi.fn(),
	receipt: undefined as unknown,
	receiptError: undefined as Error | undefined,
	refetchReceipt: vi.fn(),
	hash: undefined as string | undefined,
}));
vi.mock("@/navigation/router", () => ({
	navigate: (...args: unknown[]) => state.push(...args),
}));
vi.mock("@jar-core/hooks/app/useToast", () => ({
	useToast: () => ({ toast: state.toast }),
}));
vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/config/featured-jar", () => ({ FEATURED_JAR: { chainId: 42161 } }));
vi.mock("@jar-core/config/networks", () => ({
	isV2Chain: () => true,
	contractAddresses: {
		cookieJarFactory: { 42161: "0x294d222eDE6DF6625B43544F1C634322467528Da" },
	},
}));
vi.mock("wagmi", () => ({
	useAccount: () => ({
		address: state.address,
		isConnected: true,
		chainId: state.chainId,
	}),
	useChainId: () => state.chainId,
	usePublicClient: () => ({ simulateContract: state.simulate }),
	useReadContracts: () => ({
		data: [
			{ status: "success", result: "USDC" },
			{
				status: state.decimals === undefined ? "failure" : "success",
				result: state.decimals,
			},
		],
		isPending: false,
	}),
	useReadContract: () => ({ data: 100n }),
	useWriteContract: () => ({ writeContract: state.write }),
	useWaitForTransactionReceipt: () => ({
		data: state.receipt,
		isSuccess: !!state.receipt,
		isLoading: false,
		error: state.receiptError,
		refetch: state.refetchReceipt,
	}),
}));
vi.mock("@jar-core/hooks/app/useTransactionWithRetry", () => ({
	useTransactionWithRetry: () => ({
		writeContract: state.write,
		hash: state.hash,
		isPending: false,
		reset: vi.fn(),
	}),
}));
afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	state.chainId = 42161;
	state.decimals = 6;
	state.receipt = undefined;
	state.receiptError = undefined;
	state.hash = undefined;
	state.simulate.mockResolvedValue({ request: {} });
	state.write.mockResolvedValue(undefined);
});

describe("direct factory creation", () => {
	it("keeps the preset owner and edits when the wallet changes", () => {
		const view = renderHook(useJarCreation);
		act(() => view.result.current.applyStipendPreset());
		expect(view.result.current.form.getValues("jarOwnerAddress")).toBe(
			"0xe09315A86ED0A39862158f5631b928145987fE05"
		);
		act(() =>
			view.result.current.form.setValue("maxWithdrawal", "400", {
				shouldDirty: true,
			})
		);
		state.address = "0x2222222222222222222222222222222222222222";
		view.rerender();
		expect(view.result.current.form.getValues("jarOwnerAddress")).toBe(
			"0xe09315A86ED0A39862158f5631b928145987fE05"
		);
		expect(view.result.current.form.getValues("maxWithdrawal")).toBe("400");
		expect(state.write).not.toHaveBeenCalled();
	});
	it.each(["wrong network", "missing decimals"])(
		"blocks creation on %s",
		async (reason) => {
			const view = renderHook(useJarCreation);
			act(() => view.result.current.applyStipendPreset());
			if (reason === "wrong network") state.chainId = 1;
			else state.decimals = undefined;
			view.rerender();
			await act(async () => {
				await view.result.current.confirmSubmit();
			});
			expect(state.write).not.toHaveBeenCalled();
			expect(state.simulate).not.toHaveBeenCalled();
			expect(view.result.current.formErrors.length).toBeGreaterThan(0);
		}
	);
	it("simulates reviewed values on the selected chain and prevents duplicate submissions", async () => {
		let finish!: () => void;
		state.write.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);
		const view = renderHook(useJarCreation);
		act(() => view.result.current.applyStipendPreset());
		let pending!: Promise<void>;
		act(() => {
			pending = view.result.current.confirmSubmit();
		});
		await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
		await act(async () => {
			await view.result.current.confirmSubmit();
		});
		expect(state.write).toHaveBeenCalledTimes(1);
		expect(state.simulate.mock.calls[0][0]).toMatchObject({
			address: "0x294d222eDE6DF6625B43544F1C634322467528Da",
			functionName: "createCookieJar",
			args: [
				expect.objectContaining({
					maxWithdrawal: 800000000n,
					withdrawalInterval: 2419200n,
				}),
				expect.anything(),
				expect.anything(),
			],
		});
		expect(state.write.mock.calls[0][0].chainId).toBe(42161);
		await act(async () => {
			finish();
			await pending;
		});
	});
	it("preserves the form after a wallet rejection", async () => {
		state.write.mockRejectedValue(new Error("User rejected the request"));
		const view = renderHook(useJarCreation);
		act(() => view.result.current.applyStipendPreset());
		await act(async () => {
			await view.result.current.confirmSubmit();
		});
		expect(view.result.current.form.getValues("maxWithdrawal")).toBe("800");
		expect(view.result.current.isCreating).toBe(false);
		expect(view.result.current.formErrors.join(" ")).toContain("User rejected");
	});
});

it("keeps a submitted configuration locked when confirmation reads fail", async () => {
	const view = renderHook(useJarCreation);
	act(() => view.result.current.applyStipendPreset());
	await act(async () => {
		await view.result.current.confirmSubmit();
	});
	state.hash = "0x1234";
	state.receiptError = new Error("RPC unavailable");
	view.rerender();
	expect(view.result.current.confirmationError).toContain("confirmation");
	expect(view.result.current.busy).toBe(true);
	await act(async () => {
		await view.result.current.confirmSubmit();
	});
	expect(state.write).toHaveBeenCalledTimes(1);
});

it("unlocks review after a confirmed creation revert", async () => {
	const view = renderHook(useJarCreation);
	act(() => view.result.current.applyStipendPreset());
	await act(async () => {
		await view.result.current.confirmSubmit();
	});
	state.hash = "0x1234";
	state.receiptError = new Error("Transaction reverted");
	view.rerender();
	expect(view.result.current.busy).toBe(false);
	expect(view.result.current.formErrors.join(" ")).toContain("reverted");
});
