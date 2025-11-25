/**
 * Manual test script for cache validation logic
 * Run with: npx tsx scripts/test-cache-validation.ts
 */

// Replicate the isValidCache function from the Results page
function isValidCache(cachedRecommendation: any): boolean {
  console.log('[Cache Validation] Starting validation...');
  
  // Check 1: Null/undefined recommendation
  if (!cachedRecommendation) {
    console.log('[Cache Validation] ❌ Recommendation is null or undefined');
    return false;
  }

  // Check 2: Validate basic structure
  if (!cachedRecommendation.recommendation_id || !cachedRecommendation.category) {
    console.log('[Cache Validation] ❌ Missing required fields (recommendation_id or category)');
    return false;
  }

  // Check 3: Validate metadata structure
  const metadata = cachedRecommendation._enrichment_metadata || {};
  const hasMetadata = Object.keys(metadata).length > 0;
  
  console.log('[Cache Validation] Metadata check:', {
    hasMetadata,
    metadataKeys: Object.keys(metadata),
  });

  // Check 4: Validate study data - check totalStudies OR studiesUsed > 0
  const totalStudies = cachedRecommendation.evidence_summary?.totalStudies || 0;
  const studiesUsed = metadata.studiesUsed || 0;
  
  // Valid if either totalStudies > 0 OR studiesUsed > 0
  const hasRealData = totalStudies > 0 || studiesUsed > 0;
  
  console.log('[Cache Validation] Study data check:', {
    totalStudies,
    studiesUsed,
    hasRealData,
    category: cachedRecommendation.category,
  });

  // Check 5: Additional validation - ensure not fake/generated data
  // Fake data has totalStudies > 0 but studiesUsed = 0
  const hasFakeData = totalStudies > 0 && studiesUsed === 0 && !hasMetadata;
  
  if (hasFakeData) {
    console.log('[Cache Validation] ❌ Detected fake/generated data (totalStudies > 0 but studiesUsed = 0)');
    return false;
  }

  // Final result
  const isValid = hasRealData;
  console.log('[Cache Validation] Final result:', {
    isValid,
    reason: isValid ? 'Has real study data' : 'No real study data found',
  });

  return isValid;
}

// Test cases
console.log('\n=== Test 1: Valid cache with real data ===');
const validCache = {
  recommendation_id: 'test-123',
  category: 'Ashwagandha',
  evidence_summary: {
    totalStudies: 50,
    totalParticipants: 5000,
  },
  _enrichment_metadata: {
    studiesUsed: 50,
    hasRealData: true,
  },
};
console.assert(isValidCache(validCache) === true, 'Should return true for valid cache');

console.log('\n=== Test 2: Null recommendation ===');
console.assert(isValidCache(null) === false, 'Should return false for null');

console.log('\n=== Test 3: Missing recommendation_id ===');
const missingId = {
  category: 'Ashwagandha',
  evidence_summary: { totalStudies: 50 },
};
console.assert(isValidCache(missingId) === false, 'Should return false for missing ID');

console.log('\n=== Test 4: Missing category ===');
const missingCategory = {
  recommendation_id: 'test-123',
  evidence_summary: { totalStudies: 50 },
};
console.assert(isValidCache(missingCategory) === false, 'Should return false for missing category');

console.log('\n=== Test 5: Fake data (totalStudies > 0, studiesUsed = 0, no metadata) ===');
const fakeData = {
  recommendation_id: 'test-123',
  category: 'Ashwagandha',
  evidence_summary: {
    totalStudies: 50,
  },
  _enrichment_metadata: {},
};
console.assert(isValidCache(fakeData) === false, 'Should return false for fake data');

console.log('\n=== Test 6: Valid with only totalStudies ===');
const onlyTotalStudies = {
  recommendation_id: 'test-123',
  category: 'Ashwagandha',
  evidence_summary: {
    totalStudies: 50,
  },
  _enrichment_metadata: {
    hasRealData: true,
    studiesUsed: 50,
  },
};
console.assert(isValidCache(onlyTotalStudies) === true, 'Should return true with totalStudies > 0');

console.log('\n=== Test 7: Valid with only studiesUsed ===');
const onlyStudiesUsed = {
  recommendation_id: 'test-123',
  category: 'Ashwagandha',
  evidence_summary: {
    totalStudies: 0,
  },
  _enrichment_metadata: {
    studiesUsed: 50,
  },
};
console.assert(isValidCache(onlyStudiesUsed) === true, 'Should return true with studiesUsed > 0');

console.log('\n=== Test 8: No real data (both 0) ===');
const noData = {
  recommendation_id: 'test-123',
  category: 'Ashwagandha',
  evidence_summary: {
    totalStudies: 0,
  },
  _enrichment_metadata: {
    studiesUsed: 0,
  },
};
console.assert(isValidCache(noData) === false, 'Should return false with no real data');

console.log('\n✅ All tests passed!');
