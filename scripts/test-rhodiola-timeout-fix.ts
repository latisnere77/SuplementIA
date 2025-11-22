/**
 * Test: Rhodiola Timeout Fix
 * 
 * Valida que el timeout fix funciona correctamente para rhodiola
 */

interface TestResult {
  endpoint: string;
  success: boolean;
  duration: number;
  statusCode?: number;
  error?: string;
}

async function testEndpoint(
  name: string,
  url: string,
  body: any
): Promise<TestResult> {
  const startTime = Date.now();
  console.log(`\n🔍 Testing: ${name}...`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    const result: TestResult = {
      endpoint: name,
      success: response.ok && data.success,
      duration,
      statusCode: response.status,
      error: !response.ok ? data.error || data.message : undefined,
    };
    
    if (result.success) {
      console.log(`✅ ${name} - OK (${duration}ms)`);
    } else {
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error}`);
    }
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${name} - EXCEPTION (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    
    return {
      endpoint: name,
      success: false,
      duration,
      error: error.message,
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('TEST: RHODIOLA TIMEOUT FIX');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');
  console.log('Testing that rhodiola searches complete within reasonable time...');
  
  const results: TestResult[] = [];
  
  // Test 1: /api/portal/enrich (should use cache or be fast)
  results.push(await testEndpoint(
    'Enrich: rhodiola',
    'https://www.suplementai.com/api/portal/enrich',
    { supplementName: 'rhodiola', maxStudies: 5 }
  ));
  
  // Test 2: /api/portal/recommend
  results.push(await testEndpoint(
    'Recommend: rhodiola',
    'https://www.suplementai.com/api/portal/recommend',
    { category: 'rhodiola', age: 35 }
  ));
  
  // Test 3: /api/portal/quiz (full flow)
  results.push(await testEndpoint(
    'Quiz: rhodiola',
    'https://www.suplementai.com/api/portal/quiz',
    { category: 'rhodiola', age: 35, gender: 'male', location: 'CDMX' }
  ));
  
  // Test 4: rhodiola rosea (with full name)
  results.push(await testEndpoint(
    'Quiz: rhodiola rosea',
    'https://www.suplementai.com/api/portal/quiz',
    { category: 'rhodiola rosea', age: 35, gender: 'male', location: 'CDMX' }
  ));
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\nTotal tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  
  // Check timeout issues
  const slowTests = results.filter(r => r.duration > 10000); // > 10s
  const verySlowTests = results.filter(r => r.duration > 30000); // > 30s
  
  if (verySlowTests.length > 0) {
    console.log(`\n⚠️  VERY SLOW TESTS (>30s): ${verySlowTests.length}`);
    for (const test of verySlowTests) {
      console.log(`   - ${test.endpoint}: ${test.duration}ms`);
    }
  } else if (slowTests.length > 0) {
    console.log(`\n⚠️  SLOW TESTS (>10s): ${slowTests.length}`);
    for (const test of slowTests) {
      console.log(`   - ${test.endpoint}: ${test.duration}ms`);
    }
  } else {
    console.log(`\n✅ All tests completed in reasonable time (<10s)`);
  }
  
  // Performance stats
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));
  
  console.log(`\n📊 Performance Stats:`);
  console.log(`   Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Min: ${minDuration}ms`);
  console.log(`   Max: ${maxDuration}ms`);
  
  // Detailed results
  console.log('\n' + '-'.repeat(80));
  console.log('DETAILED RESULTS:');
  console.log('-'.repeat(80));
  
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`\n${icon} ${result.endpoint}`);
    console.log(`   Duration: ${result.duration}ms`);
    if (result.statusCode) {
      console.log(`   Status: ${result.statusCode}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Test completed: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  // Exit code
  process.exit(failedTests > 0 || verySlowTests.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
