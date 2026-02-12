import { AlertCircle, ExternalLink } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/app/utils";

export interface ProtocolConfigBaseProps {
	title: string;
	description: string;
	icon?: string | ReactNode;
	color?: string;
	validationError?: string | null;
	/** Stable ID applied to the error alert so inputs can reference it via aria-describedby */
	errorId?: string;
	isLoading?: boolean;
	className?: string;
	learnMoreUrl?: string;
	children: ReactNode;
}

export const ProtocolConfigBase: React.FC<ProtocolConfigBaseProps> = ({
	title,
	description,
	icon,
	color = "bg-gray-500",
	validationError,
	errorId,
	isLoading = false,
	className,
	learnMoreUrl,
	children,
}) => {
	return (
		<Card
			className={cn("border-l-4", className)}
			style={{ borderLeftColor: color.replace("bg-", "#") }}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{icon && (
							<div
								className={cn(
									"w-8 h-8 rounded-full flex items-center justify-center text-white",
									color,
								)}
							>
								{icon}
							</div>
						)}
						<div>
							<CardTitle className="text-lg font-semibold text-[#3c2a14]">
								{title}
							</CardTitle>
							<p className="text-sm text-[#8b7355] mt-1">{description}</p>
						</div>
					</div>
					{learnMoreUrl && (
						<a
							href={learnMoreUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
						>
							Learn More <ExternalLink className="h-3 w-3" />
						</a>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-4 border-t">
				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				) : (
					<>
						{validationError && (
							<Alert variant="destructive" className="mb-4" id={errorId} role="alert">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{validationError}</AlertDescription>
							</Alert>
						)}
						{children}
					</>
				)}
			</CardContent>
		</Card>
	);
};
