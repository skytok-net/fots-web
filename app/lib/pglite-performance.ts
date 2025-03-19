/**
 * Performance monitoring utilities for PGlite operations
 */
import { PGlitePerformanceWarning } from './pglite-errors';

// Default performance thresholds in milliseconds
const DEFAULT_THRESHOLDS = {
  query: 200,
  migration: 1000,
  sync: 2000,
  initialization: 3000,
};

// Performance monitoring configuration
export interface PGlitePerformanceConfig {
  enabled: boolean;
  thresholds: {
    query: number;
    migration: number;
    sync: number;
    initialization: number;
  };
  onPerformanceWarning?: (warning: PGlitePerformanceWarning) => void;
  logToConsole: boolean;
}

// Global performance configuration
export const performanceConfig: PGlitePerformanceConfig = {
  enabled: true,
  thresholds: { ...DEFAULT_THRESHOLDS },
  logToConsole: true,
};

/**
 * Configure performance monitoring
 */
export function configurePGlitePerformance(config: Partial<PGlitePerformanceConfig>): void {
  Object.assign(performanceConfig, config);
}

/**
 * Measure the execution time of an async function
 */
export async function measurePerformance<T>(
  operationType: string,
  operation: () => Promise<T>,
  threshold?: number
): Promise<T> {
  if (!performanceConfig.enabled) {
    return operation();
  }

  const startTime = performance.now();
  
  try {
    return await operation();
  } finally {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Get the appropriate threshold based on operation type
    const operationThreshold = threshold ?? 
      (performanceConfig.thresholds as any)[operationType] ?? 
      DEFAULT_THRESHOLDS.query;
    
    // Check if the operation exceeded the threshold
    if (duration > operationThreshold) {
      const warning = new PGlitePerformanceWarning(
        `${operationType} took ${duration.toFixed(2)}ms (threshold: ${operationThreshold}ms)`,
        operationType,
        duration,
        operationThreshold
      );
      
      // Log to console if enabled
      if (performanceConfig.logToConsole) {
        console.warn(`[PGlite Performance] ${warning.message}`);
      }
      
      // Call the custom handler if provided
      if (performanceConfig.onPerformanceWarning) {
        performanceConfig.onPerformanceWarning(warning);
      }
    }
  }
}

/**
 * Create a wrapped version of a function with performance monitoring
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  operationType: string,
  fn: T,
  threshold?: number
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return measurePerformance(
      operationType,
      () => fn(...args),
      threshold
    );
  }) as T;
}
