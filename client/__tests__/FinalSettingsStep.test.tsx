import type { JarCreationFormData } from "@jar-core/hooks/jar/schemas/jarCreationSchema";
import { DEFAULT_CREATION_VALUES } from "@jar-core/lib/jar/creation-values";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { StepContent } from "@/components/create/StepContent";

vi.mock("@/components/nft/NFTSelector", () => ({ NFTSelector: () => null }));
vi.mock("@/components/nft/ProtocolSelector", () => ({
	ProtocolSelector: () => null,
}));

function Review({ streamingEnabled = false }) {
	const form = useForm<JarCreationFormData>({
		defaultValues: { ...DEFAULT_CREATION_VALUES, streamingEnabled },
	});
	return (
		<FormProvider {...form}>
			<StepContent step={4} isV2Contract />
		</FormProvider>
	);
}

it.each([false, true])(
	"does not offer or promise unsupported streaming (stored value %s)",
	(streamingEnabled) => {
		render(<Review streamingEnabled={streamingEnabled} />);
		expect(
			screen.queryByRole("checkbox", { name: "Enable token streaming" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByLabelText(
				/Stream Rate|Stream Duration|approval for new streams/i
			)
		).not.toBeInTheDocument();
		expect(screen.getByText("Streaming:").parentElement).toHaveTextContent(
			"Streaming: Not configured during creation"
		);
		expect(
			screen.getByText(
				"Token streaming cannot be configured during jar creation."
			)
		).toBeVisible();
		expect(
			screen.getByRole("checkbox", {
				name: "Enable auto-swap for ETH deposits",
			})
		).toBeEnabled();
	}
);
