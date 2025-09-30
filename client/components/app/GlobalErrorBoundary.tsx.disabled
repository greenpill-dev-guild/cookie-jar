"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error | null;
    resetError: () => void;
    errorId: string;
  }>;
}

export class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    const errorId = `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.group(`🚨 Global Error Boundary Caught Error (${this.state.errorId})`);
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Component Stack:", errorInfo.componentStack);
    console.groupEnd();

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      this.sendErrorToMonitoring(error, errorInfo);
    }
  }

  private async sendErrorToMonitoring(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // In production, integrate with error monitoring service
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        type: 'global-boundary-error',
      };

      // Example integration points:
      // - Sentry: Sentry.captureException(error, { extra: errorReport })
      // - LogRocket: LogRocket.captureException(error)
      // - Custom API: fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) })
      
      console.log("Error report (would be sent to monitoring):", errorReport);
    } catch (reportingError) {
      console.error("Failed to send error to monitoring service:", reportingError);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: "",
    });
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback: CustomFallback } = this.props;

    if (hasError && error) {
      if (CustomFallback) {
        return <CustomFallback error={error} resetError={this.resetError} errorId={errorId} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                We apologize for the inconvenience. The application encountered an unexpected error.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Error ID:</strong> {errorId}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Details:</strong> {error.message}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.resetError} 
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Show technical details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {error.stack}
                </div>
              </details>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Hook for handling global errors
export function useGlobalErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const captureError = React.useCallback((error: Error, context?: string) => {
    console.error(`Global error${context ? ` in ${context}` : ''}:`, error);
    setError(error);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Integration point for error monitoring
      console.log('Would send global error to monitoring:', error, context);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    captureError,
    clearError,
  };
}
