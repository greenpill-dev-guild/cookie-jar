"use client";

import React from "react";
import { useState, useEffect, lazy, Suspense } from "react";
import { useAccount, useChainId } from "wagmi";
import { isV2Chain } from "@/config/supported-networks";
import { Loader2 } from "lucide-react";
import { ProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";
import { useJarCreation } from "@/hooks/jar/useJarCreation";
import { useStepNavigation } from "@/hooks/app/useStepNavigation";

// Import extracted components
import { CreateJarHeader } from "@/components/create/CreateJarHeader";
import { ProgressIndicator } from "@/components/create/ProgressIndicator";
import { CreateJarForm } from "@/components/create/CreateJarForm";

// Lazy load heavy components for better bundle splitting
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

  // All form state and logic moved to custom hook
  const formData = useJarCreation();

  // Step navigation moved to custom hook
  const { currentStep, totalSteps, nextStep, prevStep } =
    useStepNavigation(isV2Contract);

  // Modal state (keep minimal state in main component)
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);

  // Check if current step is valid
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.validateStep1().isValid;
      case 2:
        return formData.validateStep2().isValid;
      case 3:
        // Skip validation for step 3 on v1 chains
        return isV2Contract ? formData.validateStep3().isValid : true;
      case 4:
        return formData.validateStep4().isValid;
      default:
        return false;
    }
  };

  // Auto-retry jar creation when wallet connects
  useEffect(() => {
    if (isConnected && address && pendingSubmission && showWalletModal) {
      setShowWalletModal(false);
      setPendingSubmission(false);
      // Retry the submission
      setTimeout(() => {
        formData.confirmSubmit();
      }, 100); // Small delay to ensure modal closes first
    }
  }, [isConnected, address, pendingSubmission, showWalletModal, formData]);

  // Handle wallet connection modal trigger
  const handleSubmit = () => {
    if (!isConnected) {
      setShowWalletModal(true);
      setPendingSubmission(true);
      return;
    }
    formData.confirmSubmit();
  };

  return (
    <ProtocolErrorBoundary
      protocolName="Cookie Jar Creation"
      maxRetries={2}
      showDetails={process.env.NODE_ENV === "development"}
    >
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
          formData={formData}
          nextStep={nextStep}
          prevStep={prevStep}
          handleSubmit={handleSubmit}
          isCurrentStepValid={isCurrentStepValid}
        />

        <Suspense
          fallback={
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          }
        >
          <StatusCards
            newJarPreview={formData.newJarPreview}
            formErrors={formData.formErrors}
            isFormError={formData.isFormError}
            ETH_ADDRESS={formData.ETH_ADDRESS}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <CreateJarModals
          showWalletModal={showWalletModal}
          setShowWalletModal={setShowWalletModal}
          setPendingSubmission={setPendingSubmission}
          isCreating={formData.isCreating}
          isWaitingForTx={formData.isWaitingForTx}
        />
      </Suspense>
    </ProtocolErrorBoundary>
  );
}
