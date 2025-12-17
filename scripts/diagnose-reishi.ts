/**
 * Diagnose Reishi Search Issue
 * Tests the complete flow for "reishi" supplement search
 */

import { normalizeQuery } from '../lib/portal/query-normalization';
import { suggestSupplementCorrection } from '../lib/portal/supplement-suggestions';

async function diagnoseReishi() {
  console.log('🔍 DIAGNOSING REISHI SEARCH ISSUE\n');
  console.log('='.repeat(60));

  const query = 'reishi';

  // Step 1: Query Normalization
  console.log('\n📝 Step 1: Query Normalization');
  console.log('-'.repeat(60));
  const normalized = normalizeQuery(query);
  console.log('Original:', normalized.original);
  console.log('Normalized:', normalized.normalized);
  console.log('Confidence:', normalized.confidence);
  console.log('Corrections:', normalized.corrections);
  console.log('Suggestions:', normalized.suggestions);

  // Step 2: Supplement Suggestions
  console.log('\n💡 Step 2: Supplement Suggestions');
  console.log('-'.repeat(60));
  const suggestion = suggestSupplementCorrection(query);
  if (suggestion) {
    console.log('Found suggestion:', suggestion.suggestion);
    console.log('Reason:', suggestion.reason);
  } else {
    console.log('❌ No suggestion found in SUPPLEMENT_CORRECTIONS');
  }

  // Step 3: Test Lambda Studies Fetcher directly
  console.log('\n🔬 Step 3: Testing Lambda Studies Fetcher');
  console.log('-'.repeat(60));
  try {
    const studiesUrl = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
    console.log('Calling:', studiesUrl);
    
    const studiesResponse = await fetch(studiesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'reishi',
        maxResults: 10,
        rctOnly: false,
        yearFrom: 2010,
        humanStudiesOnly: true,
      }),
    });

    console.log('Status:', studiesResponse.status);
    const studiesData = await studiesResponse.json();
    console.log('Studies found:', studiesData.data?.studies?.length || 0);
    
    if (studiesData.data?.studies?.length > 0) {
      console.log('\n✅ Studies found! Sample:');
      console.log(JSON.stringify(studiesData.data.studies.slice(0, 2), null, 2));
    } else {
      console.log('\n❌ No studies found');
      console.log('Response:', JSON.stringify(studiesData, null, 2));
    }
  } catch (error) {
    console.error('❌ Lambda call failed:', error);
  }

  // Step 4: Test with alternative terms
  console.log('\n🔄 Step 4: Testing Alternative Terms');
  console.log('-'.repeat(60));
  const alternatives = [
    'reishi mushroom',
    'ganoderma lucidum',
    'lingzhi',
  ];

  for (const term of alternatives) {
    try {
      console.log(`\nTrying: "${term}"`);
      const studiesUrl = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
      
      const response = await fetch(studiesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: term,
          maxResults: 10,
          rctOnly: false,
          yearFrom: 2010,
          humanStudiesOnly: true,
        }),
      });

      const data = await response.json();
      const count = data.data?.studies?.length || 0;
      console.log(`  → Found ${count} studies`);
      
      if (count > 0) {
        console.log(`  ✅ SUCCESS with "${term}"`);
        break;
      }
    } catch (error) {
      console.error(`  ❌ Error with "${term}":`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNOSIS COMPLETE\n');
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Add "reishi" → "Ganoderma lucidum" to query normalization');
  console.log('2. Add "reishi mushroom" as alternative search term');
  console.log('3. Implement LLM-based query expansion for unknown terms');
  
}

diagnoseReishi().catch(console.error);
