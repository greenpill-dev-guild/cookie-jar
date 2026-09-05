"use client";

import { useParams } from "next/navigation";
import { isAddress } from "viem";
import { useChainId } from "wagmi";
import { JarPageContent } from "@/components/jar/JarPageContent";

export default function CookieJarPage() {
	const params = useParams();
	const chainId = useChainId();
	const address = params.address as string;

	if (typeof address !== "string" || !isAddress(address)) {
		return (
			<div className="container max-w-3xl mx-auto mt-8 p-6 bg-destructive/10 border border-destructive/40 rounded-lg">
				<h1 className="text-xl font-bold text-destructive mb-4">
					Invalid address
				</h1>
				<p className="text-foreground">
					No valid jar address was provided. Check the URL and try again.
				</p>
			</div>
		);
	}

	return (
		<JarPageContent address={address as `0x${string}`} chainId={chainId} />
	);
}
