/**
 * Job Store for Async Enrichment
 * In-memory storage for job status (will be replaced with Redis/DB in production)
 */

export interface Job {
  status: 'processing' | 'completed' | 'failed';
  recommendation?: any;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

// In-memory job storage
const jobStore = new Map<string, Job>();

// Clean up old jobs on-demand (called during GET requests)
export function cleanupOldJobs() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, job] of jobStore.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobStore.delete(jobId);
    }
  }
}

// Get job from store
export function getJob(jobId: string): Job | undefined {
  return jobStore.get(jobId);
}

// Store job result
export function storeJobResult(
  jobId: string,
  status: 'completed' | 'failed',
  data?: { recommendation?: any; error?: string }
) {
  jobStore.set(jobId, {
    status,
    recommendation: data?.recommendation,
    error: data?.error,
    createdAt: jobStore.get(jobId)?.createdAt || Date.now(),
    completedAt: Date.now(),
  });
}

// Create job
export function createJob(jobId: string) {
  jobStore.set(jobId, {
    status: 'processing',
    createdAt: Date.now(),
  });
}
