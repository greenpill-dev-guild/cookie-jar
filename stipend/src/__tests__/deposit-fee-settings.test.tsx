import type { JarCreationFormData } from "@jar-core/hooks/jar/schemas/jarCreationSchema";
import { ETH_ADDRESS } from "@jar-core/lib/blockchain/constants";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepContent } from "@/components/create/StepContent";

vi.mock("@/components/nft/NFTSelector", () => ({ NFTSelector: () => null }));
vi.mock("@/components/nft/ProtocolSelector", () => ({
	ProtocolSelector: () => null,
}));
vi.mock("@jar-core/config/supported-networks", () => ({
	isPoapSupportedChain: () => false,
}));

function FeeSettings({ isV2Contract = true }: { isV2Contract?: boolean }) {
	const form = useForm<JarCreationFormData>({
		defaultValues: {
			jarName: "Test jar",
			jarOwnerAddress: "0x1234567890123456789012345678901234567890",
			supportedCurrency: ETH_ADDRESS,
			accessType: 0,
			withdrawalOption: 0,
			withdrawalInterval: "28",
			enableCustomFee: false,
			customFee: "",
		},
	});
	return (
		<FormProvider {...form}>
			<StepContent step={4} isV2Contract={isV2Contract} />
		</FormProvider>
	);
}

afterEach(cleanup);

describe("deposit fee settings", () => {
	it("shows the fee-free default in both the settings and review", () => {
		render(<FeeSettings />);
		expect(
			screen.getByRole("checkbox", { name: "Charge a deposit fee" })
		).not.toBeChecked();
		expect(
			screen.getByText("No deposit fee (0%). Deposits are credited in full.")
		).toBeVisible();
		expect(screen.getByText("0% (no fee)")).toBeVisible();
	});

	it("shows an intentional fee and returns to zero when charging is disabled", () => {
		render(<FeeSettings />);
		const chargeFee = screen.getByRole("checkbox", {
			name: "Charge a deposit fee",
		});
		fireEvent.click(chargeFee);
		expect(screen.getByText("Enter a percentage")).toBeVisible();
		fireEvent.change(screen.getByLabelText("Deposit fee percentage"), {
			target: { value: "2.5" },
		});
		expect(screen.getByText("2.5%")).toBeVisible();
		fireEvent.click(chargeFee);
		expect(screen.getByText("0% (no fee)")).toBeVisible();
		expect(screen.queryByText("2.5%")).not.toBeInTheDocument();
	});

	it("does not promise zero fees for legacy jars", () => {
		render(<FeeSettings isV2Contract={false} />);
		expect(
			screen.getByRole("checkbox", { name: /Charge a deposit fee/ })
		).toBeDisabled();
		expect(screen.getByText("Factory default (legacy jar)")).toBeVisible();
		expect(screen.queryByText("0% (no fee)")).not.toBeInTheDocument();
	});
});
