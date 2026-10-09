import { useJarTransactions } from "@jar-core/hooks/jar/useJarTransactions";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	owner: "0x1111111111111111111111111111111111111111",
	read: vi.fn(),
	write: vi.fn(),
	toast: vi.fn(),
	approval: { isSuccess: false, hash: undefined as string | undefined },
}));
const jar = "0x2222222222222222222222222222222222222222";
const token = "0x3333333333333333333333333333333333333333";
vi.mock("wagmi", () => ({
	useChainId: () => 42161,
	useAccount: () => ({
		isConnected: true,
		address: state.owner,
		chainId: 42161,
	}),
	usePublicClient: () => ({ readContract: state.read }),
}));
vi.mock("@jar-core/config/networks", () => ({ isV2Chain: () => true }));
vi.mock("@jar-core/hooks/app/useToast", () => ({
	useToast: () => ({ toast: state.toast }),
}));
vi.mock("@jar-core/lib/blockchain/token-utils", () => ({
	ETH_ADDRESS: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
	useTokenInfo: () => ({ symbol: "USDC", decimals: 6, error: false }),
}));
vi.mock("@jar-core/hooks/app/useTransactionWithRetry", () => ({
	useTransactionWithRetry: () => {
		const slot = useRef(nextSlot++ % 5).current;
		return {
			writeContract: state.write,
			...(slot === 2 ? state.approval : { isSuccess: false, hash: undefined }),
			isPending: false,
			isLoading: false,
			retryState: { canRetry: false },
			reset: vi.fn(),
		};
	},
}));
let nextSlot = 0;
beforeEach(() => {
	vi.clearAllMocks();
	state.owner = "0x1111111111111111111111111111111111111111";
	state.read.mockResolvedValue(1000000n);
	state.approval = { isSuccess: false, hash: undefined };
});
afterEach(cleanup);
const render = () =>
	renderHook(() =>
		useJarTransactions({ currency: token }, jar, { chainId: 42161 })
	);

it("deposits from the connected Safe without approving an existing allowance", async () => {
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	expect(state.read).toHaveBeenCalledWith(
		expect.objectContaining({
			address: token,
			functionName: "allowance",
			args: [state.owner, jar],
		})
	);
	expect(state.write).toHaveBeenCalledTimes(1);
	expect(state.write).toHaveBeenCalledWith(
		expect.objectContaining({
			address: jar,
			functionName: "deposit",
			args: [1000000n],
			chainId: 42161,
		})
	);
});

it("does not send an approval when allowance cannot be read", async () => {
	state.read.mockRejectedValue(new Error("RPC unavailable"));
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	expect(state.write).not.toHaveBeenCalled();
	expect(state.toast).toHaveBeenCalledWith(
		expect.objectContaining({ title: "Deposit failed" })
	);
});

it("proposes only one approval while waiting for multisig execution", async () => {
	state.read.mockResolvedValue(0n);
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
		await view.result.current.onSubmit("1");
	});
	expect(state.write).toHaveBeenCalledTimes(1);
	expect(state.write).toHaveBeenCalledWith(
		expect.objectContaining({ functionName: "approve" })
	);
});

it("checks allowance again after an approval receipt before depositing", async () => {
	state.read.mockResolvedValueOnce(0n).mockResolvedValue(1000000n);
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	state.approval = { isSuccess: true, hash: "0x1234" };
	view.rerender();
	await waitFor(() => expect(state.write).toHaveBeenCalledTimes(2));
	expect(state.read).toHaveBeenCalledTimes(2);
	expect(state.write.mock.calls[1][0]).toMatchObject({
		functionName: "deposit",
		args: [1000000n],
	});
});

it("never deposits a pending approval through a different connected account", async () => {
	state.read.mockResolvedValue(0n);
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	state.owner = "0x4444444444444444444444444444444444444444";
	state.approval = { isSuccess: true, hash: "0x1234" };
	view.rerender();
	await act(async () => {});
	expect(state.write).toHaveBeenCalledTimes(1);
});

it("resumes a Safe approval executed outside the app without repeating it", async () => {
	state.read
		.mockResolvedValueOnce(0n)
		.mockResolvedValueOnce(0n)
		.mockResolvedValue(1000000n);
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	await act(async () => {
		await view.result.current.checkApproval();
	});
	expect(view.result.current.transactionStep).toBe("approving");
	await act(async () => {
		await view.result.current.checkApproval();
	});
	expect(view.result.current.transactionStep).toBe("idle");
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	expect(state.write.mock.calls.map(([call]) => call.functionName)).toEqual([
		"approve",
		"deposit",
	]);
});
it("keeps a pending multisig approval locked when its allowance check fails", async () => {
	state.read
		.mockResolvedValueOnce(0n)
		.mockRejectedValue(new Error("RPC unavailable"));
	const view = render();
	await act(async () => {
		await view.result.current.onSubmit("1");
	});
	await act(async () => {
		await view.result.current.checkApproval();
		await view.result.current.onSubmit("1");
	});
	expect(state.write).toHaveBeenCalledTimes(1);
	expect(view.result.current.transactionStep).toBe("approving");
});
it("does not submit after the wallet changes during the allowance read", async () => {
	let finish!: (allowance: bigint) => void;
	state.read.mockImplementation(
		() =>
			new Promise<bigint>((resolve) => {
				finish = resolve;
			})
	);
	const view = render();
	let submission!: Promise<void>;
	act(() => {
		submission = view.result.current.onSubmit("1");
	});
	state.owner = "0x4444444444444444444444444444444444444444";
	view.rerender();
	await act(async () => {
		finish(1000000n);
		await submission;
	});
	expect(state.write).not.toHaveBeenCalled();
});
