/**
 * Centralized logging utility for the Cookie Jar application
 * 
 * Provides consistent logging with development/production environment awareness
 * and structured log formatting. Safe for SSR environments.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
}

// Create a no-op logger for SSR environments
const createNoOpLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  dev: () => {},
});

// Safe environment checks
const isSSR = typeof window === 'undefined';

class Logger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    if (isSSR) {
      // During SSR, set safe defaults
      this.isDevelopment = false;
      this.minLevel = LogLevel.WARN;
    } else {
      // Client-side initialization
      this.isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
      this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${levelStr} ${contextStr} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  debug(message: string, data?: any, context?: string): void {
    if (isSSR || !this.shouldLog(LogLevel.DEBUG) || typeof console === 'undefined') return;
    
    if (data) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context), data);
    } else {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, data?: any, context?: string): void {
    if (isSSR || !this.shouldLog(LogLevel.INFO) || typeof console === 'undefined') return;
    
    if (data) {
      console.log(this.formatMessage(LogLevel.INFO, message, context), data);
    } else {
      console.log(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, data?: any, context?: string): void {
    if (isSSR || !this.shouldLog(LogLevel.WARN) || typeof console === 'undefined') return;
    
    if (data) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context), data);
    } else {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error | any, context?: string): void {
    if (isSSR || !this.shouldLog(LogLevel.ERROR) || typeof console === 'undefined') return;
    
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
    
    if (error) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Development-only logging - only shows in development mode
   */
  dev(message: string, data?: any, context?: string): void {
    if (isSSR || !this.isDevelopment || typeof console === 'undefined') return;
    console.log(`🔧 DEV ${context ? `[${context}]` : ''} ${message}`, data || '');
  }
}

// Export singleton instance - use no-op during SSR
export const logger = isSSR ? createNoOpLogger() : new Logger();

// Export convenience functions
export const { debug, info, warn, error, dev } = logger;
