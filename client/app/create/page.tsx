"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { useAccount, useChainId } from "wagmi";
import { ProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";
import { CreateJarForm } from "@/components/create/CreateJarForm";
import { CreateJarHeader } from "@/components/create/CreateJarHeader";
import { ProgressIndicator } from "@/components/create/ProgressIndicator";
import { isV2Chain } from "@/config/supported-networks";
import { useStepNavigation } from "@/hooks/app/useStepNavigation";
import { useJarCreation } from "@/hooks/jar/useJarCreation";

const StatusCards = lazy(() =>
	import("@/components/create/StatusCards").then((module) => ({
		default: module.StatusCards,
	})),
);
const CreateJarModals = lazy(() =>
	import("@/components/create/CreateJarModals").then((module) => ({
		default: module.CreateJarModals,
	})),
);

export default function CreateCookieJarForm() {
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const isV2Contract = isV2Chain(chainId);

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
	} = useJarCreation();

	const { currentStep, totalSteps, nextStep, prevStep } =
		useStepNavigation(isV2Contract);

	const [showWalletModal, setShowWalletModal] = useState(false);
	const [pendingSubmission, setPendingSubmission] = useState(false);

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

	// Auto-retry jar creation when wallet connects
	useEffect(() => {
		if (isConnected && address && pendingSubmission && showWalletModal) {
			setShowWalletModal(false);
			setPendingSubmission(false);
			setTimeout(() => {
				confirmSubmit();
			}, 100);
		}
	}, [isConnected, address, pendingSubmission, showWalletModal, confirmSubmit]);

	const handleSubmit = () => {
		if (!isConnected) {
			setShowWalletModal(true);
			setPendingSubmission(true);
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
					<CreateJarHeader isV2Contract={isV2Contract} />
					<ProgressIndicator
						currentStep={currentStep}
						totalSteps={totalSteps}
						isV2Contract={isV2Contract}
					/>

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
					showWalletModal={showWalletModal}
					setShowWalletModal={setShowWalletModal}
					setPendingSubmission={setPendingSubmission}
					isCreating={isCreating}
					isWaitingForTx={isWaitingForTx}
				/>
			</Suspense>
		</ProtocolErrorBoundary>
	);
}
