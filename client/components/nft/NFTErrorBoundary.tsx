"use client";

import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { log } from "@/lib/app/logger";

interface NFTErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
	errorId: string;
}

interface NFTErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<NFTErrorFallbackProps>;
	onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
	showDetails?: boolean;
	enableReporting?: boolean;
}

interface NFTErrorFallbackProps {
	error: Error;
	errorInfo: React.ErrorInfo;
	resetError: () => void;
	errorId: string;
	showDetails?: boolean;
}

// Default error fallback component
const DefaultNFTErrorFallback: React.FC<NFTErrorFallbackProps> = ({
	error,
	resetError,
	errorId,
	showDetails = false,
}) => {
	const [detailsVisible, setDetailsVisible] = React.useState(false);
	const [reportSent, setReportSent] = React.useState(false);

	const handleSendReport = async () => {
		try {
			// In a real implementation, this would send error reports to your error tracking service
			const errorReport = {
				errorId,
				message: error.message,
				stack: error.stack,
				userAgent: navigator.userAgent,
				url: window.location.href,
				timestamp: new Date().toISOString(),
				component: "NFT",
			};

			log.info("Error report", errorReport);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 500));

			setReportSent(true);
		} catch (reportError) {
			log.error("Failed to send error report", { error: reportError });
		}
	};

	const getErrorTitle = (error: Error) => {
		if (error.message.includes("network") || error.message.includes("fetch")) {
			return "Network Connection Problem";
		}
		if (error.message.includes("API") || error.message.includes("rate limit")) {
			return "API Service Issue";
		}
		if (error.message.includes("timeout")) {
			return "Request Timeout";
		}
		if (error.message.includes("parsing") || error.message.includes("JSON")) {
			return "Data Processing Error";
		}
		return "NFT Loading Error";
	};

	const getErrorSuggestion = (error: Error) => {
		if (error.message.includes("network") || error.message.includes("fetch")) {
			return "Please check your internet connection and try again.";
		}
		if (error.message.includes("API") || error.message.includes("rate limit")) {
			return "Our NFT services are experiencing high demand. Please try again in a moment.";
		}
		if (error.message.includes("timeout")) {
			return "The request took too long to complete. Please try again.";
		}
		if (error.message.includes("parsing") || error.message.includes("JSON")) {
			return "There was an issue processing the NFT data. Please refresh the page.";
		}
		return "We encountered an unexpected error while loading NFTs. Please try refreshing the page.";
	};

	return (
		<div className="flex items-center justify-center min-h-[200px] p-4">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0">
							<AlertTriangle className="h-8 w-8 text-red-500" />
						</div>
						<div>
							<CardTitle className="text-lg text-red-700">
								{getErrorTitle(error)}
							</CardTitle>
							<CardDescription className="text-sm text-muted-foreground">
								Error ID: {errorId}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					<Alert>
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>What happened?</AlertTitle>
						<AlertDescription>{getErrorSuggestion(error)}</AlertDescription>
					</Alert>

					<div className="flex flex-col gap-2">
						<Button onClick={resetError} className="w-full" variant="default">
							<RefreshCw className="h-4 w-4 mr-2" />
							Try Again
						</Button>

						<Button
							onClick={() => (window.location.href = "/")}
							variant="outline"
							className="w-full"
						>
							<Home className="h-4 w-4 mr-2" />
							Go to Home
						</Button>

						{showDetails && (
							<Button
								onClick={() => setDetailsVisible(!detailsVisible)}
								variant="ghost"
								className="w-full text-sm"
							>
								<Bug className="h-4 w-4 mr-2" />
								{detailsVisible ? "Hide" : "Show"} Technical Details
							</Button>
						)}
					</div>

					{detailsVisible && (
						<details className="mt-4">
							<summary className="font-medium text-sm cursor-pointer mb-2">
								Error Details
							</summary>
							<div className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">
								<div className="mb-2">
									<strong>Message:</strong> {error.message}
								</div>
								{error.stack && (
									<div>
										<strong>Stack Trace:</strong>
										<pre className="whitespace-pre-wrap text-xs mt-1">
											{error.stack}
										</pre>
									</div>
								)}
							</div>

							<div className="mt-3">
								{!reportSent ? (
									<Button
										onClick={handleSendReport}
										variant="outline"
										size="sm"
										className="w-full"
									>
										Send Error Report
									</Button>
								) : (
									<div className="text-center text-sm text-green-600">
										✓ Error report sent successfully
									</div>
								)}
							</div>
						</details>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export class NFTErrorBoundary extends React.Component<
	NFTErrorBoundaryProps,
	NFTErrorBoundaryState
> {
	constructor(props: NFTErrorBoundaryProps) {
		super(props);

		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorId: "",
		};
	}

	static getDerivedStateFromError(
		error: Error,
	): Partial<NFTErrorBoundaryState> {
		const errorId = `nft-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		return {
			hasError: true,
			error,
			errorId,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		const { onError } = this.props;
		const { errorId } = this.state;

		this.setState({
			error,
			errorInfo,
		});

		// Log error for development
		log.error("NFT Error Boundary caught error", {
			errorId,
			error: error.message,
			stack: error.stack,
			componentStack: errorInfo.componentStack,
		});

		// Call custom error handler if provided
		if (onError) {
			onError(error, errorInfo, errorId);
		}

		// Send error to monitoring service in production
		if (process.env.NODE_ENV === "production") {
			this.sendErrorToMonitoring(error, errorInfo, errorId);
		}
	}

	private async sendErrorToMonitoring(
		error: Error,
		errorInfo: React.ErrorInfo,
		errorId: string,
	) {
		try {
			// Example: Send to Sentry, LogRocket, or custom error service
			const errorPayload = {
				errorId,
				message: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack,
				userAgent: navigator.userAgent,
				url: window.location.href,
				timestamp: new Date().toISOString(),
				level: "error",
				tags: ["nft", "frontend", "react-error-boundary"],
			};

			// This would be replaced with your actual error reporting service
			log.info("Would send error to monitoring", errorPayload);

			// Example API call:
			// await fetch('/api/errors', {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify(errorPayload),
			// });
		} catch (reportingError) {
			log.error("Failed to send error to monitoring service", {
				error: reportingError,
			});
		}
	}

	resetError = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			errorId: "",
		});
	};

	render() {
		const { hasError, error, errorInfo, errorId } = this.state;
		const {
			children,
			fallback: CustomFallback,
			showDetails = false,
		} = this.props;

		if (hasError && error) {
			const FallbackComponent = CustomFallback || DefaultNFTErrorFallback;

			return (
				<FallbackComponent
					error={error}
					errorInfo={errorInfo!}
					resetError={this.resetError}
					errorId={errorId}
					showDetails={showDetails}
				/>
			);
		}

		return children;
	}
}

// Higher-order component for wrapping NFT components with error boundary
export function withNFTErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps?: Omit<NFTErrorBoundaryProps, "children">,
) {
	const WrappedComponent = (props: P) => (
		<NFTErrorBoundary {...errorBoundaryProps}>
			<Component {...props} />
		</NFTErrorBoundary>
	);

	WrappedComponent.displayName = `withNFTErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}

// Hook for handling NFT-specific errors
export function useNFTErrorHandler() {
	const [error, setError] = React.useState<Error | null>(null);

	const handleError = React.useCallback((error: Error) => {
		log.error("NFT Error", { error: error.message, stack: error.stack });
		setError(error);

		// Send to error tracking
		if (process.env.NODE_ENV === "production") {
			// This would integrate with your error tracking service
			log.info("Would send NFT error to tracking", { error: error.message });
		}
	}, []);

	const clearError = React.useCallback(() => {
		setError(null);
	}, []);

	const retryWithErrorHandling = React.useCallback(
		async <T,>(
			asyncFn: () => Promise<T>,
			fallback?: T,
		): Promise<T | undefined> => {
			try {
				clearError();
				return await asyncFn();
			} catch (error) {
				handleError(error as Error);
				return fallback;
			}
		},
		[handleError, clearError],
	);

	return {
		error,
		handleError,
		clearError,
		retryWithErrorHandling,
	};
}

// Custom error classes for different NFT error types
export class NFTNetworkError extends Error {
	constructor(
		message: string,
		public originalError?: Error,
	) {
		super(message);
		this.name = "NFTNetworkError";
	}
}

export class NFTAPIError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public originalError?: Error,
	) {
		super(message);
		this.name = "NFTAPIError";
	}
}

export class NFTParsingError extends Error {
	constructor(
		message: string,
		public data?: any,
	) {
		super(message);
		this.name = "NFTParsingError";
	}
}

export class NFTValidationError extends Error {
	constructor(
		message: string,
		public field?: string,
	) {
		super(message);
		this.name = "NFTValidationError";
	}
}
