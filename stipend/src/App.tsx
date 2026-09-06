import { lazy, Suspense } from "react";
import { usePathname } from "./navigation/router";
import Home from "./app/page";
import { Header } from "./components/app/header";
import { ThemeProvider } from "./components/app/ThemeProvider";
import { RainbowKitProviderWrapper } from "./components/wallet/RainbowKitProviderWrapper";
import { Toaster } from "./components/ui/toaster";
import { ProtocolErrorBoundary } from "./components/app/ProtocolErrorBoundary";
const Create = lazy(() => import("./app/create/page"));
const Jars = lazy(() => import("./app/jars/page"));
const Jar = lazy(() => import("./app/jar/[address]/page"));
const Profile = lazy(() => import("./app/profile/page"));
const NotFound = lazy(() => import("./app/not-found"));
export default function App() {
	const path = usePathname();
	const Page =
		path === "/"
			? Home
			: path === "/create"
				? Create
				: path === "/jars"
					? Jars
					: path === "/profile"
						? Profile
						: /^\/jar\/[^/]+$/.test(path)
							? Jar
							: NotFound;
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<RainbowKitProviderWrapper>
				<a href="#main" className="sr-only focus:not-sr-only">
					Skip to content
				</a>
				<Header />
				<main id="main" className="pt-16 pb-8">
					<div className="px-4 py-4 md:px-6 lg:px-8">
						<ProtocolErrorBoundary
							key={path}
							protocolName="Green Goods Stipend Jar"
						>
							<Suspense fallback={<p role="status">Loading…</p>}>
								<Page />
							</Suspense>
						</ProtocolErrorBoundary>
					</div>
				</main>
				<Toaster />
			</RainbowKitProviderWrapper>
		</ThemeProvider>
	);
}
