import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
vi.mock("@/hooks/jar/useFeaturedJar", () => ({
	useFeaturedJar: () => ({ chainId: 42161 }),
}));
vi.mock("@/components/jar/JarPageContent", () => ({
	JarPageContent: () => null,
}));
vi.mock("@/components/app/footer", () => ({ Footer: () => null }));
afterEach(cleanup);
it("opens the generic factory UI without a featured stipend configuration", () => {
	render(<Home />);
	expect(
		screen.getByRole("heading", { level: 1, name: "Cookie Jar" })
	).toBeVisible();
	expect(screen.getByRole("link", { name: "Browse jars" })).toHaveAttribute(
		"href",
		"/jars"
	);
	expect(screen.getByRole("link", { name: "Create a jar" })).toHaveAttribute(
		"href",
		"/create"
	);
	expect(
		screen.queryByText(/No featured jar configured/)
	).not.toBeInTheDocument();
});
