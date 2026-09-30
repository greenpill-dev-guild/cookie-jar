import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProtocolSelector } from "@/components/nft/ProtocolSelector";
import { HatsConfig } from "@/components/nft/protocols/HatsConfig";

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
