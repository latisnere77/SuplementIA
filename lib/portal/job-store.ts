/**
 * Job Store for Async Enrichment
 * DynamoDB-based storage for job status across serverless instances
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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

// DynamoDB configuration
const TABLE_NAME = 'suplementai-async-jobs';
const REGION = 'us-east-1';

// Maximum number of jobs to keep in store (for cleanup operations)
export const MAX_STORE_SIZE = 1000;

// Initialize DynamoDB client
// In serverless environments (Amplify), credentials come from the execution role
const dynamoClient = new DynamoDBClient({
  region: REGION,
  maxAttempts: 3, // Retry failed requests
  // Credentials will be automatically loaded from the execution environment
});

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values
    convertEmptyValues: false,   // Don't convert empty strings to null
  },
});

export function closeJobStoreClientsForTests(): void {
  dynamoClient.destroy();
}

const USE_MEMORY_STORE = process.env.NODE_ENV === 'test' || process.env.JOB_STORE_DRIVER === 'memory';
const memoryStore = new Map<string, Job>();

function updateMemoryStoreSize(): void {
  jobMetrics.updateStoreSize(memoryStore.size);
}

function evictMemoryJobsOverLimit(): number {
  let evictedCount = 0;

  while (memoryStore.size > MAX_STORE_SIZE) {
    let oldestJobId: string | undefined;
    let oldestAccessTime = Number.POSITIVE_INFINITY;

    for (const [jobId, job] of memoryStore.entries()) {
      if (job.lastAccessedAt < oldestAccessTime) {
        oldestJobId = jobId;
        oldestAccessTime = job.lastAccessedAt;
      }
    }

    if (!oldestJobId) break;
    memoryStore.delete(oldestJobId);
    evictedCount++;
  }

  if (evictedCount > 0) {
    jobMetrics.recordEviction(evictedCount);
  }

  return evictedCount;
}

function createMemoryJob(jobId: string, retryCount: number = 0): void {
  const now = Date.now();
  const expiresAt = calculateExpirationTime('processing', now);

  memoryStore.set(jobId, {
    status: 'processing',
    createdAt: now,
    expiresAt,
    lastAccessedAt: now,
    retryCount,
  });

  jobMetrics.recordJobCreated();
  evictMemoryJobsOverLimit();
  updateMemoryStoreSize();
}

/**
 * Calculate expiration time based on job status
 */
function calculateExpirationTime(status: Job['status'], createdAt: number, completedAt?: number): number {
  const baseTime = completedAt || createdAt;
  return baseTime + EXPIRATION_TIMES[status];
}

/**
 * Calculate TTL for DynamoDB (in seconds since epoch)
 * DynamoDB TTL expects seconds, not milliseconds
 */
function calculateTTL(expiresAt: number): number {
  return Math.floor(expiresAt / 1000);
}

/**
 * Check if a job has exceeded its expiration time
 */
export function isExpired(jobId: string) {
  if (USE_MEMORY_STORE) {
    const job = memoryStore.get(jobId);
    if (!job) return false;
    return Date.now() > job.expiresAt;
  }

  return (async (): Promise<boolean> => {
    const job = await getJob(jobId);
    if (!job) return false;

    return Date.now() > job.expiresAt;
  })();
}

/**
 * Get the age of a job in milliseconds
 */
export function getJobAge(jobId: string) {
  if (USE_MEMORY_STORE) {
    const job = memoryStore.get(jobId);
    if (!job) return undefined;
    return Date.now() - job.createdAt;
  }

  return (async (): Promise<number | undefined> => {
    const job = await getJob(jobId);
    if (!job) return undefined;

    return Date.now() - job.createdAt;
  })();
}

/**
 * Clean up old jobs (called periodically)
 * Scans for expired jobs and deletes them
 */
export function cleanupOldJobs() {
  if (USE_MEMORY_STORE) {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [jobId, job] of memoryStore.entries()) {
      if (job.createdAt < oneHourAgo) {
        memoryStore.delete(jobId);
      }
    }
    updateMemoryStoreSize();
    return;
  }

  return (async (): Promise<void> => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'createdAt < :oneHourAgo',
      ExpressionAttributeValues: {
        ':oneHourAgo': oneHourAgo,
      },
    }));

    if (response.Items) {
      for (const item of response.Items) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { jobId: item.jobId },
        }));
      }
    }
  } catch (error) {
    console.error('[JobStore] Error cleaning up old jobs:', error);
  }
  })();
}

/**
 * Clean up expired jobs from the store
 * Returns the number of jobs removed for metrics
 */
export function cleanupExpired() {
  if (USE_MEMORY_STORE) {
    const now = Date.now();
    let removedCount = 0;

    for (const [jobId, job] of memoryStore.entries()) {
      if (now > job.expiresAt) {
        memoryStore.delete(jobId);
        removedCount++;
      }
    }

    jobMetrics.recordCleanup(removedCount);
    updateMemoryStoreSize();
    return removedCount;
  }

  // DynamoDB TTL will automatically delete expired items.
  jobMetrics.recordCleanup(0);
  return 0;
}

/**
 * Get the current size of the job store
 * Note: This is an expensive operation in DynamoDB, use sparingly
 */
export function getStoreSize() {
  if (USE_MEMORY_STORE) {
    return memoryStore.size;
  }

  return (async (): Promise<number> => {
  try {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      Select: 'COUNT',
    }));
    return response.Count || 0;
  } catch (error) {
    console.error('[JobStore] Error getting store size:', error);
    return 0;
  }
  })();
}

/**
 * Clear all jobs from the store (for testing purposes)
 * WARNING: This is a dangerous operation and should only be used in testing
 */
export function clearStore() {
  if (USE_MEMORY_STORE) {
    memoryStore.clear();
    updateMemoryStoreSize();
    return;
  }

  return (async (): Promise<void> => {
  console.warn('[JobStore] clearStore called - scanning all items for deletion');

  try {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
    }));

    if (response.Items) {
      for (const item of response.Items) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { jobId: item.jobId },
        }));
      }
    }
  } catch (error) {
    console.error('[JobStore] Error clearing store:', error);
  }
  })();
}

/**
 * Get the oldest (least recently accessed) job from the store
 */
export function getOldestJob() {
  if (USE_MEMORY_STORE) {
    let oldest: { jobId: string; job: Job } | undefined;

    for (const [jobId, job] of memoryStore.entries()) {
      if (!oldest || job.lastAccessedAt < oldest.job.lastAccessedAt) {
        oldest = { jobId, job };
      }
    }

    return oldest;
  }

  return (async (): Promise<{ jobId: string; job: Job } | undefined> => {
  try {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
    }));

    if (!response.Items || response.Items.length === 0) {
      return undefined;
    }

    let oldestItem = response.Items[0];
    let oldestAccessTime = oldestItem.lastAccessedAt;

    for (const item of response.Items) {
      if (item.lastAccessedAt < oldestAccessTime) {
        oldestAccessTime = item.lastAccessedAt;
        oldestItem = item;
      }
    }

    return {
      jobId: oldestItem.jobId,
      job: oldestItem as Job,
    };
  } catch (error) {
    console.error('[JobStore] Error getting oldest job:', error);
    return undefined;
  }
  })();
}

/**
 * Enforce store size limit by removing oldest jobs when size exceeds MAX_STORE_SIZE
 * Returns the number of jobs evicted
 */
export function enforceSizeLimit() {
  if (USE_MEMORY_STORE) {
    const evictedCount = evictMemoryJobsOverLimit();
    updateMemoryStoreSize();
    return evictedCount;
  }

  return (async (): Promise<number> => {
  let evictedCount = 0;

  try {
    const size = await getStoreSize();

    while (size > MAX_STORE_SIZE) {
      const oldest = await getOldestJob();
      if (!oldest) break;

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { jobId: oldest.jobId },
      }));

      evictedCount++;
    }

    // Record eviction operations
    if (evictedCount > 0) {
      jobMetrics.recordEviction(evictedCount);
    }
  } catch (error) {
    console.error('[JobStore] Error enforcing size limit:', error);
  }

  return evictedCount;
  })();
}

/**
 * Get job from DynamoDB
 */
export function getJob(jobId: string) {
  if (USE_MEMORY_STORE) {
    const job = memoryStore.get(jobId);
    if (!job) return undefined;
    job.lastAccessedAt = Date.now();
    return job;
  }

  return (async (): Promise<Job | undefined> => {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { jobId },
    }));

    if (!response.Item) {
      return undefined;
    }

    // Update last accessed time
    const now = Date.now();
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...response.Item,
        lastAccessedAt: now,
      },
    }));

    // FIXED: Extract recommendation from result field for quiz-orchestrator compatibility
    const item = response.Item as Record<string, unknown>;

    // If data is stored in 'result' field (from quiz-orchestrator),
    // extract recommendation to top level for compatibility with Job interface
    if (item.result && typeof item.result === 'object') {
      const result = item.result as Record<string, unknown>;
      return {
        status: item.status,
        recommendation: result.recommendation || item.result,
        error: result.error || item.error,
        createdAt: item.timestamp || item.createdAt || now,
        expiresAt: item.expiresAt || (now + EXPIRATION_TIMES[item.status as Job['status']]),
        completedAt: item.completedAt,
        lastAccessedAt: now,
        retryCount: item.retryCount,
      } as Job;
    }

    return response.Item as Job;
  } catch (error) {
    console.error('[JobStore] Error getting job:', error);
    return undefined;
  }
  })();
}

/**
 * Store job result in DynamoDB
 */
export function storeJobResult(
  jobId: string,
  status: 'completed' | 'failed',
  data?: { recommendation?: unknown; error?: string }
) {
  if (USE_MEMORY_STORE) {
    const now = Date.now();
    const existingJob = memoryStore.get(jobId);
    const createdAt = existingJob?.createdAt || now;
    const expiresAt = calculateExpirationTime(status, createdAt, now);

    memoryStore.set(jobId, {
      status,
      recommendation: data?.recommendation,
      error: data?.error,
      createdAt,
      expiresAt,
      completedAt: now,
      lastAccessedAt: now,
      retryCount: existingJob?.retryCount || 0,
    });

    if (status === 'completed') {
      jobMetrics.recordJobCompleted();
    } else {
      jobMetrics.recordJobFailed();
    }
    updateMemoryStoreSize();
    return;
  }

  return (async (): Promise<void> => {
  // Development bypass: Skip DynamoDB if table doesn't exist (local dev)
  if (process.env.SKIP_JOB_STORE === 'true') {
    console.log('[JobStore] Skipping job result storage (SKIP_JOB_STORE=true)');
    return;
  }

  try {
    // Get existing job to preserve createdAt
    const existingJob = await getJob(jobId);
    const now = Date.now();
    const createdAt = existingJob?.createdAt || now;
    const expiresAt = calculateExpirationTime(status, createdAt, now);

    const job: Job & { jobId: string; ttl: number } = {
      jobId,
      status,
      recommendation: data?.recommendation,
      error: data?.error,
      createdAt,
      expiresAt,
      completedAt: now,
      lastAccessedAt: now,
      retryCount: existingJob?.retryCount || 0,
      ttl: calculateTTL(expiresAt), // TTL for auto-cleanup
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: job,
    }));

    // Record job completion or failure
    if (status === 'completed') {
      jobMetrics.recordJobCompleted();
    } else if (status === 'failed') {
      jobMetrics.recordJobFailed();
    }
  } catch (error) {
    console.error('[JobStore] Error storing job result:', error);
    // In development, log error but don't throw
    if (process.env.NODE_ENV === 'development') {
      console.warn('[JobStore] DynamoDB error in development - continuing without job storage');
      return;
    }
    throw error;
  }
  })();
}

/**
 * Create job in DynamoDB
 */
export function createJob(jobId: string, retryCount: number = 0) {
  if (USE_MEMORY_STORE) {
    createMemoryJob(jobId, retryCount);
    return;
  }

  return (async (): Promise<void> => {
  // Development bypass: Skip DynamoDB if table doesn't exist (local dev)
  if (process.env.SKIP_JOB_STORE === 'true') {
    console.log('[JobStore] Skipping job storage (SKIP_JOB_STORE=true)');
    return;
  }

  try {
    const now = Date.now();
    const expiresAt = calculateExpirationTime('processing', now);

    const job: Job & { jobId: string; ttl: number } = {
      jobId,
      status: 'processing',
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
      retryCount,
      ttl: calculateTTL(expiresAt), // TTL for auto-cleanup
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: job,
    }));

    // Record job creation
    jobMetrics.recordJobCreated();
  } catch (error) {
    console.error('[JobStore] Error creating job:', error);
    // In development, log error but don't throw
    if (process.env.NODE_ENV === 'development') {
      console.warn('[JobStore] DynamoDB error in development - continuing without job storage');
      return;
    }
    throw error;
  }
  })();
}

/**
 * Create a new job for a retry attempt
 * Generates a new job ID and increments retry count
 */
export function createRetryJob(previousJobId: string) {
  if (USE_MEMORY_STORE) {
    const previousJob = memoryStore.get(previousJobId);
    const previousRetryCount = previousJob?.retryCount || 0;
    const newRetryCount = previousRetryCount + 1;
    const newJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    createMemoryJob(newJobId, newRetryCount);

    return { newJobId, retryCount: newRetryCount };
  }

  return (async (): Promise<{ newJobId: string; retryCount: number }> => {
  const previousJob = await getJob(previousJobId);
  const previousRetryCount = previousJob?.retryCount || 0;
  const newRetryCount = previousRetryCount + 1;

  // Generate new job ID
  const newJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Create new job with incremented retry count
  await createJob(newJobId, newRetryCount);

  return { newJobId, retryCount: newRetryCount };
  })();
}

/**
 * Check if a job has exceeded the retry limit
 */
export function hasExceededRetryLimit(jobId: string, maxRetries: number = 5) {
  if (USE_MEMORY_STORE) {
    const job = memoryStore.get(jobId);
    if (!job) return false;
    return (job.retryCount || 0) > maxRetries;
  }

  return (async (): Promise<boolean> => {
    const job = await getJob(jobId);
    if (!job) return false;

    return (job.retryCount || 0) > maxRetries;
  })();
}

/**
 * Mark job as timed out
 */
export function markTimeout(jobId: string) {
  if (USE_MEMORY_STORE) {
    const existingJob = memoryStore.get(jobId);
    if (!existingJob) return;

    const now = Date.now();
    const expiresAt = calculateExpirationTime('timeout', existingJob.createdAt, now);

    memoryStore.set(jobId, {
      ...existingJob,
      status: 'timeout',
      completedAt: now,
      expiresAt,
      lastAccessedAt: now,
    });

    jobMetrics.recordJobTimedOut();
    updateMemoryStoreSize();
    return;
  }

  return (async (): Promise<void> => {
  try {
    const existingJob = await getJob(jobId);
    if (!existingJob) {
      return; // Job doesn't exist, nothing to mark
    }

    const now = Date.now();
    const expiresAt = calculateExpirationTime('timeout', existingJob.createdAt, now);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        jobId,
        ...existingJob,
        status: 'timeout',
        completedAt: now,
        expiresAt,
        lastAccessedAt: now,
        ttl: calculateTTL(expiresAt),
      },
    }));

    // Record job timeout
    jobMetrics.recordJobTimedOut();
  } catch (error) {
    console.error('[JobStore] Error marking timeout:', error);
    throw error;
  }
  })();
}
