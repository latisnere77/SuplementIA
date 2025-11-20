/**
 * Cache Service integration
 */

import { config } from './config';
import { EnrichedContent } from './types';

/**
 * Save enriched content to cache (async, fire-and-forget)
 */
export async function saveToCacheAsync(
  supplementId: string,
  data: EnrichedContent
): Promise<void> {
  if (!config.cacheServiceUrl) {
    console.log('Cache service URL not configured, skipping cache save');
    return;
  }

  try {
    const url = `${config.cacheServiceUrl}/cache/${supplementId}`;

    console.log(
      JSON.stringify({
        operation: 'CacheSave',
        supplementId,
        url,
      })
    );

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(2000), // 2s timeout for cache save
    });

    if (!response.ok) {
      console.warn(`Failed to save to cache: ${response.status}`);
    } else {
      console.log(
        JSON.stringify({
          operation: 'CacheSaveSuccess',
          supplementId,
        })
      );
    }
  } catch (error: any) {
    // Don't throw - cache save is optional
    console.warn('Cache save error (non-fatal):', error.message);
  }
}

/**
 * Get enriched content from cache
 */
export async function getFromCache(
  supplementId: string
): Promise<EnrichedContent | null> {
  if (!config.cacheServiceUrl) {
    return null;
  }

  try {
    const url = `${config.cacheServiceUrl}/cache/${supplementId}`;

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(500), // 500ms timeout for cache read
    });

    if (response.status === 404) {
      return null; // Cache miss
    }

    if (!response.ok) {
      console.warn(`Failed to get from cache: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.success && data.data) {
      console.log(
        JSON.stringify({
          operation: 'CacheHit',
          supplementId,
          isStale: data.metadata?.isStale,
        })
      );

      // Return cached data even if stale (it's still useful)
      return data.data;
    }

    return null;
  } catch (error: any) {
    // Don't throw - cache read is optional
    console.warn('Cache read error (non-fatal):', error.message);
    return null;
  }
}
