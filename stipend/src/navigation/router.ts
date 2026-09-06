import { useSyncExternalStore } from "react";
function subscribe(listener: () => void) {
	window.addEventListener("popstate", listener);
	return () => window.removeEventListener("popstate", listener);
}
const current = () => window.location.pathname + window.location.search;
export function useLocation() {
	return useSyncExternalStore(subscribe, current, current);
}
export function navigate(path: string) {
	const url = new URL(path, window.location.origin);
	if (url.origin !== window.location.origin)
		throw new Error("Navigation must stay within this app.");
	window.history.pushState(null, "", url);
	window.dispatchEvent(new PopStateEvent("popstate"));
	window.scrollTo({ top: 0, behavior: "instant" });
}
const router = {
	push: navigate,
	replace: (path: string) => {
		window.history.replaceState(null, "", path);
		window.dispatchEvent(new PopStateEvent("popstate"));
	},
	back: () => window.history.back(),
};
export function useRouter() {
	return router;
}
export function usePathname() {
	return useLocation().split("?")[0];
}
export function useSearchParams() {
	return new URLSearchParams(useLocation().split("?")[1] || "");
}
export function useParams() {
	return { address: usePathname().split("/")[2] };
}
