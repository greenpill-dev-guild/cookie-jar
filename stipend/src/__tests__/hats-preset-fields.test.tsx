import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProtocolSelector } from "@/components/nft/ProtocolSelector";
import { HatsConfig } from "@/components/nft/protocols/HatsConfig";
import { HatsProvider } from "@/lib/nft/protocols/HatsProvider";

const chainClient = vi.hoisted(() => ({ readContract: vi.fn() }));
const publicClient = vi.hoisted(() => vi.fn(() => chainClient));
vi.mock("wagmi", () => ({ usePublicClient: publicClient }));
vi.mock("@/hooks/app/useResponsive", () => ({
	useResponsive: () => ({ isMobile: false }),
}));
vi.mock("@/lib/nft/protocols/HatsProvider", () => ({
	HatsProvider: { getHatById: vi.fn() },
}));
vi.mock("@/components/nft/NFTSelector", () => ({ NFTSelector: () => null }));
afterEach(cleanup);
const hatId =
	"0x0000005c00010000000000000000000000000000000000000000000000000000";
const hatsContract = "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137";

it("shows the canonical preset gate in its editable controls", () => {
	render(
		<ProtocolSelector
			initialConfig={{
				method: "Hats",
				hatsId: hatId,
				hatsAddress: hatsContract,
			}}
			onConfigChange={vi.fn()}
			forceDesktop
		/>
	);
	expect((screen.getByLabelText("Hat ID *") as HTMLInputElement).value).toBe(
		hatId
	);
	expect(
		(
			screen.getByLabelText(
				"Hats Contract Address (Optional)"
			) as HTMLInputElement
		).value
	).toBe(hatsContract);
});

it("publishes edits immediately instead of leaving a previous gate in the review", () => {
	const change = vi.fn();
	render(
		<HatsConfig
			initialConfig={{ hatId, hatsContract }}
			onConfigChange={change}
		/>
	);
	fireEvent.change(screen.getByLabelText("Hat ID *"), {
		target: { value: "123" },
	});
	expect(change).toHaveBeenLastCalledWith(
		expect.objectContaining({ hatsId: "123", hatsAddress: hatsContract })
	);
	fireEvent.change(screen.getByLabelText("Hat ID *"), {
		target: { value: "" },
	});
	expect(change).toHaveBeenLastCalledWith(
		expect.objectContaining({ hatsId: "" })
	);
});

it("validates using the selected jar network and entered contract", async () => {
	vi.mocked(HatsProvider.getHatById).mockResolvedValue({
		id: BigInt(hatId).toString(),
		prettyId: hatId,
		status: true,
		currentSupply: "5",
		maxSupply: "7",
	} as never);
	render(
		<ProtocolSelector
			chainId={42161}
			initialConfig={{
				method: "Hats",
				hatsId: hatId,
				hatsAddress: hatsContract,
			}}
			onConfigChange={vi.fn()}
			forceDesktop
		/>
	);
	fireEvent.click(screen.getByRole("button", { name: "Validate Hat" }));
	await waitFor(() =>
		expect(screen.getByText("Hat Validated Successfully")).toBeTruthy()
	);
	expect(publicClient).toHaveBeenCalledWith({ chainId: 42161 });
	expect(HatsProvider.getHatById).toHaveBeenLastCalledWith(
		hatId,
		hatsContract,
		chainClient
	);
	fireEvent.change(screen.getByLabelText("Hat ID *"), {
		target: { value: "123" },
	});
	expect(screen.queryByText("Hat Validated Successfully")).toBeNull();
});
