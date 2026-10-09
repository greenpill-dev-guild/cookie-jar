import type { JarCreationFormData } from "@jar-core/hooks/jar/schemas/jarCreationSchema";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, expect, it, vi } from "vitest";
import { JarImageInput } from "@/components/create/JarImageInput";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@/lib/jar-image-upload", () => ({
	uploadJarImage: upload,
	validateJarImage: () => {},
}));
function Form({ imageUrl = "" }: { imageUrl?: string }) {
	const form = useForm<JarCreationFormData>({
		defaultValues: { imageUrl },
	});
	return (
		<FormProvider {...form}>
			<JarImageInput />
			<span data-testid="saved-image">{form.watch("imageUrl")}</span>
		</FormProvider>
	);
}
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});
function previewUrls() {
	vi.stubGlobal(
		"URL",
		class extends URL {
			static createObjectURL() {
				return "blob:preview";
			}
			static revokeObjectURL() {}
		}
	);
}
it("shows upload progress and stores only the completed image URL", async () => {
	previewUrls();
	let finish!: (url: string) => void;
	upload.mockImplementation(
		() =>
			new Promise<string>((resolve) => {
				finish = resolve;
			})
	);
	render(<Form />);
	fireEvent.change(screen.getByLabelText("Jar image"), {
		target: { files: [new File(["png"], "photo.png", { type: "image/png" })] },
	});
	expect(screen.getByRole("status").textContent).toBe("Uploading image…");
	expect(screen.getByTestId("saved-image").textContent).toBe("");
	finish("https://ipfs.io/ipfs/test");
	await waitFor(() =>
		expect(screen.getByTestId("saved-image").textContent).toBe(
			"https://ipfs.io/ipfs/test"
		)
	);
	expect(screen.getByRole("status").textContent).toBe("Image ready.");
	fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
	expect(screen.getByTestId("saved-image").textContent).toBe("");
});
it("cancels a pending upload without accepting its later result", async () => {
	previewUrls();
	let finish!: (url: string) => void;
	upload.mockImplementation(
		() =>
			new Promise<string>((resolve) => {
				finish = resolve;
			})
	);
	render(<Form />);
	fireEvent.change(screen.getByLabelText("Jar image"), {
		target: { files: [new File(["png"], "photo.png", { type: "image/png" })] },
	});
	fireEvent.click(screen.getByRole("button", { name: "Cancel upload" }));
	await act(async () => {
		finish("https://ipfs.io/ipfs/stale");
	});
	await waitFor(() =>
		expect(screen.getByTestId("saved-image").textContent).toBe("")
	);
	expect(upload.mock.calls.at(-1)?.[1].aborted).toBe(true);
});

it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>"])(
	"does not render an unsafe remote preview: %s",
	(imageUrl) => {
		render(<Form imageUrl={imageUrl} />);
		expect(screen.queryByRole("img", { name: "Jar image preview" })).toBeNull();
	}
);
it("previews an existing HTTPS image URL", () => {
	render(
		<Form imageUrl="https://www.greengoods.app/images/hero-cookie.webp" />
	);
	expect(
		screen.getByRole("img", { name: "Jar image preview" }).getAttribute("src")
	).toBe("https://www.greengoods.app/images/hero-cookie.webp");
});
