#!/usr/bin/env tsx

/**
 * Diagnostic script for "schisandra chinensis" search failure
 */

const STUDIES_API_URL = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

async function diagnoseSchisandra() {
  console.log('🔍 DIAGNOSING: "schisandra chinensis" search failure\n');
  console.log('=' .repeat(60));

  // Test 1: Direct PubMed search with exact term
  console.log('\n📍 TEST 1: Direct search for "schisandra chinensis"');
  console.log('-'.repeat(60));
  
  try {
    const response1 = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'schisandra chinensis',
        maxResults: 10,
        filters: {
          rctOnly: false,
          yearFrom: 2010,
          yearTo: 2025,
          humanStudiesOnly: true,
        },
      }),
    });

    const data1 = await response1.json();
    console.log(`Status: ${response1.status}`);
    console.log(`Success: ${data1.success}`);
    console.log(`Studies found: ${data1.data?.studies?.length || 0}`);
    
    if (data1.data?.studies?.length > 0) {
      console.log('\n✅ Studies found with exact term!');
      console.log('Sample studies:');
      data1.data.studies.slice(0, 3).forEach((study: any, i: number) => {
        console.log(`  ${i + 1}. ${study.title}`);
        console.log(`     PMID: ${study.pmid}`);
      });
    } else {
      console.log('\n❌ No studies found with exact term');
      console.log('Response:', JSON.stringify(data1, null, 2));
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Try just "schisandra"
  console.log('\n\n📍 TEST 2: Search for "schisandra" (without chinensis)');
  console.log('-'.repeat(60));
  
  try {
    const response2 = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'schisandra',
        maxResults: 10,
        filters: {
          rctOnly: false,
          yearFrom: 2010,
          yearTo: 2025,
          humanStudiesOnly: true,
        },
      }),
    });

    const data2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Success: ${data2.success}`);
    console.log(`Studies found: ${data2.data?.studies?.length || 0}`);
    
    if (data2.data?.studies?.length > 0) {
      console.log('\n✅ Studies found with "schisandra"!');
      console.log('Sample studies:');
      data2.data.studies.slice(0, 3).forEach((study: any, i: number) => {
        console.log(`  ${i + 1}. ${study.title}`);
        console.log(`     PMID: ${study.pmid}`);
      });
    } else {
      console.log('\n❌ No studies found with "schisandra"');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Try with relaxed filters
  console.log('\n\n📍 TEST 3: Search with relaxed filters (no humanStudiesOnly)');
  console.log('-'.repeat(60));
  
  try {
    const response3 = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'schisandra chinensis',
        maxResults: 10,
        filters: {
          rctOnly: false,
          yearFrom: 2000,
          yearTo: 2025,
          humanStudiesOnly: false, // Allow all studies
        },
      }),
    });

    const data3 = await response3.json();
    console.log(`Status: ${response3.status}`);
    console.log(`Success: ${data3.success}`);
    console.log(`Studies found: ${data3.data?.studies?.length || 0}`);
    
    if (data3.data?.studies?.length > 0) {
      console.log('\n✅ Studies found with relaxed filters!');
      console.log('Sample studies:');
      data3.data.studies.slice(0, 3).forEach((study: any, i: number) => {
        console.log(`  ${i + 1}. ${study.title}`);
        console.log(`     PMID: ${study.pmid}`);
        console.log(`     Type: ${study.studyType || 'N/A'}`);
      });
    } else {
      console.log('\n❌ No studies found even with relaxed filters');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Test 4: Try alternative spellings
  console.log('\n\n📍 TEST 4: Try alternative spellings');
  console.log('-'.repeat(60));
  
  const alternatives = [
    'schizandra',
    'schisandra berry',
    'wu wei zi',
    'five flavor berry',
  ];

  for (const alt of alternatives) {
    console.log(`\nTrying: "${alt}"`);
    try {
      const response = await fetch(STUDIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: alt,
          maxResults: 5,
          filters: {
            rctOnly: false,
            yearFrom: 2010,
            yearTo: 2025,
            humanStudiesOnly: true,
          },
        }),
      });

      const data = await response.json();
      console.log(`  Studies found: ${data.data?.studies?.length || 0}`);
      
      if (data.data?.studies?.length > 0) {
        console.log(`  ✅ SUCCESS with "${alt}"!`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 DIAGNOSIS COMPLETE\n');
}

diagnoseSchisandra().catch(console.error);
