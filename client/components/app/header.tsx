"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { BrandMark } from "@/components/app/BrandMark";
import { SITE_NAME } from "@/config/featured-jar";

export function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--cj-nav-bg))]/95 backdrop-blur border-b border-border">
			<div className="px-4 h-16 flex items-center justify-between gap-4">
				<Link href="/" className="flex items-center gap-3 min-w-0">
					<span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
						<BrandMark className="w-6 h-6" />
					</span>
					<span className="flex flex-col min-w-0 leading-tight">
						<span className="font-semibold text-foreground truncate">
							{SITE_NAME}
						</span>
						<span className="text-xs text-muted-foreground hidden sm:block">
							Monthly contributor stipend
						</span>
					</span>
				</Link>

				<ConnectButton showBalance={false} chainStatus="icon" label="Connect" />
			</div>
		</header>
	);
}
