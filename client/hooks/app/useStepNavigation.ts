'use client';

import { useCallback, useState } from 'react';

/**
 * Return type for useStepNavigation hook
 */
interface StepNavigationReturn {
  /** Current step number (1-based) */
  currentStep: number;
  /** Total number of steps in the flow */
  totalSteps: number;
  /** Move to the next step */
  nextStep: () => void;
  /** Move to the previous step */
  prevStep: () => void;
  /** Set a specific step number */
  setCurrentStep: (step: number) => void;
}

/**
 * Custom hook for managing multi-step form navigation
 *
 * Provides step navigation logic with automatic handling of v1/v2 contract
 * differences. V1 contracts skip the access control step (step 3) since
 * they don't support advanced access control features.
 *
 * @param isV2Contract - Whether the current contract is v2 (supports all steps)
 * @returns Object with current step, navigation functions, and metadata
 *
 * @example
 * ```tsx
 * const { currentStep, nextStep, prevStep, totalSteps } = useStepNavigation(isV2);
 *
 * return (
 *   <div>
 *     Step {currentStep} of {totalSteps}
 *     <button onClick={prevStep}>Back</button>
 *     <button onClick={nextStep}>Next</button>
 *   </div>
 * );
 * ```
 */
export const useStepNavigation = (
  isV2Contract: boolean
): StepNavigationReturn => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = isV2Contract ? 4 : 3; // Skip access control for v1

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      let nextStepNumber = currentStep + 1;

      // For v1 chains, skip step 3 (access control) - jump from step 2 to step 4
      if (!isV2Contract && currentStep === 2) {
        nextStepNumber = 4; // Skip access control step
      }

      setCurrentStep(nextStepNumber);
    }
  }, [currentStep, totalSteps, isV2Contract]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      let prevStepNumber = currentStep - 1;

      // For v1 chains, skip step 3 (access control) - jump from step 4 to step 2
      if (!isV2Contract && currentStep === 4) {
        prevStepNumber = 2; // Skip access control step
      }

      setCurrentStep(prevStepNumber);
    }
  }, [currentStep, isV2Contract]);

  return {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    setCurrentStep,
  };
};
