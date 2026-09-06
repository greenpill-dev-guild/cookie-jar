"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { useAccount } from "wagmi";
import { ProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";
import { WrongNetworkBanner } from "@/components/app/WrongNetworkBanner";
import { CreateJarForm } from "@/components/create/CreateJarForm";
import { CreateJarHeader } from "@/components/create/CreateJarHeader";
import {
	CreationReview,
	CreationSetup,
} from "@/components/create/CreationSetup";
import { ProgressIndicator } from "@/components/create/ProgressIndicator";
import { Button } from "@/components/ui/button";
import { useStepNavigation } from "@/hooks/app/useStepNavigation";
import { useJarCreation } from "@/hooks/jar/useJarCreation";

const StatusCards = lazy(() =>
	import("@/components/create/StatusCards").then((module) => ({
		default: module.StatusCards,
	}))
);
const CreateJarModals = lazy(() =>
	import("@/components/create/CreateJarModals").then((module) => ({
		default: module.CreateJarModals,
	}))
);

export default function CreateCookieJarForm() {
	const { isConnected } = useAccount();
	const creation = useJarCreation();
	const { chainId, isV2Contract } = creation;

	const {
		form,
		confirmSubmit,
		validateStep1,
		validateStep2,
		validateStep3,
		validateStep4,
		isCreating,
		isWaitingForTx,
		newJarPreview,
		formErrors,
		isFormError,
		ETH_ADDRESS,
	} = creation;

	const { currentStep, totalSteps, nextStep, prevStep } =
		useStepNavigation(isV2Contract);

	const [showWalletModal, setShowWalletModal] = useState(false);
	useEffect(() => {
		if (isConnected) setShowWalletModal(false);
	}, [isConnected]);

	const isCurrentStepValid = () => {
		switch (currentStep) {
			case 1:
				return validateStep1().isValid;
			case 2:
				return validateStep2().isValid;
			case 3:
				return isV2Contract ? validateStep3().isValid : true;
			case 4:
				return validateStep4().isValid;
			default:
				return false;
		}
	};

	const handleSubmit = () => {
		if (!isConnected) {
			setShowWalletModal(true);
			return;
		}
		confirmSubmit();
	};

	return (
		<ProtocolErrorBoundary
			protocolName="Cookie Jar Creation"
			maxRetries={2}
			showDetails={process.env.NODE_ENV === "development"}
		>
			<FormProvider {...form}>
				<div className="max-w-2xl mx-auto">
					<WrongNetworkBanner chainId={chainId} />
					<fieldset disabled={creation.busy} className="min-w-0">
						<CreationSetup
							creation={{
								...creation,
							}}
						/>
						<CreateJarHeader isV2Contract={isV2Contract} />
						<ProgressIndicator
							currentStep={currentStep}
							totalSteps={totalSteps}
							isV2Contract={isV2Contract}
						/>

						{currentStep === 4 && <CreationReview creation={creation} />}
						<CreateJarForm
							currentStep={currentStep}
							totalSteps={totalSteps}
							isV2Contract={isV2Contract}
							nextStep={nextStep}
							prevStep={prevStep}
							handleSubmit={handleSubmit}
							isCurrentStepValid={isCurrentStepValid}
							isCreating={isCreating}
							isWaitingForTx={isWaitingForTx}
						/>
					</fieldset>
					{creation.confirmationError && (
						<div
							role="alert"
							className="mt-4 rounded-lg border border-border bg-card p-4 space-y-2"
						>
							<p>{creation.confirmationError}</p>
							<p className="break-all text-sm">
								Transaction: {creation.submittedHash}
							</p>
							<Button onClick={() => creation.retryConfirmation()}>
								Retry confirmation check
							</Button>
						</div>
					)}
					<Suspense
						fallback={
							<div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
						}
					>
						<StatusCards
							newJarPreview={newJarPreview}
							formErrors={formErrors}
							isFormError={isFormError}
							ETH_ADDRESS={ETH_ADDRESS}
						/>
					</Suspense>
				</div>
			</FormProvider>

			<Suspense fallback={null}>
				<CreateJarModals
					showWalletModal={showWalletModal && !isConnected}
					setShowWalletModal={setShowWalletModal}
					isCreating={isCreating}
					isWaitingForTx={isWaitingForTx}
				/>
			</Suspense>
		</ProtocolErrorBoundary>
	);
}
