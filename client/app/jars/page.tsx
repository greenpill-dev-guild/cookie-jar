"use client";
import { lazy, Suspense } from "react";
import { useAccount } from "wagmi";
import { JarGridSkeleton } from "@/components/jars/JarSkeleton";

// Lazy load the heavy jar content component
const JarContentLazy = lazy(() =>
	import("@/components/jars/JarContentLazy").then((module) => ({
		default: module.JarContentLazy,
	}))
);

export default function CookieJarPage() {
	const { address: userAddress } = useAccount();

	return (
		<>
			<h1 className="text-2xl font-bold mb-6">All jars</h1>
			<Suspense fallback={<JarGridSkeleton />}>
				<JarContentLazy userAddress={userAddress} />
			</Suspense>
		</>
	);
}
