"use client";

import { useParams, useSearchParams } from "next/navigation";
import { isAddress } from "viem";
import { JarPageContent } from "@/components/jar/JarPageContent";
import { FEATURED_JAR } from "@/config/featured-jar";
import { supportedChains } from "@/config/supported-networks";
import { resolveJarChainId } from "@/lib/jar/jar-location";

export default function CookieJarPage() {
	const params = useParams();
	const query = useSearchParams();
	const chainId = resolveJarChainId(
		query.get("chainId"),
		FEATURED_JAR.chainId,
		supportedChains.map((chain) => chain.id)
	);
	const address = params.address as string;

	if (typeof address !== "string" || !isAddress(address)) {
		return (
			<div className="container max-w-3xl mx-auto mt-8 p-6 bg-destructive/10 border border-destructive/40 rounded-lg">
				<h2 className="text-xl font-bold text-destructive mb-4">
					Invalid address
				</h2>
				<p className="text-foreground">
					No valid jar address was provided. Check the URL and try again.
				</p>
			</div>
		);
	}

	if (chainId === undefined)
		return (
			<div className="p-6">
				<h1 className="text-xl font-bold">Unsupported network</h1>
				<p>Use a supported network in the jar link.</p>
			</div>
		);
	return (
		<JarPageContent address={address as `0x${string}`} chainId={chainId} />
	);
}
