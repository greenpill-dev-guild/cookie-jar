"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useAccount, useChainId } from "wagmi"
import { isV2Chain } from "@/config/supported-networks"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react"
import { ProtocolErrorBoundary } from "@/components/design/protocol-error-boundary"
import { useJarCreation } from "@/hooks/useJarCreation"
import { useStepNavigation } from "@/hooks/useStepNavigation"
import { StepContent } from "@/components/create/StepContent"
import { StatusCards } from "@/components/create/StatusCards"
import { CreateJarModals } from "@/components/create/CreateJarModals"

export default function CreateCookieJarForm() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const isV2Contract = isV2Chain(chainId)
  
  // All form state and logic moved to custom hook
  const formData = useJarCreation()
  
  // Step navigation moved to custom hook
  const { currentStep, totalSteps, nextStep, prevStep } = useStepNavigation(isV2Contract)
  
  // Modal state (keep minimal state in main component)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState(false)
  
  // Check if current step is valid
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.validateStep1().isValid
      case 2:
        return formData.validateStep2().isValid
      case 3:
        // Skip validation for step 3 on v1 chains
        return isV2Contract ? formData.validateStep3().isValid : true
      case 4:
        return formData.validateStep4().isValid
      default:
        return false
    }
  }
  
  // Auto-retry jar creation when wallet connects
  useEffect(() => {
    if (isConnected && address && pendingSubmission && showWalletModal) {
      setShowWalletModal(false)
      setPendingSubmission(false)
      // Retry the submission
      setTimeout(() => {
        formData.confirmSubmit()
      }, 100) // Small delay to ensure modal closes first
    }
  }, [isConnected, address, pendingSubmission, showWalletModal, formData])
  
  // Handle wallet connection modal trigger
  const handleSubmit = () => {
    if (!isConnected) {
      setShowWalletModal(true)
      setPendingSubmission(true)
      return
    }
    formData.confirmSubmit()
  }

  return (
    <ProtocolErrorBoundary protocolName="Cookie Jar Creation" maxRetries={2} showDetails={process.env.NODE_ENV === 'development'}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--cj-dark-brown))]">Create Cookie Jar</h1>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isV2Contract 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {isV2Contract ? '🚀 v2 Contract' : '📦 v1 Contract'}
            </div>
          </div>
          <p className="text-[hsl(var(--cj-medium-brown))]">
            Set up your new cookie jar
            {!isV2Contract && (
              <span className="ml-2 text-sm text-orange-600">
                • Allowlist access only
              </span>
            )}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[hsl(var(--cj-medium-brown))]">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-[hsl(var(--cj-medium-brown))]">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-[hsl(var(--cj-brand-orange))] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {currentStep === 1 && "Basic Configuration"}
              {currentStep === 2 && "Withdrawal Settings"}
              {currentStep === 3 && isV2Contract && "Access Control"}
              {currentStep === 4 && "Final Settings & Review"}
              {!isV2Contract && currentStep === 4 && (
                <div className="flex items-center gap-2">
                  Final Settings & Review
                  <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    v1 - Allowlist Only
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <StepContent 
              step={currentStep} 
              formData={formData} 
              isV2Contract={isV2Contract} 
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-3 md:flex-row md:justify-between">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="w-full md:w-auto flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            )}

            <div className={`w-full md:w-auto ${currentStep === 1 ? 'md:ml-auto' : ''}`}>
              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  disabled={!isCurrentStepValid()}
                  className="w-full md:w-auto cj-btn-primary flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={(!isCurrentStepValid() && isConnected) || formData.isCreating || formData.isWaitingForTx}
                  className="w-full md:w-auto cj-btn-primary flex items-center justify-center gap-2"
                >
                  {formData.isCreating || formData.isWaitingForTx ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : !isConnected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Connect Wallet to Create
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Create Jar
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        <StatusCards 
          newJarPreview={formData.newJarPreview}
          formErrors={formData.formErrors}
          isFormError={formData.isFormError}
          ETH_ADDRESS={formData.ETH_ADDRESS}
        />
      </div>

      <CreateJarModals 
        showWalletModal={showWalletModal}
        setShowWalletModal={setShowWalletModal}
        setPendingSubmission={setPendingSubmission}
        isCreating={formData.isCreating}
        isWaitingForTx={formData.isWaitingForTx}
      />
    </ProtocolErrorBoundary>
  )
}
