import Link from "next/link";
import { Footer } from "@/components/app/footer";
import { Button } from "@/components/ui/button";
export default function Home() {
	return (
		<div className="flex min-h-screen flex-col">
			<section className="container max-w-3xl mx-auto px-4 py-16 space-y-6">
				<h1 className="text-4xl font-bold text-foreground">Cookie Jar</h1>
				<p className="text-lg text-muted-foreground">
					Create a shared funding pool with clear rules for claims, deposits and
					access.
				</p>
				<div className="flex flex-wrap gap-4">
					<Button asChild>
						<Link href="/jars">Browse jars</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/create">Create a jar</Link>
					</Button>
				</div>
			</section>
			<Footer />
		</div>
	);
}
