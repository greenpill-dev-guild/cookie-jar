"use client";

import type { JarData } from "@jar-core/lib/jar/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NativeCurrency } from "@/config/supported-networks";
import { JarCard } from "./JarCard";

interface JarGridProps {
	chainId: number;
	jars: (JarData & { accessType?: number })[];
	nativeCurrency: NativeCurrency;
	tokenSymbols: Record<string, string>;
	onJarClick: (jarAddress: string) => void;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function JarGrid({
	chainId,
	jars,
	nativeCurrency,
	tokenSymbols,
	onJarClick,
	currentPage,
	totalPages,
	onPageChange,
}: JarGridProps) {
	if (jars.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-[hsl(var(--cj-medium-brown))]">
					No jars match your search criteria.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
				{jars.map((jar) => (
					<JarCard
						chainId={chainId}
						key={jar.jarAddress}
						jar={jar}
						nativeCurrency={nativeCurrency}
						tokenSymbols={tokenSymbols}
						onClick={onJarClick}
					/>
				))}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex justify-center items-center gap-2">
					<Button
						variant="outline"
						onClick={() => onPageChange(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					<span className="px-4 py-2 text-sm">
						Page {currentPage} of {totalPages}
					</span>

					<Button
						variant="outline"
						onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</>
	);
}
