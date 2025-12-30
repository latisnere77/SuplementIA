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
  processing: 5 * 60 * 1000,  // 5 minutes (increased for Lambda enrichment time)
  completed: 10 * 60 * 1000,  // 10 minutes
  failed: 5 * 60 * 1000,      // 5 minutes
  timeout: 5 * 60 * 1000,     // 5 minutes
};

// DynamoDB configuration
const TABLE_NAME = 'suplementai-async-jobs';
const REGION = 'us-east-1';

// Maximum number of jobs to keep in store (for cleanup operations)
export const MAX_STORE_SIZE = 1000;

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: REGION,
  maxAttempts: 3, // Retry failed requests
});

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values
    convertEmptyValues: false,   // Don't convert empty strings to null
  },
});

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
export async function isExpired(jobId: string): Promise<boolean> {
  const job = await getJob(jobId);
  if (!job) return false;

  return Date.now() > job.expiresAt;
}

/**
 * Get the age of a job in milliseconds
 */
export async function getJobAge(jobId: string): Promise<number | undefined> {
  const job = await getJob(jobId);
  if (!job) return undefined;

  return Date.now() - job.createdAt;
}

/**
 * Clean up old jobs (called periodically)
 * Scans for expired jobs and deletes them
 */
export async function cleanupOldJobs(): Promise<void> {
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
}

/**
 * Clean up expired jobs from the store
 * Returns the number of jobs removed for metrics
 */
export async function cleanupExpired(): Promise<number> {
  // DynamoDB TTL will automatically delete expired items
  // This function is kept for API compatibility but doesn't need to do anything
  // TTL cleanup happens automatically within 48 hours of expiration
  return 0;
}

/**
 * Get the current size of the job store
 * Note: This is an expensive operation in DynamoDB, use sparingly
 */
export async function getStoreSize(): Promise<number> {
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
}

/**
 * Clear all jobs from the store (for testing purposes)
 * WARNING: This is a dangerous operation and should only be used in testing
 */
export async function clearStore(): Promise<void> {
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
}

/**
 * Get the oldest (least recently accessed) job from the store
 */
export async function getOldestJob(): Promise<{ jobId: string; job: Job } | undefined> {
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
}

/**
 * Enforce store size limit by removing oldest jobs when size exceeds MAX_STORE_SIZE
 * Returns the number of jobs evicted
 */
export async function enforceSizeLimit(): Promise<number> {
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
}

/**
 * Get job from DynamoDB
 */
export async function getJob(jobId: string): Promise<Job | undefined> {
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

    return response.Item as Job;
  } catch (error) {
    console.error('[JobStore] Error getting job:', error);
    return undefined;
  }
}

/**
 * Store job result in DynamoDB
 */
export async function storeJobResult(
  jobId: string,
  status: 'completed' | 'failed',
  data?: { recommendation?: unknown; error?: string }
): Promise<void> {
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
    throw error;
  }
}

/**
 * Create job in DynamoDB
 */
export async function createJob(jobId: string, retryCount: number = 0): Promise<void> {
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
    throw error;
  }
}

/**
 * Create a new job for a retry attempt
 * Generates a new job ID and increments retry count
 */
export async function createRetryJob(previousJobId: string): Promise<{ newJobId: string; retryCount: number }> {
  const previousJob = await getJob(previousJobId);
  const previousRetryCount = previousJob?.retryCount || 0;
  const newRetryCount = previousRetryCount + 1;

  // Generate new job ID
  const newJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Create new job with incremented retry count
  await createJob(newJobId, newRetryCount);

  return { newJobId, retryCount: newRetryCount };
}

/**
 * Check if a job has exceeded the retry limit
 */
export async function hasExceededRetryLimit(jobId: string, maxRetries: number = 5): Promise<boolean> {
  const job = await getJob(jobId);
  if (!job) return false;

  return (job.retryCount || 0) > maxRetries;
}

/**
 * Mark job as timed out
 */
export async function markTimeout(jobId: string): Promise<void> {
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
}
