/**
 * Job Store for Async Enrichment
 * In-memory storage for job status (will be replaced with Redis/DB in production)
 */

import { jobMetrics } from './job-metrics';

export interface Job {
  status: 'processing' | 'completed' | 'failed' | 'timeout';
  recommendation?: unknown;
  error?: string;
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
  lastAccessedAt: number;
  retryCount?: number;
}

// Expiration times in milliseconds
const EXPIRATION_TIMES = {
  processing: 2 * 60 * 1000,  // 2 minutes
  completed: 5 * 60 * 1000,   // 5 minutes
  failed: 2 * 60 * 1000,      // 2 minutes
  timeout: 2 * 60 * 1000,     // 2 minutes
};

// Maximum number of jobs to keep in store
export const MAX_STORE_SIZE = 1000;

// In-memory job storage
const jobStore = new Map<string, Job>();

/**
 * Calculate expiration time based on job status
 */
function calculateExpirationTime(status: Job['status'], createdAt: number, completedAt?: number): number {
  const baseTime = completedAt || createdAt;
  return baseTime + EXPIRATION_TIMES[status];
}

/**
 * Check if a job has exceeded its expiration time
 */
export function isExpired(jobId: string): boolean {
  const job = jobStore.get(jobId);
  if (!job) return false;

  return Date.now() > job.expiresAt;
}

/**
 * Get the age of a job in milliseconds
 */
export function getJobAge(jobId: string): number | undefined {
  const job = jobStore.get(jobId);
  if (!job) return undefined;

  return Date.now() - job.createdAt;
}

// Clean up old jobs on-demand (called during GET requests)
export function cleanupOldJobs() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of jobStore.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobStore.delete(jobId);
    }
  }
}

/**
 * Clean up expired jobs from the store
 * Returns the number of jobs removed for metrics
 */
export function cleanupExpired(): number {
  let removedCount = 0;

  for (const [jobId] of jobStore.entries()) {
    if (isExpired(jobId)) {
      jobStore.delete(jobId);
      removedCount++;
    }
  }

  // Record cleanup operation
  if (removedCount > 0) {
    jobMetrics.recordCleanup(removedCount);
  }

  // Update store size
  jobMetrics.updateStoreSize(jobStore.size);

  return removedCount;
}

/**
 * Get the current size of the job store
 */
export function getStoreSize(): number {
  return jobStore.size;
}

/**
 * Clear all jobs from the store (for testing purposes)
 */
export function clearStore(): void {
  jobStore.clear();
}

/**
 * Get the oldest (least recently accessed) job from the store
 */
export function getOldestJob(): { jobId: string; job: Job } | undefined {
  let oldestJobId: string | undefined;
  let oldestJob: Job | undefined;
  let oldestAccessTime = Infinity;

  for (const [jobId, job] of jobStore.entries()) {
    if (job.lastAccessedAt < oldestAccessTime) {
      oldestAccessTime = job.lastAccessedAt;
      oldestJobId = jobId;
      oldestJob = job;
    }
  }

  if (oldestJobId && oldestJob) {
    return { jobId: oldestJobId, job: oldestJob };
  }

  return undefined;
}

/**
 * Enforce store size limit by removing oldest jobs when size exceeds MAX_STORE_SIZE
 * Returns the number of jobs evicted
 */
export function enforceSizeLimit(): number {
  let evictedCount = 0;

  while (jobStore.size > MAX_STORE_SIZE) {
    const oldest = getOldestJob();
    if (!oldest) break;

    jobStore.delete(oldest.jobId);
    evictedCount++;
  }

  // Record eviction operations
  if (evictedCount > 0) {
    jobMetrics.recordEviction(evictedCount);
  }

  // Update store size
  jobMetrics.updateStoreSize(jobStore.size);

  return evictedCount;
}

// Get job from store
export function getJob(jobId: string): Job | undefined {
  const job = jobStore.get(jobId);
  if (job) {
    // Update last accessed time for LRU tracking
    job.lastAccessedAt = Date.now();
  }
  return job;
}

// Store job result
export function storeJobResult(
  jobId: string,
  status: 'completed' | 'failed',
  data?: { recommendation?: unknown; error?: string }
) {
  const existingJob = jobStore.get(jobId);
  const now = Date.now();
  const createdAt = existingJob?.createdAt || now;

  jobStore.set(jobId, {
    status,
    recommendation: data?.recommendation,
    error: data?.error,
    createdAt,
    expiresAt: calculateExpirationTime(status, createdAt, now),
    completedAt: now,
    lastAccessedAt: now,
    retryCount: existingJob?.retryCount || 0,
  });

  // Record job completion or failure
  if (status === 'completed') {
    jobMetrics.recordJobCompleted();
  } else if (status === 'failed') {
    jobMetrics.recordJobFailed();
  }

  // Update store size
  jobMetrics.updateStoreSize(jobStore.size);
}

// Create job
export function createJob(jobId: string, retryCount: number = 0) {
  const now = Date.now();
  jobStore.set(jobId, {
    status: 'processing',
    createdAt: now,
    expiresAt: calculateExpirationTime('processing', now),
    lastAccessedAt: now,
    retryCount,
  });

  // Record job creation
  jobMetrics.recordJobCreated();

  // Enforce size limit after adding new job
  if (jobStore.size > MAX_STORE_SIZE) {
    enforceSizeLimit();
  }

  // Update store size
  jobMetrics.updateStoreSize(jobStore.size);
}

/**
 * Create a new job for a retry attempt
 * Generates a new job ID and increments retry count
 */
export function createRetryJob(previousJobId: string): { newJobId: string; retryCount: number } {
  const previousJob = jobStore.get(previousJobId);
  const previousRetryCount = previousJob?.retryCount || 0;
  const newRetryCount = previousRetryCount + 1;

  // Generate new job ID
  const newJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Clear previous job state (optional - could also keep for debugging)
  // For now, we'll keep the previous job to allow tracking the retry chain

  // Create new job with incremented retry count
  createJob(newJobId, newRetryCount);

  return { newJobId, retryCount: newRetryCount };
}

/**
 * Check if a job has exceeded the retry limit
 */
export function hasExceededRetryLimit(jobId: string, maxRetries: number = 5): boolean {
  const job = jobStore.get(jobId);
  if (!job) return false;

  return (job.retryCount || 0) > maxRetries;
}

// Mark job as timed out
export function markTimeout(jobId: string): void {
  const existingJob = jobStore.get(jobId);
  if (!existingJob) {
    return; // Job doesn't exist, nothing to mark
  }

  const now = Date.now();
  jobStore.set(jobId, {
    ...existingJob,
    status: 'timeout',
    completedAt: now,
    expiresAt: calculateExpirationTime('timeout', existingJob.createdAt, now),
    lastAccessedAt: now,
  });

  // Record job timeout
  jobMetrics.recordJobTimedOut();

  // Update store size
  jobMetrics.updateStoreSize(jobStore.size);
}
