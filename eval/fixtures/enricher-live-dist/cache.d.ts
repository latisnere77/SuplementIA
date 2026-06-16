/**
 * DynamoDB Cache integration
 */
import { EnrichedContent, ExamineStyleContent, EnrichmentResponse } from './types';
type CacheMetadata = EnrichmentResponse['metadata'];
/**
 * Save enriched content to DynamoDB cache (async, fire-and-forget)
 */
export declare function saveToCacheAsync(supplementId: string, data: EnrichedContent | ExamineStyleContent, metadata?: CacheMetadata): Promise<void>;
/**
 * Get enriched content from DynamoDB cache
 * Returns both data AND metadata (including ranking)
 */
export declare function getFromCache(supplementId: string): Promise<{
    data: EnrichedContent | ExamineStyleContent;
    metadata?: CacheMetadata;
} | null>;
export {};
//# sourceMappingURL=cache.d.ts.map