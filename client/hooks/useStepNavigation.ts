"use client"

import { useState, useCallback } from "react"

export const useStepNavigation = (isV2Contract: boolean) => {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = isV2Contract ? 4 : 3 // Skip access control for v1
  
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      let nextStepNumber = currentStep + 1
      
      // For v1 chains, skip step 3 (access control) - jump from step 2 to step 4
      if (!isV2Contract && currentStep === 2) {
        nextStepNumber = 4 // Skip access control step
      }
      
      setCurrentStep(nextStepNumber)
    }
  }, [currentStep, totalSteps, isV2Contract])
  
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      let prevStepNumber = currentStep - 1
      
      // For v1 chains, skip step 3 (access control) - jump from step 4 to step 2
      if (!isV2Contract && currentStep === 4) {
        prevStepNumber = 2 // Skip access control step
      }
      
      setCurrentStep(prevStepNumber)
    }
  }, [currentStep, isV2Contract])
  
  return {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    setCurrentStep
  }
}
