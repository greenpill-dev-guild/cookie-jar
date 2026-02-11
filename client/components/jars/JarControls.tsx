"use client";

import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getNetworkName } from "@/lib/blockchain/networks";
import { ChainDisplay } from "./ChainDisplay";

const controlFieldClasses =
	"h-12 rounded-xl border border-[hsl(var(--cj-input-border))] bg-[hsl(var(--cj-nav-bg))] text-base text-[hsl(var(--cj-dark-brown))] placeholder:text-[hsl(var(--cj-medium-brown))] focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-0 focus-visible:border-[hsl(var(--primary))] transition-colors duration-200";

interface JarControlsProps {
	searchTerm: string;
	setSearchTerm: (term: string) => void;
	filterOption: string;
	setFilterOption: (option: string) => void;
	chainId: number;
	isRefreshing: boolean;
	onRefresh: () => void;
	totalJars: number;
	filteredCount: number;
	isConnected: boolean;
}

export function JarControls({
	searchTerm,
	setSearchTerm,
	filterOption,
	setFilterOption,
	chainId,
	isRefreshing,
	onRefresh,
	totalJars,
	filteredCount,
	isConnected,
}: JarControlsProps) {
	return (
		<div className="mb-6 rounded-2xl border border-border bg-[hsl(var(--cj-warm-white))] p-4 shadow-lg transition-none lg:p-6">
			{/* Top Row: Controls */}
			<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
				{/* Search */}
				<div className="relative w-full lg:flex-1">
					<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--cj-medium-brown))]" />
					<Input
						placeholder="Search jars..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className={`w-full pl-11 pr-4 ${controlFieldClasses}`}
					/>
				</div>

				{/* Chain Display */}
				<div className="w-full lg:w-auto">
					<ChainDisplay chainId={chainId} />
				</div>

				{/* Filter */}
				<Select value={filterOption} onValueChange={setFilterOption}>
					<SelectTrigger
						className={`w-full lg:w-52 ${controlFieldClasses} text-left font-medium`}
					>
						<SelectValue placeholder="Filter by access" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Jars</SelectItem>
					</SelectContent>
				</Select>

				{/* Refresh */}
				<Button
					variant="outline"
					onClick={onRefresh}
					disabled={isRefreshing}
					className="h-12 w-full whitespace-nowrap rounded-xl border border-[hsl(var(--cj-input-border))] bg-transparent text-[hsl(var(--cj-dark-brown))] transition-colors hover:bg-[hsl(var(--cj-nav-bg))] lg:w-auto"
				>
					<RefreshCw
						className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			{/* Bottom Row: Stats */}
			<div className="flex-between-safe border-t border-dashed border-[hsl(var(--border))] pt-4 text-responsive-sm text-[hsl(var(--cj-medium-brown))]">
				<div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-5">
					<span className="flex-shrink-0">
						Network:{" "}
						<strong className="text-[hsl(var(--cj-dark-brown))]">
							{getNetworkName(chainId)}
						</strong>
					</span>
					<span className="flex-shrink-0">
						Total:{" "}
						<strong className="text-[hsl(var(--cj-dark-brown))]">
							{totalJars}
						</strong>
					</span>
					{searchTerm && (
						<span className="flex-shrink-0">
							Filtered:{" "}
							<strong className="text-[hsl(var(--cj-dark-brown))]">
								{filteredCount}
							</strong>
						</span>
					)}
				</div>
				<div className="content-caption flex-shrink-0">
					{isConnected ? "Connected" : "Browse Mode"}
				</div>
			</div>
		</div>
	);
}
