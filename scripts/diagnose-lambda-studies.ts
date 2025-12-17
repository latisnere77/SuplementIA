/**
 * Comprehensive diagnosis script for studies-fetcher Lambda
 * Tests multiple angles to find the root cause
 */

const LAMBDA_URL = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

interface TestCase {
  name: string;
  supplementName: string;
  filters?: any;
}

const testCases: TestCase[] = [
  // Test 1: Common supplements
  { name: 'Creatine (English)', supplementName: 'Creatine' },
  { name: 'Vitamin D (English)', supplementName: 'Vitamin D' },
  { name: 'Omega-3 (English)', supplementName: 'Omega-3' },
  
  // Test 2: Scientific names
  { name: 'Creatine Monohydrate', supplementName: 'Creatine Monohydrate' },
  { name: 'Cholecalciferol', supplementName: 'Cholecalciferol' },
  { name: 'Eicosapentaenoic Acid', supplementName: 'Eicosapentaenoic Acid' },
  
  // Test 3: Different filters
  { 
    name: 'Creatine - No filters', 
    supplementName: 'Creatine',
    filters: {
      rctOnly: false,
      humanStudiesOnly: false,
      yearFrom: undefined,
    }
  },
  { 
    name: 'Creatine - RCT only', 
    supplementName: 'Creatine',
    filters: {
      rctOnly: true,
      humanStudiesOnly: true,
      yearFrom: 2010,
    }
  },
  { 
    name: 'Creatine - Old studies', 
    supplementName: 'Creatine',
    filters: {
      rctOnly: false,
      humanStudiesOnly: true,
      yearFrom: 2000,
    }
  },
  { 
    name: 'Creatine - Very old', 
    supplementName: 'Creatine',
    filters: {
      rctOnly: false,
      humanStudiesOnly: false,
      yearFrom: 1990,
    }
  },
];

async function testLambda(testCase: TestCase) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Test: ${testCase.name}`);
  console.log(`${'='.repeat(70)}`);
  
  const payload = {
    supplementName: testCase.supplementName,
    maxResults: 10,
    ...(testCase.filters || {
      rctOnly: false,
      yearFrom: 2010,
      humanStudiesOnly: true,
    }),
  };
  
  console.log(`📤 Request payload:`);
  console.log(JSON.stringify(payload, null, 2));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`\n📥 Response (${duration}ms):`);
    console.log(`Status: ${response.status}`);
    console.log(`Studies found: ${data.studies?.length || 0}`);
    
    if (data.studies && data.studies.length > 0) {
      console.log(`✅ SUCCESS - Found ${data.studies.length} studies`);
      console.log(`\nFirst study:`);
      const study = data.studies[0];
      console.log(`  Title: ${study.title?.substring(0, 80)}...`);
      console.log(`  Year: ${study.year}`);
      console.log(`  PMID: ${study.pmid}`);
      console.log(`  Type: ${study.studyType || 'unknown'}`);
    } else {
      console.log(`❌ FAILED - No studies found`);
      console.log(`Message: ${data.message || 'No message provided'}`);
      console.log(`Error: ${data.error || 'No error provided'}`);
      
      // Log full response for debugging
      console.log(`\nFull response:`);
      console.log(JSON.stringify(data, null, 2));
    }
    
    return {
      success: data.studies?.length > 0,
      count: data.studies?.length || 0,
      duration,
      data,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n💥 ERROR (${duration}ms):`);
    console.log(`Message: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    
    return {
      success: false,
      count: 0,
      duration,
      error: error.message,
    };
  }
}

async function testPubMedDirectly() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔬 Testing PubMed API Directly`);
  console.log(`${'='.repeat(70)}`);
  
  // Test PubMed E-utilities API directly
  const query = 'creatine[Title/Abstract] AND (randomized controlled trial[Publication Type])';
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json`;
  
  console.log(`\n📤 PubMed query: ${query}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`\n📥 PubMed Response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Count: ${data.esearchresult?.count || 0}`);
    console.log(`IDs found: ${data.esearchresult?.idlist?.length || 0}`);
    
    if (data.esearchresult?.idlist?.length > 0) {
      console.log(`✅ PubMed API is working`);
      console.log(`First 5 PMIDs: ${data.esearchresult.idlist.slice(0, 5).join(', ')}`);
      return true;
    } else {
      console.log(`⚠️ PubMed returned no results`);
      return false;
    }
  } catch (error: any) {
    console.log(`💥 PubMed API Error: ${error.message}`);
    return false;
  }
}

async function checkLambdaHealth() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🏥 Lambda Health Check`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    // Try a simple POST request
    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: 'test',
        maxResults: 1,
      }),
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log(`Response type: ${typeof data}`);
    console.log(`Has studies field: ${!!data.studies}`);
    
    // Lambda is healthy if it responds (even with 0 studies)
    return response.status === 200;
  } catch (error: any) {
    console.log(`💥 Health check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive Lambda diagnosis...\n');
  
  // Step 1: Check Lambda health
  console.log('\n' + '█'.repeat(70));
  console.log('STEP 1: Lambda Health Check');
  console.log('█'.repeat(70));
  const isHealthy = await checkLambdaHealth();
  
  if (!isHealthy) {
    console.log('\n⚠️ Lambda appears to be down or unreachable');
    console.log('Check AWS Console for Lambda status');
    return;
  }
  
  // Step 2: Test PubMed directly
  console.log('\n' + '█'.repeat(70));
  console.log('STEP 2: PubMed API Direct Test');
  console.log('█'.repeat(70));
  const pubmedWorks = await testPubMedDirectly();
  
  if (!pubmedWorks) {
    console.log('\n⚠️ PubMed API might be having issues');
  }
  
  // Step 3: Run all test cases
  console.log('\n' + '█'.repeat(70));
  console.log('STEP 3: Lambda Test Cases');
  console.log('█'.repeat(70));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testLambda(testCase);
    results.push({
      name: testCase.name,
      ...result,
    });
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Step 4: Summary
  console.log('\n' + '█'.repeat(70));
  console.log('SUMMARY');
  console.log('█'.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log(`\n✅ Working test cases:`);
    successful.forEach(r => {
      console.log(`  - ${r.name}: ${r.count} studies in ${r.duration}ms`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed test cases:`);
    failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.error || 'No studies found'}`);
    });
  }
  
  // Step 5: Diagnosis
  console.log('\n' + '█'.repeat(70));
  console.log('DIAGNOSIS');
  console.log('█'.repeat(70));
  
  if (successful.length === 0) {
    console.log('\n🔍 Possible causes:');
    console.log('  1. Lambda is not connecting to PubMed API');
    console.log('  2. AWS credentials are missing or invalid');
    console.log('  3. Lambda timeout is too short');
    console.log('  4. Network/VPC configuration issue');
    console.log('  5. PubMed API rate limiting');
    console.log('\n💡 Recommended actions:');
    console.log('  1. Check CloudWatch logs for the Lambda');
    console.log('  2. Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    console.log('  3. Test Lambda locally with same payload');
    console.log('  4. Check Lambda timeout settings (should be 30s+)');
  } else if (successful.length < results.length) {
    console.log('\n🔍 Partial success - some queries work, others don\'t');
    console.log('  This suggests:');
    console.log('  - Filters might be too restrictive');
    console.log('  - Some supplement names need normalization');
    console.log('  - Query construction might need adjustment');
  } else {
    console.log('\n✅ All tests passed! Lambda is working correctly.');
  }
  
  console.log('\n✨ Diagnosis complete!\n');
}

main().catch(console.error);
