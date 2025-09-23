interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  isV2Contract?: boolean;
}

export function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  isV2Contract = true 
}: ProgressIndicatorProps) {
  // Normalize step number for progress calculation
  // For v1 contracts: step 4 should be treated as step 3 for progress purposes
  const normalizedStep = !isV2Contract && currentStep === 4 ? 3 : 
                        !isV2Contract && currentStep > 2 ? currentStep - 1 : 
                        currentStep;
  
  const progressPercentage = Math.min(100, Math.round((normalizedStep / totalSteps) * 100));
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[hsl(var(--cj-medium-brown))]">
          Step {normalizedStep} of {totalSteps}
        </span>
        <span className="text-sm text-[hsl(var(--cj-medium-brown))]">
          {progressPercentage}% complete
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-[hsl(var(--cj-brand-orange))] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
