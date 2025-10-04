import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StepContent } from './StepContent';

interface CreateJarFormProps {
  currentStep: number;
  totalSteps: number;
  isV2Contract: boolean;
  formData: any; // Type this based on your useJarCreation hook return type
  nextStep: () => void;
  prevStep: () => void;
  handleSubmit: () => void;
  isCurrentStepValid: () => boolean;
}

export function CreateJarForm({
  currentStep,
  totalSteps,
  isV2Contract,
  formData,
  nextStep,
  prevStep,
  handleSubmit,
  isCurrentStepValid,
}: CreateJarFormProps) {
  const { isConnected } = useAccount();

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Basic Configuration';
      case 2:
        return 'Withdrawal Settings';
      case 3:
        return isV2Contract ? 'Access Control' : '';
      case 4:
        if (!isV2Contract) {
          return (
            <div className="flex items-center gap-2">
              Final Settings & Review
              <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                v1 - Allowlist Only
              </span>
            </div>
          );
        }
        return 'Final Settings & Review';
      default:
        return '';
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{getStepTitle()}</CardTitle>
      </CardHeader>

      <CardContent>
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <StepContent
            step={currentStep}
            formData={formData}
            isV2Contract={isV2Contract}
          />
        </Suspense>
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

        <div
          className={`w-full md:w-auto ${currentStep === 1 ? 'md:ml-auto' : ''}`}
        >
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
              disabled={
                (!isCurrentStepValid() && isConnected) ||
                formData.isCreating ||
                formData.isWaitingForTx
              }
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
  );
}
