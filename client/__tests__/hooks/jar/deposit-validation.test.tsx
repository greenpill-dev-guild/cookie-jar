import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useJarTransactions } from "@/hooks/jar/useJarTransactions";

const mocks = vi.hoisted(() => ({
	write: vi.fn(),
	toast: vi.fn(),
	success: false,
	error: undefined as Error | undefined,
	hash: undefined as string | undefined,
}));
vi.mock("wagmi", () => ({
	useChainId: () => 31337,
	useAccount: () => ({
		isConnected: true,
		address: "0x1111111111111111111111111111111111111111",
		chainId: 31337,
	}),
}));
vi.mock("@/config/supported-networks", () => ({ isV2Chain: () => true }));
vi.mock("@/hooks/app/useToast", () => ({
	useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("@/lib/blockchain/token-utils", () => ({
	ETH_ADDRESS: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
	useTokenInfo: () => ({
		symbol: "USDC",
		decimals: 6,
		error: false,
		isLoading: false,
	}),
}));
vi.mock("@/hooks/app/useTransactionWithRetry", () => ({
	useTransactionWithRetry: () => ({
		writeContract: mocks.write,
		error: mocks.error,
		isSuccess: mocks.success,
		hash: mocks.hash,
		isPending: false,
		retryState: { canRetry: false },
		reset: vi.fn(),
	}),
}));
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mocks.success = false;
	mocks.hash = undefined;
	mocks.error = undefined;
});
it.each(["abc", "-1", "1.0000001", "0", "1e3"])(
	"rejects %s without an unhandled error or wallet write",
	async (text) => {
		const { result } = renderHook(() =>
			useJarTransactions(
				{ currency: "0x1111111111111111111111111111111111111111" },
				"0x2222222222222222222222222222222222222222",
				{ chainId: 31337 }
			)
		);
		await act(async () => {
			await expect(result.current.onSubmit(text)).resolves.toBeUndefined();
		});
		expect(mocks.write).not.toHaveBeenCalled();
		expect(mocks.toast).toHaveBeenCalled();
	}
);

it("retains a new deposit amount after handling a previous receipt", () => {
	const view = renderHook(() =>
		useJarTransactions(
			{ currency: "0x1111111111111111111111111111111111111111" },
			"0x2222222222222222222222222222222222222222",
			{ chainId: 31337 }
		)
	);
	mocks.success = true;
	mocks.hash = "0x1234";
	view.rerender();
	act(() => view.result.current.setAmount("1"));
	expect(view.result.current.amount).toBe("1");
});

it("surfaces an approval confirmation failure without resubmitting", async () => {
	const view = renderHook(() =>
		useJarTransactions(
			{ currency: "0x1111111111111111111111111111111111111111" },
			"0x2222222222222222222222222222222222222222",
			{ chainId: 31337 }
		)
	);
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	mocks.hash = "0x1234";
	mocks.error = new Error("Transaction reverted");
	view.rerender();
	expect(view.result.current.transactionError).toContain("reverted");
	expect(view.result.current.isDepositPending).toBe(false);
	expect(mocks.write).toHaveBeenCalledTimes(1);
});
