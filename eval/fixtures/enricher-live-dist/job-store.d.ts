/**
 * Job Store Client for Content Enricher Lambda
 * Updates DynamoDB job store when enrichment completes
 */
export declare function updateJobWithResult(jobId: string, status: 'completed' | 'failed', data: {
    recommendation?: unknown;
    error?: string;
}): Promise<void>;
//# sourceMappingURL=job-store.d.ts.map