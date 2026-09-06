"use client";

import Link from "@/navigation/AppLink";
import { Footer } from "@/components/app/footer";
import { JarPageContent } from "@/components/jar/JarPageContent";
import { Button } from "@/components/ui/button";
import { useFeaturedJar } from "@/hooks/jar/useFeaturedJar";

export default function Home() {
	const featured = useFeaturedJar();

	return (
		<div className="flex min-h-screen flex-col">
			{featured.address ? (
				<JarPageContent
					address={featured.address}
					chainId={featured.chainId}
					fromBlock={featured.fromBlock}
					featured
				/>
			) : featured.isLoading ? (
				<div className="flex justify-center items-center min-h-[40vh]">
					<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
				</div>
			) : (
				<div className="container max-w-2xl mx-auto mt-12 p-8 rounded-2xl bg-card border border-border text-center space-y-4">
					<h1>No featured jar configured</h1>
					<p className="text-muted-foreground">
						The stipend jar has not been selected yet. You can browse the jars
						on this network.
					</p>
					{featured.error && (
						<p className="text-sm text-destructive">{featured.error.message}</p>
					)}
					<Button asChild>
						<Link href="/jars">Browse all jars</Link>
					</Button>
				</div>
			)}
			<Footer />
		</div>
	);
}
