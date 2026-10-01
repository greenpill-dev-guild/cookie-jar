import "@testing-library/jest-dom";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AppLink from "@/navigation/AppLink";
import { navigate, useLocation } from "@/navigation/router";

afterEach(cleanup);
function Location() {
	return <output>{useLocation()}</output>;
}
it("keeps chain-aware links and browser navigation in this app", () => {
	window.history.replaceState(null, "", "/");
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	render(
		<>
			<AppLink href="/jar/0x123?chainId=42161">Open jar</AppLink>
			<Location />
		</>
	);
	fireEvent.click(screen.getByRole("link", { name: "Open jar" }));
	expect(screen.getByRole("status")).toHaveTextContent(
		"/jar/0x123?chainId=42161"
	);
	act(() => {
		window.history.replaceState(null, "", "/jars");
		window.dispatchEvent(new PopStateEvent("popstate"));
	});
	expect(screen.getByRole("status")).toHaveTextContent("/jars");
	expect(() => navigate("https://elsewhere.example/create")).toThrow(
		"within this app"
	);
});
it("respects cancelled clicks and preserves native new-tab links", () => {
	render(
		<>
			<AppLink href="/create" onClick={(e) => e.preventDefault()}>
				Cancelled
			</AppLink>
			<AppLink href="/jars" target="_blank">
				New tab
			</AppLink>
		</>
	);
	const before = window.location.href;
	fireEvent.click(screen.getByRole("link", { name: "Cancelled" }));
	expect(window.location.href).toBe(before);
	expect(screen.getByRole("link", { name: "New tab" })).toHaveAttribute(
		"target",
		"_blank"
	);
});
