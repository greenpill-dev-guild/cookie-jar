"use client";

import { Globe2 } from "lucide-react";
import { getNetworkName } from "@/lib/blockchain/networks";

interface ChainDisplayProps {
	chainId: number;
}

export function ChainDisplay({ chainId }: ChainDisplayProps) {
	return (
		<div className="flex h-12 w-full items-center gap-3 rounded-xl border border-[hsl(var(--cj-input-border))] bg-[hsl(var(--cj-nav-bg))] px-4 text-left">
			<div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--cj-warm-white))]">
				<Globe2 className="h-4 w-4 text-[hsl(var(--cj-medium-brown))]" />
			</div>
			<div className="min-w-0 leading-tight">
				<span className="text-[11px] uppercase tracking-wide text-[hsl(var(--cj-light-brown))]">
					Network
				</span>
				<p className="text-sm font-semibold text-[hsl(var(--cj-dark-brown))] truncate">
					{getNetworkName(chainId)}
				</p>
			</div>
		</div>
	);
}
