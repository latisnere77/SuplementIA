/**
 * Test "saw palmetto" against PRODUCTION API
 * This simulates exactly what the user is experiencing
 */

interface EnrichResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

async function testProduction() {
  const term = 'saw palmetto';
  
  console.log('='.repeat(80));
  console.log(`🔍 TESTING PRODUCTION: "${term}"`);
  console.log('='.repeat(80));
  console.log();
  
  // Get production URL from environment or use default
  const PRODUCTION_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suplementia.vercel.app';
  const API_ENDPOINT = `${PRODUCTION_URL}/api/portal/enrich`;
  
  console.log(`📍 Production URL: ${API_ENDPOINT}`);
  console.log();
  
  // Test the enrich API
  console.log('📋 Calling Enrich API...');
  console.log('-'.repeat(80));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: term,
        maxStudies: 10,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data: EnrichResponse = await response.json();
    
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log();
    
    if (response.status === 200 && data.success) {
      console.log('✅ SUCCESS');
      console.log();
      console.log('Response Data:');
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));
      console.log();
      
      // Check if we got studies
      if (data.data?.studies && data.data.studies.length > 0) {
        console.log(`✅ Found ${data.data.studies.length} studies`);
        console.log();
        console.log('Sample studies:');
        data.data.studies.slice(0, 3).forEach((study: any, i: number) => {
          console.log(`  ${i + 1}. ${study.title?.substring(0, 80)}...`);
        });
      } else {
        console.log('⚠️  No studies found in response');
      }
    } else {
      console.log('❌ FAILED');
      console.log();
      console.log('Error Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log();
      
      // Analyze the error
      console.log('='.repeat(80));
      console.log('🔍 ERROR ANALYSIS');
      console.log('='.repeat(80));
      
      if (data.error?.includes('404') || data.message?.includes('404')) {
        console.log('❌ 404 Error - No studies found');
        console.log();
        console.log('Possible causes:');
        console.log('  1. PubMed search returned no results');
        console.log('  2. Search term not translated/expanded correctly');
        console.log('  3. Studies fetcher Lambda failed');
        console.log('  4. Minimum study threshold not met');
      } else if (data.error?.includes('timeout')) {
        console.log('❌ Timeout Error');
        console.log();
        console.log('Possible causes:');
        console.log('  1. LLM expansion took too long (>8s)');
        console.log('  2. PubMed API slow response');
        console.log('  3. Lambda cold start');
      } else {
        console.log('❌ Unknown Error');
        console.log();
        console.log('Error details:', data.error || data.message);
      }
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('❌ REQUEST FAILED');
    console.log();
    console.log('Error:', error.message);
    console.log();
    
    if (error.message.includes('fetch failed')) {
      console.log('⚠️  Network error - could not reach production API');
      console.log('   This might be a CORS issue or the API is down');
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('🔍 NEXT STEPS');
  console.log('='.repeat(80));
  console.log();
  console.log('1. Check Vercel deployment status:');
  console.log('   https://vercel.com/latisnere77/suplementia/deployments');
  console.log();
  console.log('2. Check if latest code is deployed:');
  console.log('   - Prompt caching implementation');
  console.log('   - Scientific name suggestions');
  console.log('   - Improved enrich/route.ts logic');
  console.log();
  console.log('3. If deployment is pending:');
  console.log('   - Wait for automatic deployment to complete');
  console.log('   - Or trigger manual deployment');
  console.log();
  console.log('4. Check CloudWatch logs for detailed trace:');
  console.log('   ./scripts/trace-saw-palmetto-production.sh');
  console.log();
}

// Run test
testProduction().catch(console.error);
