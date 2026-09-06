import Link from "@/navigation/AppLink";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="container max-w-2xl mx-auto mt-16 p-8 rounded-2xl bg-card border border-border text-center space-y-4">
			<h1>Page not found</h1>
			<p className="text-muted-foreground">
				That page does not exist. The stipend jar lives on the home page.
			</p>
			<Button asChild>
				<Link href="/">Back to the jar</Link>
			</Button>
		</div>
	);
}
