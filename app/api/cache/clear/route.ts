import { NextRequest, NextResponse } from 'next/server';
import { studiesCache, enrichmentCache, translationCache } from '@/lib/cache/simple-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys, type } = body;
    
    if (keys && Array.isArray(keys)) {
      // Clear specific keys
      keys.forEach(key => {
        studiesCache.delete(key);
        enrichmentCache.delete(key);
        translationCache.delete(key);
      });
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${keys.length} cache entries`,
        keys
      });
    }
    
    if (type) {
      // Clear specific cache type
      switch (type) {
        case 'studies':
          studiesCache.clear();
          break;
        case 'enrichment':
          enrichmentCache.clear();
          break;
        case 'translation':
          translationCache.clear();
          break;
        case 'all':
          studiesCache.clear();
          enrichmentCache.clear();
          translationCache.clear();
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid cache type' },
            { status: 400 }
          );
      }
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${type} cache`
      });
    }
    
    // Clear all caches if no specific request
    studiesCache.clear();
    enrichmentCache.clear();
    translationCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cleared all caches'
    });
    
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
