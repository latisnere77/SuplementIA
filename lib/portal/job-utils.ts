/**
 * Job Utilities
 * Helper functions for job management
 */

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
