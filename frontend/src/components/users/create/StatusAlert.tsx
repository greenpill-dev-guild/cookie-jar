// src/components/CookieJar/StatusAlert.tsx
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface StatusAlertProps {
  isSubmitted: boolean;
  txConfirmed: boolean;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  isSubmitted,
  txConfirmed
}) => {
  if (isSubmitted && !txConfirmed) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <AlertTitle>Transaction Submitted</AlertTitle>
        <AlertDescription>
          Your transaction has been submitted. Waiting for confirmation...
        </AlertDescription>
      </Alert>
    );
  }

  if (txConfirmed) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertTitle>Cookie Jar Created!</AlertTitle>
        <AlertDescription>
          Your cookie jar has been created successfully.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};