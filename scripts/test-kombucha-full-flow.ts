/**
 * Test Script: Kombucha Full Flow
 *
 * Tests the complete user flow: quiz → recommend → results
 * This is Step 3 in the diagnostic flow (end-to-end test)
 */

const QUIZ_API_URL = 'https://www.suplementai.com/api/portal/quiz';

async function testKombuchaFullFlow() {
  console.log('='.repeat(80));
  console.log('KOMBUCHA DIAGNOSIS - Step 3: Full Flow Test (Quiz → Recommend)');
  console.log('='.repeat(80));
  console.log();

  try {
    console.log('📋 Sending quiz request for "kombucha"...');
    console.log('-'.repeat(80));

    const startTime = Date.now();

    const response = await fetch(QUIZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: 'kombucha',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
      signal: AbortSignal.timeout(150000), // 2.5 minutes timeout
    });

    const duration = Date.now() - startTime;
    const statusCode = response.status;

    console.log(`\n⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`📡 Status: ${statusCode}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText.substring(0, 500) };
      }

      console.log('\n❌ ERROR RESPONSE:');
      console.log('-'.repeat(80));
      console.log(`Error: ${errorData.error || 'Unknown'}`);
      console.log(`Message: ${errorData.message || 'N/A'}`);
      console.log(`Suggestion: ${errorData.suggestion || 'N/A'}`);
      console.log(`Category: ${errorData.category || 'N/A'}`);

      if (statusCode === 404 && errorData.error === 'insufficient_data') {
        console.log('\n🔍 DIAGNOSIS: 404 Insufficient Data');
        console.log('This means:');
        console.log('  1. Backend processed the request');
        console.log('  2. Either no studies found OR validation failed');
        console.log('  3. Check Steps 1 & 2 to see if studies were found');
        console.log('  4. If studies exist, problem is in metadata validation');
      } else if (statusCode === 503) {
        console.log('\n🔍 DIAGNOSIS: 503 Service Unavailable');
        console.log('This means:');
        console.log('  1. Backend is unreachable or overloaded');
        console.log('  2. Lambda cold start or timeout');
        console.log('  3. May need to retry');
      } else if (statusCode === 504) {
        console.log('\n🔍 DIAGNOSIS: 504 Gateway Timeout');
        console.log('This means:');
        console.log('  1. Request took too long (>115s)');
        console.log('  2. Content-enricher Lambda timeout');
        console.log('  3. Need to optimize enrichment process');
      }

      return;
    }

    const data = await response.json();

    console.log('\n✅ SUCCESS RESPONSE:');
    console.log('-'.repeat(80));
    console.log(`Success: ${data.success}`);
    console.log(`Quiz ID: ${data.quiz_id || 'N/A'}`);
    console.log(`Has Recommendation: ${!!data.recommendation}`);
    console.log(`Demo Mode: ${data.demo || false}`);
    console.log(`Fallback: ${data.fallback || false}`);

    if (data.recommendation) {
      const rec = data.recommendation;

      console.log('\n📊 RECOMMENDATION DATA:');
      console.log('-'.repeat(80));
      console.log(`Recommendation ID: ${rec.recommendation_id || 'N/A'}`);
      console.log(`Category: ${rec.category || 'N/A'}`);

      // CRITICAL: Check evidence_summary
      if (rec.evidence_summary) {
        console.log('\n📈 EVIDENCE SUMMARY:');
        console.log(`   totalStudies: ${rec.evidence_summary.totalStudies || 0}`);
        console.log(`   totalParticipants: ${rec.evidence_summary.totalParticipants || 0}`);
        console.log(`   efficacyPercentage: ${rec.evidence_summary.efficacyPercentage || 0}`);
        console.log(`   researchSpanYears: ${rec.evidence_summary.researchSpanYears || 0}`);

        if (rec.evidence_summary.ingredients && rec.evidence_summary.ingredients.length > 0) {
          console.log(`\n   Ingredients (${rec.evidence_summary.ingredients.length}):`);
          rec.evidence_summary.ingredients.forEach((ing: any, i: number) => {
            console.log(`      ${i + 1}. ${ing.name} - Grade: ${ing.grade}, Studies: ${ing.studyCount}, RCTs: ${ing.rctCount}`);
          });
        }
      } else {
        console.log('\n⚠️  NO evidence_summary found');
      }

      // CRITICAL: Check _enrichment_metadata
      if (rec._enrichment_metadata) {
        console.log('\n🔍 ENRICHMENT METADATA:');
        console.log(`   hasRealData: ${rec._enrichment_metadata.hasRealData}`);
        console.log(`   studiesUsed: ${rec._enrichment_metadata.studiesUsed}`);
        console.log(`   intelligentSystem: ${rec._enrichment_metadata.intelligentSystem}`);
        console.log(`   fallback: ${rec._enrichment_metadata.fallback || false}`);
        console.log(`   source: ${rec._enrichment_metadata.source || 'N/A'}`);
        console.log(`   version: ${rec._enrichment_metadata.version || 'N/A'}`);
        console.log(`   error: ${rec._enrichment_metadata.error || 'None'}`);

        // VALIDATION CHECK
        const totalStudies = rec.evidence_summary?.totalStudies || 0;
        const metadataStudies = rec._enrichment_metadata.studiesUsed || 0;
        const hasRealData = rec._enrichment_metadata.hasRealData;

        console.log('\n🔬 VALIDATION CHECK:');
        console.log(`   evidence_summary.totalStudies: ${totalStudies}`);
        console.log(`   _enrichment_metadata.studiesUsed: ${metadataStudies}`);
        console.log(`   _enrichment_metadata.hasRealData: ${hasRealData}`);

        if (totalStudies === 0 && metadataStudies === 0) {
          console.log('\n   ⚠️  WARNING: Both totalStudies and studiesUsed are 0');
          console.log('   This indicates NO REAL DATA was found');
          console.log('   Frontend will show warning banner');
        } else if (totalStudies > 0 && metadataStudies === 0) {
          console.log('\n   ⚠️  WARNING: Metadata inconsistency detected!');
          console.log('   totalStudies > 0 but metadata.studiesUsed = 0');
          console.log('   This is the KEFIR BUG - cache hit with wrong metadata');
        } else if (totalStudies > 0 && metadataStudies > 0) {
          console.log('\n   ✅ VALID: Both totalStudies and studiesUsed > 0');
          console.log('   Data should display correctly in frontend');
        }
      } else {
        console.log('\n⚠️  NO _enrichment_metadata found');
        console.log('This may cause frontend validation to fail');
      }

      // Check supplement data
      if (rec.supplement) {
        console.log('\n💊 SUPPLEMENT DATA:');
        console.log(`   name: ${rec.supplement.name || 'N/A'}`);
        console.log(`   description: ${rec.supplement.description?.substring(0, 100) || 'N/A'}...`);
        console.log(`   worksFor: ${rec.supplement.worksFor?.length || 0} items`);
        console.log(`   doesntWorkFor: ${rec.supplement.doesntWorkFor?.length || 0} items`);
        console.log(`   limitedEvidence: ${rec.supplement.limitedEvidence?.length || 0} items`);
        console.log(`   sideEffects: ${rec.supplement.sideEffects?.length || 0} items`);
      }

      // Check products
      if (rec.products) {
        console.log(`\n🛒 PRODUCTS: ${rec.products.length} tiers`);
        rec.products.forEach((prod: any) => {
          console.log(`   ${prod.tier}: ${prod.name} - $${prod.price} ${prod.currency}`);
        });
      }

    } else {
      console.log('\n⚠️  NO recommendation in response');
      console.log('Response keys:', Object.keys(data));
    }

  } catch (error: any) {
    console.log('\n❌ EXCEPTION:');
    console.log('-'.repeat(80));
    console.log(`Error: ${error.message}`);
    console.log(`Type: ${error.name}`);

    if (error.name === 'AbortError') {
      console.log('\n⚠️  Request timed out after 150 seconds');
      console.log('This indicates severe backend performance issues');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('FINAL DIAGNOSIS GUIDE:');
  console.log('='.repeat(80));
  console.log();
  console.log('🟢 SUCCESS SCENARIO (hasRealData=true, studiesUsed>0):');
  console.log('   → Everything works, data should display correctly');
  console.log();
  console.log('🟡 PARTIAL SUCCESS (totalStudies>0, but metadata.studiesUsed=0):');
  console.log('   → KEFIR BUG: Cache hit with incorrect metadata');
  console.log('   → Fix: Use totalStudies from cache to generate correct metadata');
  console.log();
  console.log('🔴 FAILURE (404 insufficient_data):');
  console.log('   → Either: No studies found in PubMed (check Step 1)');
  console.log('   → Or: Validation too strict (check Step 2 metadata)');
  console.log();
  console.log('🔴 FAILURE (504 timeout):');
  console.log('   → Content-enricher Lambda taking too long');
  console.log('   → Need to optimize or increase timeout');
  console.log();
  console.log('🟠 FALLBACK (demo=true, fallback=true):');
  console.log('   → Backend unreachable, using mock data');
  console.log('   → Check backend connectivity');
  console.log('='.repeat(80));
}

// Run the test
testKombuchaFullFlow().catch(console.error);
