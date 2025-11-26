/**
 * Failure Pattern Detection Module
 * Tracks failure patterns per supplement and generates alerts for repeated failures
 */

import { logStructured } from './structured-logger';

interface FailureRecord {
  supplementName: string;
  timestamp: number;
}

interface FailurePattern {
  supplementName: string;
  failureCount: number;
  firstFailureAt: number;
  lastFailureAt: number;
}

// Time window for tracking failures (1 minute = 60000ms)
const FAILURE_WINDOW_MS = 60 * 1000;

// Threshold for generating alerts (>5 failures in 1 minute)
const FAILURE_THRESHOLD = 5;

// In-memory storage for failure records
const failureRecords: FailureRecord[] = [];

/**
 * Record a failure for a supplement
 * Automatically cleans up old records outside the time window
 */
export function recordFailure(supplementName: string): void {
  const now = Date.now();
  
  // Add the new failure record
  failureRecords.push({
    supplementName,
    timestamp: now,
  });
  
  // Clean up old records outside the time window
  cleanupOldFailures(now);
  
  // Check if this supplement has exceeded the failure threshold
  const pattern = detectFailurePattern(supplementName, now);
  
  if (pattern && pattern.failureCount > FAILURE_THRESHOLD) {
    generateAlert(pattern);
  }
}

/**
 * Clean up failure records older than the time window
 */
function cleanupOldFailures(currentTime: number): void {
  const cutoffTime = currentTime - FAILURE_WINDOW_MS;
  
  // Remove records older than the cutoff time
  let i = 0;
  while (i < failureRecords.length) {
    if (failureRecords[i].timestamp < cutoffTime) {
      failureRecords.splice(i, 1);
    } else {
      i++;
    }
  }
}

/**
 * Detect failure pattern for a specific supplement
 * Returns the pattern if failures exceed threshold, otherwise undefined
 */
export function detectFailurePattern(
  supplementName: string,
  currentTime: number = Date.now()
): FailurePattern | undefined {
  const cutoffTime = currentTime - FAILURE_WINDOW_MS;
  
  // Filter failures for this supplement within the time window
  const recentFailures = failureRecords.filter(
    record => 
      record.supplementName === supplementName &&
      record.timestamp >= cutoffTime
  );
  
  if (recentFailures.length === 0) {
    return undefined;
  }
  
  // Calculate pattern details
  const timestamps = recentFailures.map(r => r.timestamp);
  const firstFailureAt = Math.min(...timestamps);
  const lastFailureAt = Math.max(...timestamps);
  
  return {
    supplementName,
    failureCount: recentFailures.length,
    firstFailureAt,
    lastFailureAt,
  };
}

/**
 * Generate an alert for a detected failure pattern
 */
function generateAlert(pattern: FailurePattern): void {
  const timeWindowSeconds = Math.floor(FAILURE_WINDOW_MS / 1000);
  
  logStructured('error', 'REPEATED_FAILURE_ALERT', {
    supplementName: pattern.supplementName,
    failureCount: pattern.failureCount,
    timeWindowSeconds,
    firstFailureAt: new Date(pattern.firstFailureAt).toISOString(),
    lastFailureAt: new Date(pattern.lastFailureAt).toISOString(),
    threshold: FAILURE_THRESHOLD,
    message: `Detected ${pattern.failureCount} failures for "${pattern.supplementName}" in ${timeWindowSeconds} seconds (threshold: ${FAILURE_THRESHOLD})`,
  });
}

/**
 * Get current failure count for a supplement within the time window
 */
export function getFailureCount(
  supplementName: string,
  currentTime: number = Date.now()
): number {
  const cutoffTime = currentTime - FAILURE_WINDOW_MS;
  
  return failureRecords.filter(
    record => 
      record.supplementName === supplementName &&
      record.timestamp >= cutoffTime
  ).length;
}

/**
 * Clear all failure records (for testing purposes)
 */
export function clearFailureRecords(): void {
  failureRecords.length = 0;
}

/**
 * Get all failure records (for testing purposes)
 */
export function getAllFailureRecords(): FailureRecord[] {
  return [...failureRecords];
}

/**
 * Get the failure threshold constant (for testing purposes)
 */
export function getFailureThreshold(): number {
  return FAILURE_THRESHOLD;
}

/**
 * Get the failure window in milliseconds (for testing purposes)
 */
export function getFailureWindowMs(): number {
  return FAILURE_WINDOW_MS;
}
