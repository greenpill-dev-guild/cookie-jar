import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { JarImage } from "@/components/jars/JarImage";

afterEach(cleanup);
it("uses an app-owned fallback when metadata has no image", () => {
	render(<JarImage jarName="Stipend" />);
	expect(screen.getByRole("img")).toHaveAttribute("src", "/icon.svg");
});
it("recovers from failed images and does not retain an image removed from metadata", () => {
	const view = render(
		<JarImage
			jarName="Stipend"
			metadata='{"image":"https://example.invalid/image.png"}'
		/>
	);
	fireEvent.error(screen.getByRole("img", { name: "Stipend" }));
	expect(screen.getByRole("img")).toHaveAttribute("src", "/icon.svg");
	view.rerender(
		<JarImage
			jarName="Stipend"
			metadata='{"image":"https://example.invalid/other.png"}'
		/>
	);
	expect(screen.getByRole("img")).toHaveAttribute(
		"src",
		"https://example.invalid/other.png"
	);
	view.rerender(<JarImage jarName="Stipend" metadata="{}" />);
	expect(screen.getByRole("img")).toHaveAttribute("src", "/icon.svg");
});
