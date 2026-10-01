import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProtocolSelector } from "@/components/nft/ProtocolSelector";

vi.mock("@/hooks/app/useResponsive", () => ({
	useResponsive: () => ({ isMobile: true }),
}));
vi.mock("@/components/nft/NFTSelector", () => ({ NFTSelector: () => null }));
vi.mock("@/components/nft/protocols/HatsConfig", () => ({
	HatsConfig: () => null,
}));
vi.mock("@/components/nft/protocols/HypercertConfig", () => ({
	HypercertConfig: () => null,
}));
vi.mock("@/components/nft/protocols/POAPConfig", () => ({
	POAPConfig: () => null,
}));
vi.mock("@/components/nft/protocols/UnlockConfig", () => ({
	UnlockConfig: () => null,
}));

describe("mobile access configuration", () => {
	it("renders an operable accordion and keeps its help link separate", () => {
		render(
			<ProtocolSelector
				forceMobile
				visibleMethods={["Allowlist"]}
				onConfigChange={vi.fn()}
			/>
		);
		const trigger = screen.getByRole("button", { name: /Configure Allowlist/ });
		expect(trigger.tagName).toBe("BUTTON");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(
			trigger.contains(screen.getByRole("link", { name: /Learn More/ }))
		).toBe(false);
		fireEvent.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});
});
