"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="container max-w-2xl mx-auto mt-16 p-8 rounded-2xl bg-card border border-border text-center space-y-4">
			<h1>Something went wrong</h1>
			<p className="text-muted-foreground break-words">{error.message}</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
