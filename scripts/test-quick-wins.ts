/**
 * Test Quick Wins Implementation
 * Tests: Cache, Timeout Manager, Rate Limiter
 */

import { studiesCache, enrichmentCache, translationCache } from '../lib/cache/simple-cache';
import { TimeoutManager, TIMEOUTS, withTimeout } from '../lib/resilience/timeout-manager';
import { globalRateLimiter } from '../lib/resilience/rate-limiter';

async function testCache() {
  console.log('\n🧪 Testing Simple Cache...\n');

  // Test set/get
  studiesCache.set('test-key', { data: 'test-value' });
  const cached = studiesCache.get('test-key');
  console.log('✅ Cache set/get:', cached ? 'PASS' : 'FAIL');

  // Test expiration
  studiesCache.set('expire-key', { data: 'will-expire' }, 100); // 100ms TTL
  await new Promise(resolve => setTimeout(resolve, 150));
  const expired = studiesCache.get('expire-key');
  console.log('✅ Cache expiration:', expired === null ? 'PASS' : 'FAIL');

  // Test stats
  const stats = studiesCache.getStats();
  console.log('✅ Cache stats:', stats);

  console.log('\n✅ Cache tests completed\n');
}

async function testTimeoutManager() {
  console.log('\n🧪 Testing Timeout Manager...\n');

  const tm = new TimeoutManager(5000); // 5s budget

  // Test successful execution
  try {
    const result = await tm.executeWithBudget(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      },
      1000,
      'test-stage'
    );
    console.log('✅ Successful execution:', result === 'success' ? 'PASS' : 'FAIL');
  } catch (error) {
    console.log('❌ Successful execution: FAIL');
  }

  // Test timeout
  try {
    await tm.executeWithBudget(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'should-timeout';
      },
      500,
      'timeout-stage'
    );
    console.log('❌ Timeout test: FAIL (should have timed out)');
  } catch (error: any) {
    console.log('✅ Timeout test:', error.message.includes('Timeout') ? 'PASS' : 'FAIL');
  }

  // Test budget exhaustion
  const tm2 = new TimeoutManager(1000); // 1s budget
  await new Promise(resolve => setTimeout(resolve, 1100)); // Exhaust budget
  
  try {
    await tm2.executeWithBudget(
      async () => 'should-fail',
      500,
      'exhausted-stage'
    );
    console.log('❌ Budget exhaustion: FAIL (should have failed)');
  } catch (error: any) {
    console.log('✅ Budget exhaustion:', error.message.includes('exhausted') ? 'PASS' : 'FAIL');
  }

  // Test withTimeout helper
  try {
    await withTimeout(
      new Promise(resolve => setTimeout(() => resolve('ok'), 100)),
      200,
      'Test timeout'
    );
    console.log('✅ withTimeout helper: PASS');
  } catch (error) {
    console.log('❌ withTimeout helper: FAIL');
  }

  console.log('\n✅ Timeout Manager tests completed\n');
}

async function testRateLimiter() {
  console.log('\n🧪 Testing Rate Limiter...\n');

  const testIp = 'test-ip-123';

  // Test normal requests
  let passCount = 0;
  for (let i = 0; i < 10; i++) {
    const result = globalRateLimiter.check(testIp);
    if (result.allowed) passCount++;
  }
  console.log('✅ Normal requests (10):', passCount === 10 ? 'PASS' : 'FAIL');

  // Test rate limiting (11th request should fail)
  const blocked = globalRateLimiter.check(testIp);
  console.log('✅ Rate limiting:', !blocked.allowed ? 'PASS' : 'FAIL');

  // Test reset
  globalRateLimiter.reset(testIp);
  const afterReset = globalRateLimiter.check(testIp);
  console.log('✅ Reset:', afterReset.allowed ? 'PASS' : 'FAIL');

  // Test stats
  const stats = globalRateLimiter.getStats();
  console.log('✅ Rate limiter stats:', stats);

  console.log('\n✅ Rate Limiter tests completed\n');
}

async function testIntegration() {
  console.log('\n🧪 Testing Integration...\n');

  const tm = new TimeoutManager(10000);
  const testIp = 'integration-test-ip';

  // Simulate full request flow
  try {
    // 1. Check rate limit
    const rateLimit = globalRateLimiter.check(testIp);
    if (!rateLimit.allowed) {
      throw new Error('Rate limited');
    }
    console.log('✅ Step 1: Rate limit check PASS');

    // 2. Check cache
    const cacheKey = 'test-supplement';
    let data = enrichmentCache.get(cacheKey);
    
    if (!data) {
      // 3. Fetch with timeout
      data = await tm.executeWithBudget(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { supplement: 'test', data: 'enriched' };
        },
        2000,
        'fetch-stage'
      );
      
      // 4. Cache result
      enrichmentCache.set(cacheKey, data);
      console.log('✅ Step 2: Fetch and cache PASS');
    } else {
      console.log('✅ Step 2: Cache hit PASS');
    }

    // 5. Verify cached
    const cached = enrichmentCache.get(cacheKey);
    console.log('✅ Step 3: Verify cache:', cached ? 'PASS' : 'FAIL');

    console.log('\n✅ Integration test completed\n');
  } catch (error: any) {
    console.error('❌ Integration test FAIL:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing Quick Wins Implementation\n');
  console.log('=' .repeat(50));

  await testCache();
  await testTimeoutManager();
  await testRateLimiter();
  await testIntegration();

  console.log('=' .repeat(50));
  console.log('\n✅ All tests completed!\n');
}

main().catch(console.error);
