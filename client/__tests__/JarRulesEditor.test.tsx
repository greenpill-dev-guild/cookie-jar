import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JarRulesEditor } from "@/components/jar/JarRulesEditor";

const write = vi.hoisted(() => vi.fn());
vi.mock("wagmi", () => ({
	useReadContracts: () => ({
		data: [{ result: 500000n }, { result: 2419200n }, { result: false }],
		refetch: vi.fn(),
	}),
}));
vi.mock("@/hooks/app/useTransactionWithRetry", () => ({
	useTransactionWithRetry: () => ({ writeContract: write, isSuccess: false }),
}));
afterEach(cleanup);
it("updates the maximum in token units and the interval in seconds on the jar chain", async () => {
	render(
		<JarRulesEditor
			address="0x1111111111111111111111111111111111111111"
			chainId={31337}
			decimals={6}
			withdrawalOption="Variable"
			onChange={vi.fn()}
		/>
	);
	fireEvent.change(screen.getByLabelText("Maximum per claim"), {
		target: { value: "800" },
	});
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Update maximum" }));
	});
	expect(write).toHaveBeenLastCalledWith(
		expect.objectContaining({
			functionName: "updateMaxWithdrawalAmount",
			args: [800000000n],
			chainId: 31337,
		})
	);
	fireEvent.change(screen.getByLabelText("Claim interval (days)"), {
		target: { value: "28" },
	});
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Update interval" }));
	});
	expect(write).toHaveBeenLastCalledWith(
		expect.objectContaining({
			functionName: "updateWithdrawalInterval",
			args: [2419200n],
			chainId: 31337,
		})
	);
});

it("uses the fixed-amount setter for a fixed jar", async () => {
	render(
		<JarRulesEditor
			address="0x1111111111111111111111111111111111111111"
			chainId={31337}
			decimals={6}
			withdrawalOption="Fixed"
			onChange={vi.fn()}
		/>
	);
	fireEvent.change(screen.getByLabelText("Amount per claim"), {
		target: { value: "800" },
	});
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Update amount" }));
	});
	expect(write).toHaveBeenLastCalledWith(
		expect.objectContaining({
			functionName: "updateFixedWithdrawalAmount",
			args: [800000000n],
			chainId: 31337,
		})
	);
});
