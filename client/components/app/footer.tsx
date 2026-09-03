"use client";

import Link from "next/link";
import { FEATURED_JAR, SITE_NAME } from "@/config/featured-jar";
import { getExplorerAddressUrl, hasExplorer } from "@/lib/blockchain/networks";

export function Footer() {
	const explorerHref =
		FEATURED_JAR.address && hasExplorer(FEATURED_JAR.chainId)
			? getExplorerAddressUrl(FEATURED_JAR.address, FEATURED_JAR.chainId)
			: undefined;

	return (
		<footer className="mt-16 py-10 border-t border-border">
			<div className="container mx-auto px-4 md:px-6 lg:px-8">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div>
						<h2 className="text-lg font-semibold text-foreground mb-2">
							{SITE_NAME}
						</h2>
						<p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
							The Greenpill Dev Guild contributor stipend, paid from a Cookie
							Jar on Arbitrum and backed by work tracked and accepted on Linear.
						</p>
					</div>

					<div>
						<h3 className="text-sm font-semibold text-foreground mb-3">
							More jars
						</h3>
						<ul className="space-y-2 text-sm">
							<li>
								<Link
									href="/jars"
									className="text-muted-foreground hover:text-primary"
								>
									All jars on this network
								</Link>
							</li>
							<li>
								<Link
									href="/create"
									className="text-muted-foreground hover:text-primary"
								>
									Create a jar
								</Link>
							</li>
							<li>
								<Link
									href="/profile"
									className="text-muted-foreground hover:text-primary"
								>
									Your profile
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h3 className="text-sm font-semibold text-foreground mb-3">
							Resources
						</h3>
						<ul className="space-y-2 text-sm">
							<li>
								<a
									href="https://github.com/greenpill-dev-guild/.github/blob/main/routines/scoped-work-compensation.md"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary"
								>
									Stipend playbook
								</a>
							</li>
							{explorerHref && (
								<li>
									<a
										href={explorerHref}
										target="_blank"
										rel="noopener noreferrer"
										className="text-muted-foreground hover:text-primary"
									>
										Jar contract on the explorer
									</a>
								</li>
							)}
							<li>
								<a
									href="https://github.com/greenpill-dev-guild/cookie-jar"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary"
								>
									Source on GitHub
								</a>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
					<p>
						{new Date().getFullYear()} Greenpill Dev Guild. Built on the Cookie
						Jar protocol.
					</p>
					<p>Claims require a Linear link in the note.</p>
				</div>
			</div>
		</footer>
	);
}
