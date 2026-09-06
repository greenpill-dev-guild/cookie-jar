import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JarContentLazy } from "@/components/jars/JarContentLazy";

const push = vi.hoisted(() => vi.fn());
vi.mock("@jar-core/hooks/jar/useJarFactory", () => ({
	useCookieJarFactory: () => ({
		cookieJarsData: [],
		isLoading: false,
		failedJars: [],
	}),
}));
vi.mock("wagmi", () => ({
	useAccount: () => ({ isConnected: false }),
	useChainId: () => 31337,
}));
vi.mock("@/config/supported-networks", () => ({
	getNativeCurrency: () => ({ symbol: "ETH" }),
}));
vi.mock("@/hooks/blockchain/useMultipleTokenSymbols", () => ({
	useMultipleTokenSymbols: () => ({}),
}));
vi.mock("@/components/jars/JarGrid", () => ({ JarGrid: () => null }));
vi.mock("@/components/jars/JarControls", () => ({ JarControls: () => null }));
vi.mock("@/navigation/router", () => ({ useRouter: () => ({ push }) }));
afterEach(cleanup);
it("explains an empty network with plain copy and a usable creation action", () => {
	render(<JarContentLazy />);
	expect(
		screen.getByRole("heading", { level: 2, name: "No jars yet" })
	).toBeVisible();
	expect(
		screen.queryByText(/🍪|Cookie Jars|Cookie Jar/)
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Create a jar" }));
	expect(push).toHaveBeenCalledWith("/create");
});
