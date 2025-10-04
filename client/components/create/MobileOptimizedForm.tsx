"use client";

import {
	AlertCircle,
	Check,
	ChevronLeft,
	ChevronRight,
	Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StepContent } from "./StepContent";

interface MobileOptimizedFormProps {
	currentStep: number;
	totalSteps: number;
	isV2Contract: boolean;
	formData: any;
	nextStep: () => void;
	prevStep: () => void;
	handleSubmit: () => void;
	isCurrentStepValid: () => boolean;
}

export function MobileOptimizedForm({
	currentStep,
	totalSteps,
	isV2Contract,
	formData,
	nextStep,
	prevStep,
	handleSubmit,
	isCurrentStepValid,
}: MobileOptimizedFormProps) {
	const { isConnected } = useAccount();
	const [isMobile, setIsMobile] = useState(false);
	const [keyboardVisible, setKeyboardVisible] = useState(false);

	// Detect mobile viewport
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Detect virtual keyboard on mobile
	useEffect(() => {
		if (!isMobile) return;

		const initialViewportHeight =
			window.visualViewport?.height || window.innerHeight;

		const handleViewportChange = () => {
			const currentHeight = window.visualViewport?.height || window.innerHeight;
			const heightDifference = initialViewportHeight - currentHeight;

			// If viewport height decreased by more than 150px, assume keyboard is visible
			setKeyboardVisible(heightDifference > 150);
		};

		if (window.visualViewport) {
			window.visualViewport.addEventListener("resize", handleViewportChange);
			return () =>
				window.visualViewport?.removeEventListener(
					"resize",
					handleViewportChange,
				);
		}
	}, [isMobile]);

	const getStepInfo = (step: number) => {
		switch (step) {
			case 1:
				return {
					title: "Basic Info",
					icon: "📝",
					description: "Name and settings",
				};
			case 2:
				return {
					title: "Withdrawals",
					icon: "💰",
					description: "How users can withdraw",
				};
			case 3:
				return isV2Contract
					? {
							title: "Access Control",
							icon: "🔐",
							description: "Who can access",
						}
					: { title: "Skip", icon: "⏭️", description: "Not available in v1" };
			case 4:
				return {
					title: "Review & Create",
					icon: "✅",
					description: "Confirm and deploy",
				};
			default:
				return { title: "Step", icon: "📄", description: "" };
		}
	};

	const progressPercentage = (currentStep / totalSteps) * 100;
	const stepInfo = getStepInfo(currentStep);

	return (
		<div className={`w-full ${isMobile ? "min-h-screen" : ""}`}>
			{/* Mobile Header */}
			{isMobile && (
				<div className="sticky top-0 z-40 bg-white border-b shadow-sm">
					<div className="flex items-center justify-between p-4">
						<div className="flex items-center gap-3">
							<Smartphone className="h-5 w-5 text-muted-foreground" />
							<div>
								<h1 className="text-lg font-semibold">Create Jar</h1>
								<p className="text-sm text-muted-foreground">
									{stepInfo.description}
								</p>
							</div>
						</div>
						<Badge variant="outline">
							{currentStep}/{totalSteps}
						</Badge>
					</div>

					{/* Progress Bar */}
					<div className="px-4 pb-3">
						<Progress value={progressPercentage} className="h-2" />
						<div className="flex justify-between text-xs text-muted-foreground mt-1">
							<span>{stepInfo.title}</span>
							<span>{Math.round(progressPercentage)}%</span>
						</div>
					</div>
				</div>
			)}

			{/* Main Content */}
			<div
				className={`${isMobile ? "p-4 pb-20" : ""} ${keyboardVisible ? "pb-4" : ""}`}
			>
				<Card
					className={`${isMobile ? "border-none shadow-none" : "shadow-lg"}`}
				>
					{!isMobile && (
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="text-xl flex items-center gap-2">
									<span className="text-2xl">{stepInfo.icon}</span>
									{stepInfo.title}
								</CardTitle>
								<Badge variant="outline">
									Step {currentStep} of {totalSteps}
								</Badge>
							</div>
							{!isMobile && (
								<Progress value={progressPercentage} className="h-2 mt-2" />
							)}
						</CardHeader>
					)}

					<CardContent className={isMobile ? "p-0" : ""}>
						{/* Mobile Step Header */}
						{isMobile && (
							<div className="mb-6 p-4 bg-muted/30 rounded-lg">
								<div className="flex items-center gap-3">
									<div className="text-3xl">{stepInfo.icon}</div>
									<div>
										<h2 className="text-xl font-semibold">{stepInfo.title}</h2>
										<p className="text-sm text-muted-foreground">
											{stepInfo.description}
										</p>
									</div>
								</div>
							</div>
						)}

						{/* Connection Warning for Mobile */}
						{isMobile && !isConnected && currentStep === totalSteps && (
							<Alert className="mb-4">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									You&apos;ll need to connect your wallet to create the jar.
								</AlertDescription>
							</Alert>
						)}

						{/* Step Content */}
						<div className={isMobile ? "" : "min-h-[400px]"}>
							<StepContent
								step={currentStep}
								formData={formData}
								isV2Contract={isV2Contract}
							/>
						</div>
					</CardContent>

					{!keyboardVisible && (
						<CardFooter
							className={`
                ${
									isMobile
										? "fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex-col gap-3"
										: "flex-row justify-between gap-3"
								}
              `}
						>
							<div className={`flex gap-3 ${isMobile ? "w-full" : ""}`}>
								{currentStep > 1 && (
									<Button
										variant="outline"
										onClick={prevStep}
										className={`${isMobile ? "flex-1" : ""} flex items-center justify-center gap-2`}
									>
										<ChevronLeft className="h-4 w-4" />
										{isMobile ? "Back" : "Previous"}
									</Button>
								)}

								{currentStep < totalSteps ? (
									<Button
										onClick={nextStep}
										disabled={!isCurrentStepValid()}
										className={`
                      ${isMobile ? "flex-1" : ""} 
                      ${currentStep === 1 && isMobile ? "w-full" : ""} 
                      flex items-center justify-center gap-2
                    `}
									>
										{isMobile ? "Next" : "Next Step"}
										<ChevronRight className="h-4 w-4" />
									</Button>
								) : (
									<Button
										onClick={handleSubmit}
										disabled={!isCurrentStepValid()}
										className={`
                      ${isMobile ? "flex-1" : ""} 
                      ${currentStep === 1 && isMobile ? "w-full" : ""} 
                      flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700
                    `}
									>
										<Check className="h-4 w-4" />
										Create Jar
									</Button>
								)}
							</div>

							{/* Mobile Step Indicator */}
							{isMobile && (
								<div className="flex justify-center gap-2 mt-2">
									{Array.from({ length: totalSteps }, (_, i) => (
										<div
											key={i}
											className={`
                        h-2 w-8 rounded-full transition-colors
                        ${i + 1 === currentStep ? "bg-primary" : ""}
                        ${i + 1 < currentStep ? "bg-green-500" : ""}
                        ${i + 1 > currentStep ? "bg-muted" : ""}
                      `}
										/>
									))}
								</div>
							)}
						</CardFooter>
					)}
				</Card>
			</div>

			{/* Mobile Safe Area for iOS */}
			{isMobile && !keyboardVisible && (
				<div className="h-16" /> // Additional space for mobile navigation
			)}
		</div>
	);
}

/**
 * Hook to detect mobile viewport and optimize form behavior
 */
export function useMobileFormOptimizations() {
	const [isMobile, setIsMobile] = useState(false);
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [orientation, setOrientation] = useState<"portrait" | "landscape">(
		"portrait",
	);

	useEffect(() => {
		const checkMobile = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);

			if (mobile) {
				setOrientation(
					window.innerWidth > window.innerHeight ? "landscape" : "portrait",
				);
			}
		};

		const handleKeyboard = () => {
			if (!isMobile) return;

			const viewportHeight =
				window.visualViewport?.height || window.innerHeight;
			const windowHeight = window.screen.height;

			setKeyboardVisible(viewportHeight < windowHeight * 0.75);
		};

		checkMobile();
		handleKeyboard();

		window.addEventListener("resize", checkMobile);
		window.addEventListener("resize", handleKeyboard);

		if (window.visualViewport) {
			window.visualViewport.addEventListener("resize", handleKeyboard);
		}

		return () => {
			window.removeEventListener("resize", checkMobile);
			window.removeEventListener("resize", handleKeyboard);
			if (window.visualViewport) {
				window.visualViewport.removeEventListener("resize", handleKeyboard);
			}
		};
	}, [isMobile]);

	return {
		isMobile,
		keyboardVisible,
		orientation,
		isPortrait: orientation === "portrait",
		isLandscape: orientation === "landscape",
	};
}
