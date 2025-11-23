/**
 * Test Script: Kombucha Enrich Endpoint
 *
 * Tests the full enrich endpoint (studies-fetcher + content-enricher)
 * This is Step 2 in the diagnostic flow
 */

const ENRICH_API_URL = 'https://www.suplementai.com/api/portal/enrich';

async function testKombuchaEnrich() {
  console.log('='.repeat(80));
  console.log('KOMBUCHA DIAGNOSIS - Step 2: Enrich Endpoint Test');
  console.log('='.repeat(80));
  console.log();

  const testCases = [
    {
      name: 'With forceRefresh (bypass cache)',
      params: {
        supplementName: 'kombucha',
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
        forceRefresh: true,
      },
    },
    {
      name: 'Without forceRefresh (may use cache)',
      params: {
        supplementName: 'kombucha',
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
        forceRefresh: false,
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test Case: ${testCase.name}`);
    console.log('-'.repeat(80));

    try {
      const startTime = Date.now();

      const response = await fetch(ENRICH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.params),
        signal: AbortSignal.timeout(120000), // 2 minutes timeout
      });

      const duration = Date.now() - startTime;
      const statusCode = response.status;

      console.log(`   ⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log(`   📡 Status: ${statusCode}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText.substring(0, 500) };
        }

        console.log(`   ❌ ERROR Response:`);
        console.log(`      Error: ${errorData.error || 'Unknown'}`);
        console.log(`      Message: ${errorData.message || 'N/A'}`);
        console.log(`      Suggestion: ${errorData.suggestion || 'N/A'}`);

        if (errorData.metadata) {
          console.log(`\n   📊 Metadata:`);
          console.log(`      hasRealData: ${errorData.metadata.hasRealData}`);
          console.log(`      studiesUsed: ${errorData.metadata.studiesUsed}`);
          console.log(`      requestId: ${errorData.metadata.requestId}`);
        }

        continue;
      }

      const data = await response.json();

      console.log(`   ✅ Success: ${data.success}`);
      console.log(`   📊 Has Data: ${!!data.data}`);

      if (data.metadata) {
        console.log(`\n   📊 METADATA:`);
        console.log(`      hasRealData: ${data.metadata.hasRealData}`);
        console.log(`      studiesUsed: ${data.metadata.studiesUsed}`);
        console.log(`      intelligentSystem: ${data.metadata.intelligentSystem}`);
        console.log(`      studiesSource: ${data.metadata.studiesSource}`);
        console.log(`      originalQuery: ${data.metadata.originalQuery}`);
        console.log(`      translatedQuery: ${data.metadata.translatedQuery || 'N/A'}`);
        console.log(`      finalSearchTerm: ${data.metadata.finalSearchTerm || 'N/A'}`);
        console.log(`      usedVariation: ${data.metadata.usedVariation || false}`);

        if (data.metadata.expansion) {
          console.log(`\n      🔄 Query Expansion:`);
          console.log(`         Original: ${data.metadata.expansion.original}`);
          console.log(`         Expanded: ${data.metadata.expansion.expanded}`);
          console.log(`         Source: ${data.metadata.expansion.source}`);
          console.log(`         Confidence: ${data.metadata.expansion.confidence}`);
        }
      }

      if (data.data) {
        console.log(`\n   📄 ENRICHED DATA:`);
        console.log(`      name: ${data.data.name || 'N/A'}`);
        console.log(`      totalStudies: ${data.data.totalStudies || 0}`);
        console.log(`      totalParticipants: ${data.data.totalParticipants || 0}`);
        console.log(`      evidenceGrade: ${data.data.evidenceGrade || 'N/A'}`);

        if (data.data.worksFor && data.data.worksFor.length > 0) {
          console.log(`\n      ✅ Works For (${data.data.worksFor.length}):`);
          data.data.worksFor.slice(0, 3).forEach((item: any, i: number) => {
            console.log(`         ${i + 1}. ${item.condition || item.use} (Grade: ${item.evidenceGrade || item.grade})`);
          });
        }

        if (data.data.doesntWorkFor && data.data.doesntWorkFor.length > 0) {
          console.log(`\n      ❌ Doesn't Work For (${data.data.doesntWorkFor.length}):`);
          data.data.doesntWorkFor.slice(0, 3).forEach((item: any, i: number) => {
            console.log(`         ${i + 1}. ${item.condition || item.use} (Grade: ${item.evidenceGrade || item.grade})`);
          });
        }

        if (data.data.dosage) {
          console.log(`\n      💊 Dosage:`);
          if (typeof data.data.dosage === 'string') {
            console.log(`         ${data.data.dosage}`);
          } else {
            console.log(`         Effective: ${data.data.dosage.effectiveDose || 'N/A'}`);
            console.log(`         Optimal: ${data.data.dosage.optimalDose || 'N/A'}`);
          }
        }
      }

    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      if (error.name === 'AbortError') {
        console.log(`   ⚠️  Request timed out after 120 seconds`);
      }
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('DIAGNOSIS SUMMARY:');
  console.log('='.repeat(80));
  console.log('✅ If hasRealData=true and studiesUsed>0:');
  console.log('   → Problem is in recommend endpoint validation or frontend');
  console.log();
  console.log('❌ If hasRealData=false or studiesUsed=0:');
  console.log('   → Problem is in studies fetching or metadata generation');
  console.log();
  console.log('⏱️  If timeout (504 or AbortError):');
  console.log('   → Content-enricher Lambda taking too long');
  console.log('   → Need to optimize prompt or increase timeout');
  console.log();
  console.log('🔍 If 404 insufficient_data:');
  console.log('   → No studies found in PubMed (check Step 1 results)');
  console.log('='.repeat(80));
}

// Run the test
testKombuchaEnrich().catch(console.error);
