import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import { ProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});
it("refreshes jar data before retrying a failed child render", async () => {
	vi.useFakeTimers();
	vi.spyOn(console, "error").mockImplementation(() => {});
	let failed = true;
	function Content() {
		if (failed) throw new Error("Controlled render failure");
		return <p>Jar recovered</p>;
	}
	const refetch = vi.fn(() => {
		failed = false;
	});
	render(
		<ProtocolErrorBoundary
			protocolName="Green Goods Stipend Jar"
			onRetry={refetch}
		>
			<Content />
		</ProtocolErrorBoundary>
	);
	expect(
		screen.getByRole("heading", { name: "Green Goods Stipend Jar Error" })
	).toBeVisible();
	fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
	expect(refetch).toHaveBeenCalledTimes(1);
	await act(async () => {
		vi.advanceTimersByTime(1000);
	});
	expect(screen.getByText("Jar recovered")).toBeVisible();
});
it("the route error page exposes the failure and invokes reset", () => {
	const reset = vi.fn();
	render(
		<ErrorPage error={new Error("Controlled route failure")} reset={reset} />
	);
	expect(
		screen.getByRole("heading", { level: 1, name: "Something went wrong" })
	).toBeVisible();
	expect(screen.getByText("Controlled route failure")).toBeVisible();
	fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	expect(reset).toHaveBeenCalledTimes(1);
});
