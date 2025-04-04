import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  title: string;
  description?: string;
  errors?: Array<{ message?: string }>;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  title, 
  description, 
  errors 
}) => {
  return (
    <Alert variant="destructive" className="max-w-3xl mx-auto mt-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description ? (
          description
        ) : errors ? (
          <ul className="list-disc pl-5 mt-2">
            {errors.map((error, index) => (
              <li key={index}>{error?.message || "Unknown error"}</li>
            ))}
          </ul>
        ) : (
          "An error occurred."
        )}
      </AlertDescription>
    </Alert>
  );
};