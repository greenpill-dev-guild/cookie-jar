"use client";

export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  
  // Context information
  component?: string;
  action?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  
  // Error categorization
  type: 'javascript' | 'network' | 'transaction' | 'validation' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  
  // Environment
  environment: 'development' | 'production' | 'staging';
  version?: string;
  buildHash?: string;
  
  // Performance context
  performanceMetrics?: {
    memoryUsage?: number;
    connectionType?: string;
    timeFromLoad?: number;
  };
  
  // User interaction context
  userActions?: Array<{
    type: string;
    timestamp: number;
    element?: string;
    data?: any;
  }>;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  userId?: string;
  sessionId: string;
  version?: string;
  maxReports: number;
  reportingInterval: number; // in ms
  enableUserActionTracking: boolean;
  enablePerformanceContext: boolean;
  enableConsoleCapture: boolean;
  customTags?: Record<string, string>;
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private reportQueue: ErrorReport[] = [];
  private userActions: ErrorReport['userActions'] = [];
  private sessionId: string;
  private reportingTimer?: NodeJS.Timeout;
  private maxUserActions = 10;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.sessionId = this.generateSessionId();
    
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      maxReports: 50,
      reportingInterval: 5000, // 5 seconds
      enableUserActionTracking: true,
      enablePerformanceContext: true,
      enableConsoleCapture: false,
      sessionId: this.sessionId,
      ...config,
    };

    if (this.config.enabled && typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up user action tracking
    if (this.config.enableUserActionTracking) {
      this.setupUserActionTracking();
    }
    
    // Set up console capture
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture();
    }
    
    // Start reporting timer
    this.startReportingTimer();
    
    // Set up beforeunload handler
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private setupGlobalErrorHandlers() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message || 'Unknown JavaScript error',
        stack: event.error?.stack,
        type: 'javascript',
        severity: 'high',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        type: 'javascript',
        severity: 'high',
        metadata: {
          reason: event.reason,
        },
      });
    });
  }

  private setupUserActionTracking() {
    const trackAction = (type: string, element?: Element, data?: any) => {
      this.userActions.push({
        type,
        timestamp: Date.now(),
        element: element ? this.getElementSelector(element) : undefined,
        data,
      });

      // Keep only last N actions
      if (this.userActions.length > this.maxUserActions) {
        this.userActions.shift();
      }
    };

    // Track clicks
    document.addEventListener('click', (event) => {
      trackAction('click', event.target as Element, {
        coordinates: { x: event.clientX, y: event.clientY },
      });
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      trackAction('navigation', undefined, {
        url: window.location.href,
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      trackAction('form_submit', event.target as Element);
    });
  }

  private setupConsoleCapture() {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      originalError.apply(console, args);
      this.captureError({
        message: `Console Error: ${args.join(' ')}`,
        type: 'javascript',
        severity: 'medium',
        category: 'console',
      });
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.captureError({
        message: `Console Warning: ${args.join(' ')}`,
        type: 'javascript',
        severity: 'low',
        category: 'console',
      });
    };
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPerformanceContext(): ErrorReport['performanceMetrics'] {
    if (!this.config.enablePerformanceContext) return undefined;

    const context: ErrorReport['performanceMetrics'] = {};

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      context.memoryUsage = memory.usedJSHeapSize;
    }

    // Connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      context.connectionType = connection?.effectiveType;
    }

    // Time since page load
    context.timeFromLoad = performance.now();

    return context;
  }

  public captureError(errorData: Partial<ErrorReport>) {
    if (!this.config.enabled) return;

    const report: ErrorReport = {
      id: this.generateReportId(),
      timestamp: Date.now(),
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      type: errorData.type || 'javascript',
      severity: errorData.severity || 'medium',
      category: errorData.category,
      environment: process.env.NODE_ENV as any || 'development',
      version: this.config.version,
      component: errorData.component,
      action: errorData.action,
      props: errorData.props,
      state: errorData.state,
      performanceMetrics: this.getPerformanceContext(),
      userActions: [...this.userActions],
      metadata: {
        ...errorData.metadata,
        ...this.config.customTags,
      },
    };

    // Add to queue
    this.reportQueue.push(report);

    // If queue is full or severity is critical, flush immediately
    if (this.reportQueue.length >= this.config.maxReports || errorData.severity === 'critical') {
      this.flush();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Captured');
      console.error('Message:', report.message);
      console.error('Type:', report.type);
      console.error('Severity:', report.severity);
      console.error('Full Report:', report);
      console.groupEnd();
    }
  }

  public captureMessage(message: string, severity: ErrorReport['severity'] = 'low', metadata?: Record<string, any>) {
    this.captureError({
      message,
      severity,
      type: 'javascript',
      metadata,
    });
  }

  public captureTransaction(transactionData: {
    hash?: string;
    error: Error;
    context?: Record<string, any>;
  }) {
    this.captureError({
      message: `Transaction failed: ${transactionData.error.message}`,
      stack: transactionData.error.stack,
      type: 'transaction',
      severity: 'high',
      metadata: {
        transactionHash: transactionData.hash,
        context: transactionData.context,
      },
    });
  }

  public captureValidation(validationData: {
    field: string;
    value: any;
    error: string;
    component?: string;
  }) {
    this.captureError({
      message: `Validation error in ${validationData.field}: ${validationData.error}`,
      type: 'validation',
      severity: 'low',
      component: validationData.component,
      metadata: {
        field: validationData.field,
        value: validationData.value,
        validationError: validationData.error,
      },
    });
  }

  public capturePerformance(performanceData: {
    metric: string;
    value: number;
    threshold: number;
    context?: Record<string, any>;
  }) {
    if (performanceData.value <= performanceData.threshold) return;

    this.captureError({
      message: `Performance issue: ${performanceData.metric} (${performanceData.value}) exceeds threshold (${performanceData.threshold})`,
      type: 'performance',
      severity: 'medium',
      metadata: {
        metric: performanceData.metric,
        value: performanceData.value,
        threshold: performanceData.threshold,
        context: performanceData.context,
      },
    });
  }

  public setUser(userId: string) {
    this.config.userId = userId;
  }

  public setCustomTag(key: string, value: string) {
    if (!this.config.customTags) {
      this.config.customTags = {};
    }
    this.config.customTags[key] = value;
  }

  private startReportingTimer() {
    this.reportingTimer = setInterval(() => {
      if (this.reportQueue.length > 0) {
        this.flush();
      }
    }, this.config.reportingInterval);
  }

  private async flush() {
    if (this.reportQueue.length === 0 || !this.config.endpoint) return;

    const reports = [...this.reportQueue];
    this.reportQueue = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({ reports }),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Failed to send error reports: ${response.status}`);
      }
    } catch (error) {
      // Silently fail to avoid recursive error reporting
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send error reports:', error);
      }
      
      // Re-queue reports if they failed to send
      this.reportQueue = [...reports, ...this.reportQueue];
    }
  }

  public destroy() {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    this.flush();
  }
}

// Global error reporting instance
let errorReporter: ErrorReportingService | null = null;

export function initializeErrorReporting(config?: Partial<ErrorReportingConfig>) {
  if (typeof window === 'undefined') return null;

  if (!errorReporter) {
    errorReporter = new ErrorReportingService(config);
  }

  return errorReporter;
}

export function getErrorReporter(): ErrorReportingService | null {
  return errorReporter;
}

// Convenience functions
export function captureError(error: Error, context?: {
  component?: string;
  action?: string;
  props?: Record<string, any>;
  severity?: ErrorReport['severity'];
}) {
  errorReporter?.captureError({
    message: error.message,
    stack: error.stack,
    component: context?.component,
    action: context?.action,
    props: context?.props,
    severity: context?.severity || 'high',
  });
}

export function captureMessage(message: string, severity: ErrorReport['severity'] = 'low') {
  errorReporter?.captureMessage(message, severity);
}

export function captureTransaction(hash: string | undefined, error: Error, context?: Record<string, any>) {
  errorReporter?.captureTransaction({ hash, error, context });
}

// React hook for error reporting
export function useErrorReporter() {
  const captureComponentError = React.useCallback((error: Error, component: string, action?: string, props?: Record<string, any>) => {
    captureError(error, { component, action, props });
  }, []);

  return {
    captureError: captureComponentError,
    captureMessage,
    captureTransaction,
    setUser: (userId: string) => errorReporter?.setUser(userId),
    setCustomTag: (key: string, value: string) => errorReporter?.setCustomTag(key, value),
  };
}
