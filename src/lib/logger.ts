/**
 * Logging Utility
 * Centralized logging with environment-based filtering
 * 
 * - In production: Only errors are logged
 * - In development: All logs are shown
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log info messages (development only)
   */
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log error messages (always)
   */
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, ...args);
    
    // In production, you could send to error tracking service
    // if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(new Error(message), { extra: args });
    // }
  },

  /**
   * Log debug messages (development only)
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
