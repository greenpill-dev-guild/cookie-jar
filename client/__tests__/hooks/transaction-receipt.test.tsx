import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useTransactionWithRetry } from "@/hooks/app/useTransactionWithRetry";

const state = vi.hoisted(() => ({
	confirmed: false,
	reverted: false,
	receipt: vi.fn(),
	write: vi.fn(),
	syncWrite: vi.fn(),
}));
vi.mock("wagmi", () => ({
	useWriteContract: () => ({
		writeContract: state.syncWrite,
		writeContractAsync: state.write,
		isSuccess: true,
		data: "0x1234",
		reset: vi.fn(),
	}),
	useWaitForTransactionReceipt: (options: unknown) => {
		state.receipt(options);
		return {
			isLoading: !state.confirmed,
			isSuccess: state.confirmed,
			data: state.confirmed
				? { status: state.reverted ? "reverted" : "success" }
				: undefined,
		};
	},
}));
vi.mock("@/hooks/app/useToast", () => ({
	useToast: () => ({ toast: vi.fn() }),
}));
afterEach(cleanup);
it("reports success only after confirmation and keeps the submitted chain for receipts", async () => {
	const view = renderHook(() => useTransactionWithRetry({ maxRetries: 0 }));
	expect(view.result.current.isSuccess).toBe(false);
	await act(async () => {
		await view.result.current.writeContract({ chainId: 31337 });
	});
	expect(state.write).toHaveBeenCalledWith({ chainId: 31337 });
	expect(state.receipt).toHaveBeenLastCalledWith(
		expect.objectContaining({ chainId: 31337 })
	);
	state.confirmed = true;
	view.rerender();
	expect(view.result.current.isSuccess).toBe(true);
});

it("does not report a reverted receipt as success", () => {
	state.confirmed = true;
	state.reverted = true;
	const view = renderHook(() => useTransactionWithRetry({ maxRetries: 0 }));
	expect(view.result.current.isSuccess).toBe(false);
	expect(view.result.current.error.message).toContain("reverted");
});
