import { ChevronDown, Monitor, Smartphone, Users } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useResponsive } from "@/hooks/app/useResponsive";
import { cn } from "@/lib/app/utils";
import { NFTSelector } from "./NFTSelector";
import { ACCESS_CONTROL_DOC_LINKS } from "./doc-links";
import { HatsConfig } from "./protocols/HatsConfig";
import { HypercertConfig } from "./protocols/HypercertConfig";
import { POAPConfig } from "./protocols/POAPConfig";
import { UnlockConfig } from "./protocols/UnlockConfig";

export type AccessMethod =
	| "Allowlist"
	| "NFT"
	| "POAP"
	| "Hats"
	| "Hypercert"
	| "Unlock";

export interface ProtocolConfig {
	method: AccessMethod;
	// Method-specific config data
	[key: string]: any;
}

export interface ProtocolSelectorProps {
	onConfigChange: (config: ProtocolConfig) => void;
	initialConfig?: Partial<ProtocolConfig>;
	className?: string;
	forceMobile?: boolean;
	forceDesktop?: boolean;
	showViewToggle?: boolean;
	/** Restrict which methods are shown (defaults to all) */
	visibleMethods?: AccessMethod[];
	/** Highlight a method as recommended */
	recommendedMethod?: AccessMethod;
}

interface MethodDefinition {
	id: AccessMethod;
	name: string;
	icon: React.ReactNode;
	color: string;
	borderColor: string;
	badge: React.ReactNode;
	learnMoreUrl: string;
	description: string;
}

const ACCESS_METHODS: MethodDefinition[] = [
	{
		id: "Allowlist",
		name: "Allowlist",
		icon: <Users className="h-5 w-5" />,
		color: "bg-blue-500",
		borderColor: "border-l-blue-500",
		badge: <Badge className="bg-blue-100 text-blue-800">Simple</Badge>,
		learnMoreUrl: ACCESS_CONTROL_DOC_LINKS.allowlist,
		description: "Curate a specific list of wallet addresses",
	},
	{
		id: "NFT",
		name: "NFT Collection",
		icon: (
			<span className="text-lg" role="img" aria-label="shield">
				🛡️
			</span>
		),
		color: "bg-purple-500",
		borderColor: "border-l-purple-500",
		badge: <Badge className="bg-purple-100 text-purple-800">Flexible</Badge>,
		learnMoreUrl: ACCESS_CONTROL_DOC_LINKS.nft,
		description: "Gate access by NFT ownership",
	},
	{
		id: "POAP",
		name: "POAP",
		icon: (
			<span className="text-lg" role="img" aria-label="medal">
				🎖️
			</span>
		),
		color: "bg-purple-500",
		borderColor: "border-l-purple-500",
		badge: <Badge className="bg-purple-100 text-purple-800">Event</Badge>,
		learnMoreUrl: ACCESS_CONTROL_DOC_LINKS.poap,
		description: "Require a specific POAP event token",
	},
	{
		id: "Hats",
		name: "Hats Protocol",
		icon: (
			<span className="text-lg" role="img" aria-label="top hat">
				🎩
			</span>
		),
		color: "bg-yellow-500",
		borderColor: "border-l-yellow-500",
		badge: <Badge className="bg-yellow-100 text-yellow-800">Roles</Badge>,
		learnMoreUrl: ACCESS_CONTROL_DOC_LINKS.hats,
		description: "Gate by on-chain role via Hats Protocol",
	},
	{
		id: "Hypercert",
		name: "Hypercerts",
		icon: (
			<span className="text-lg" role="img" aria-label="trophy">
				🏆
			</span>
		),
		color: "bg-green-500",
		borderColor: "border-l-green-500",
		badge: <Badge className="bg-green-100 text-green-800">Impact</Badge>,
		learnMoreUrl: ACCESS_CONTROL_DOC_LINKS.hypercerts,
		description: "Require ownership of a Hypercert",
	},
	{
		id: "Unlock",
		name: "Unlock Protocol",
		icon: (
			<span className="text-lg" role="img" aria-label="unlocked">
				🔓
			</span>
		),
		color: "bg-blue-500",
		borderColor: "border-l-blue-500",
		badge: <Badge className="bg-blue-100 text-blue-800">Subscription</Badge>,
		learnMoreUrl: ACCESS_CONTROL_DOC_LINKS.unlock,
		description: "Gate by Unlock Protocol membership key",
	},
];

/**
 * Renders the appropriate protocol configuration component for a given method.
 * Uses the real protocol config components (POAPConfig, HatsConfig, etc.)
 * instead of basic input stubs.
 */
const ConfigurationPanel: React.FC<{
	method: AccessMethod;
	config?: any;
	onConfigChange: (config: any) => void;
}> = ({ method, config, onConfigChange }) => {
	switch (method) {
		case "Allowlist":
			return (
				<div data-testid="allowlist-config" className="py-2">
					<p className="text-sm text-[#8b7355]">
						No additional configuration needed. Access is determined by a
						separate allowlist management system after jar creation.
					</p>
				</div>
			);

		case "NFT":
			return (
				<div data-testid="nft-config">
					<NFTSelector
						onSelect={(nft) => onConfigChange({ nftGate: nft })}
						selectedNFT={config?.nftGates?.[0]}
						userCollectionOnly={false}
						maxHeight="300px"
						cardSize="sm"
					/>
				</div>
			);

		case "POAP":
			return (
				<POAPConfig onConfigChange={onConfigChange} initialConfig={config} />
			);

		case "Hats":
			return (
				<HatsConfig onConfigChange={onConfigChange} initialConfig={config} />
			);

		case "Hypercert":
			return (
				<HypercertConfig
					onConfigChange={onConfigChange}
					initialConfig={config}
				/>
			);

		case "Unlock":
			return (
				<UnlockConfig onConfigChange={onConfigChange} initialConfig={config} />
			);

		default:
			return null;
	}
};

export const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
	onConfigChange,
	initialConfig,
	className,
	forceMobile = false,
	forceDesktop = false,
	showViewToggle = false,
	visibleMethods,
	recommendedMethod,
}) => {
	const [selectedMethod, setSelectedMethod] = useState<AccessMethod>(
		initialConfig?.method || "Allowlist",
	);
	const [viewMode, setViewMode] = useState<"auto" | "mobile" | "desktop">(
		"auto",
	);

	const { isMobile } = useResponsive();

	const filteredMethods = useMemo(
		() =>
			visibleMethods
				? ACCESS_METHODS.filter((m) => visibleMethods.includes(m.id))
				: ACCESS_METHODS,
		[visibleMethods],
	);

	const onConfigChangeRef = useRef(onConfigChange);
	const initialConfigRef = useRef(initialConfig);
	const fallbackRef = useRef<AccessMethod | null>(null);

	useEffect(() => {
		onConfigChangeRef.current = onConfigChange;
	}, [onConfigChange]);

	useEffect(() => {
		initialConfigRef.current = initialConfig;
	}, [initialConfig]);

	useEffect(() => {
		if (filteredMethods.length === 0) return;
		if (filteredMethods.some((method) => method.id === selectedMethod)) {
			fallbackRef.current = null;
			return;
		}

		const fallbackMethod = filteredMethods[0].id;
		if (fallbackRef.current === fallbackMethod) return;
		fallbackRef.current = fallbackMethod;

		setSelectedMethod(fallbackMethod);
		onConfigChangeRef.current({
			...(initialConfigRef.current ?? {}),
			method: fallbackMethod,
		});
	}, [filteredMethods, selectedMethod]);

	// Determine actual view mode
	const actualViewMode =
		forceMobile || (viewMode === "auto" && isMobile) || viewMode === "mobile"
			? "mobile"
			: "desktop";

	const handleMethodSelect = useCallback(
		(method: AccessMethod) => {
			setSelectedMethod(method);
			onConfigChange({ ...initialConfig, method });
		},
		[onConfigChange, initialConfig],
	);

	const handleConfigUpdate = useCallback(
		(config: any) => {
			onConfigChange({
				method: selectedMethod,
				...config,
			});
		},
		[selectedMethod, onConfigChange],
	);

	const selectedMethodDef = ACCESS_METHODS.find(
		(m) => m.id === selectedMethod,
	);

	// ── Mobile View ──
	if (actualViewMode === "mobile") {
		return (
			<div className={cn("space-y-4", className)}>
				{showViewToggle && !forceMobile && (
					<div className="flex justify-end">
						<Tabs
							value={viewMode}
							onValueChange={(value) =>
								setViewMode(value as "auto" | "mobile" | "desktop")
							}
							className="w-fit"
						>
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="auto" className="text-xs">
									Auto
								</TabsTrigger>
								<TabsTrigger value="mobile" className="text-xs">
									<Smartphone className="h-3 w-3" />
								</TabsTrigger>
								<TabsTrigger value="desktop" className="text-xs">
									<Monitor className="h-3 w-3" />
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				)}

				{/* Mobile: Compact Selection Grid */}
				<div>
					<h3 className="font-medium text-sm mb-3">Choose Access Method</h3>
					<div className="grid grid-cols-3 gap-2">
						{filteredMethods.map((method) => (
							<Button
								key={method.id}
								variant={selectedMethod === method.id ? "default" : "outline"}
								onClick={() => handleMethodSelect(method.id)}
								className={cn(
									"flex flex-col items-center gap-1 h-16 p-2 text-xs transition-all",
									selectedMethod === method.id &&
										"bg-[#ff5e14] border-[#ff5e14] text-white hover:bg-[#e5531b]",
								)}
							>
								<span className="text-base">{method.icon}</span>
								<span className="text-[10px] leading-tight text-center">
									{method.name}
								</span>
							</Button>
						))}
					</div>
				</div>

				{/* Mobile: Configuration Accordion */}
				{selectedMethod && selectedMethodDef && (
					<Accordion type="single" collapsible defaultValue={selectedMethod}>
						<AccordionItem value={selectedMethod}>
							<Card
								className={cn("border-l-4", selectedMethodDef.borderColor)}
							>
								<AccordionTrigger asChild>
									<CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
										<div className="flex items-center justify-between w-full">
											<div className="flex items-center gap-3">
												<div
													className={cn(
														"w-6 h-6 rounded flex items-center justify-center text-white text-sm",
														selectedMethodDef.color,
													)}
												>
													{selectedMethodDef.icon}
												</div>
												<div className="text-left flex-1">
													<h4 className="font-medium text-[#3c2a14] text-sm">
														Configure {selectedMethodDef.name}
													</h4>
													<p className="text-xs text-[#8b7355]">
														{selectedMethodDef.description}
													</p>
												</div>
												<a
													href={selectedMethodDef.learnMoreUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="text-xs text-[#ff5e14] hover:text-[#e5531b] underline"
													onClick={(e) => e.stopPropagation()}
												>
													Learn More
												</a>
											</div>
										</div>
									</CardHeader>
								</AccordionTrigger>

								<AccordionContent>
									<CardContent className="pt-0 border-t">
										<div className="pt-4">
											<ConfigurationPanel
												method={selectedMethod}
												config={initialConfig}
												onConfigChange={handleConfigUpdate}
											/>
										</div>
									</CardContent>
								</AccordionContent>
							</Card>
						</AccordionItem>
					</Accordion>
				)}
			</div>
		);
	}

	// ── Desktop View ──
	return (
		<div className={cn("space-y-6", className)}>
			{/* Header with optional view toggle */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-[#3c2a14]">
						Access Control Method
					</h2>
					<p className="text-sm text-[#8b7355] mt-1">
						Choose how users will prove eligibility to access this jar
					</p>
				</div>
				{showViewToggle && !forceDesktop && (
					<Tabs
						value={viewMode}
						onValueChange={(value) =>
							setViewMode(value as "auto" | "mobile" | "desktop")
						}
						className="w-fit"
					>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="auto" className="text-xs">
								Auto
							</TabsTrigger>
							<TabsTrigger value="mobile" className="text-xs">
								<Smartphone className="h-3 w-3" />
							</TabsTrigger>
							<TabsTrigger value="desktop" className="text-xs">
								<Monitor className="h-3 w-3" />
							</TabsTrigger>
						</TabsList>
					</Tabs>
				)}
			</div>

			{/* Method Selection Grid */}
			<div
				data-testid="method-grid"
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
			>
				{filteredMethods.map((method) => (
					<Card
						key={method.id}
						data-testid={`method-${method.id.toLowerCase()}`}
						role="button"
						tabIndex={0}
						aria-pressed={selectedMethod === method.id}
						className={cn(
							"cursor-pointer transition-all duration-200 hover:shadow-lg",
							selectedMethod === method.id
								? "ring-2 ring-[#ff5e14] bg-orange-50"
								: "hover:shadow-md",
						)}
						onClick={() => handleMethodSelect(method.id)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								handleMethodSelect(method.id);
							}
						}}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className={cn("p-2 rounded-lg text-white", method.color)}>
									{method.icon}
								</div>
								<div className="flex items-center gap-2">
									{recommendedMethod === method.id && (
										<Badge className="bg-[#ff5e14] text-white text-xs">
											Recommended
										</Badge>
									)}
									{method.badge}
								</div>
							</div>
							<CardTitle className="text-lg font-semibold mt-2 text-[#3c2a14]">
								{method.name}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-[#8b7355] mb-2">
								{method.description}
							</p>
							<div className="flex justify-between items-center">
								{selectedMethod === method.id ? (
									<span className="text-xs text-[#ff5e14] font-medium flex items-center gap-1">
										<ChevronDown className="h-3 w-3" />
										Configure below
									</span>
								) : (
									<span className="text-xs text-[#8b7355]">
										Click to select
									</span>
								)}
								<a
									href={method.learnMoreUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-[#ff5e14] hover:text-[#e5531b] underline"
									onClick={(e) => e.stopPropagation()}
								>
									Learn More
								</a>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Inline Configuration Panel — visually connected to selected card */}
			{selectedMethodDef && (
				<Card
					data-testid="config-panel"
					className={cn(
						"border-l-4 transition-all duration-200",
						selectedMethodDef.borderColor,
					)}
				>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3">
							<div
								className={cn(
									"w-8 h-8 rounded-lg flex items-center justify-center text-white",
									selectedMethodDef.color,
								)}
							>
								{selectedMethodDef.icon}
							</div>
							<div>
								<CardTitle className="text-lg text-[#3c2a14]">
									Configure {selectedMethodDef.name}
								</CardTitle>
								<p className="text-sm text-[#8b7355]">
									{selectedMethodDef.description}
								</p>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<ConfigurationPanel
							method={selectedMethod}
							config={initialConfig}
							onConfigChange={handleConfigUpdate}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default ProtocolSelector;
