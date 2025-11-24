/**
 * Test script to validate Kefir search with actual PubMed queries
 * Tests if variations find real studies
 */

import { generateSearchVariations } from '../lib/services/abbreviation-expander';

const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

async function testPubMedSearch(term: string): Promise<{ found: boolean; count: number }> {
  try {
    const response = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `test-${Date.now()}`,
      },
      body: JSON.stringify({
        supplementName: term,
        maxResults: 5, // Just check if any studies exist
        filters: {
          rctOnly: false,
          yearFrom: 2000,
          humanStudiesOnly: true,
        },
      }),
    });

    const data = await response.json();
    
    if (data.success && data.data?.studies && data.data.studies.length > 0) {
      return { found: true, count: data.data.studies.length };
    }
    
    return { found: false, count: 0 };
  } catch (error: any) {
    console.error(`   ❌ Error searching PubMed: ${error.message}`);
    return { found: false, count: 0 };
  }
}

async function testKefirSearch() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Kefir Search with Real PubMed Queries');
  console.log('='.repeat(60));
  console.log('');

  const testTerm = 'Kefir';
  console.log(`📝 Testing term: "${testTerm}"`);
  console.log('');

  // Step 1: Test base term
  console.log('1️⃣  Testing base term "Kefir"...');
  const baseResult = await testPubMedSearch(testTerm);
  if (baseResult.found) {
    console.log(`   ✅ Found ${baseResult.count} studies with base term`);
    console.log('   💡 Base term works! No need for variations.');
    return;
  } else {
    console.log(`   ❌ No studies found with base term`);
    console.log('   💡 System will generate variations...');
  }
  console.log('');

  // Step 2: Generate variations
  console.log('2️⃣  Generating search variations...');
  const variations = await generateSearchVariations(testTerm);
  console.log(`   ✅ Generated ${variations.length} variations`);
  console.log('');

  // Step 3: Test each variation
  console.log('3️⃣  Testing each variation in PubMed...');
  let foundVariation: string | null = null;
  let foundCount = 0;

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    process.stdout.write(`   Testing "${variation}"... `);
    
    const result = await testPubMedSearch(variation);
    
    if (result.found) {
      console.log(`✅ Found ${result.count} studies!`);
      if (!foundVariation) {
        foundVariation = variation;
        foundCount = result.count;
      }
    } else {
      console.log(`❌ No studies`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Base term "Kefir": ${baseResult.found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (foundVariation) {
    console.log(`✅ Successful variation: "${foundVariation}" (${foundCount} studies)`);
    console.log('');
    console.log('💡 System behavior:');
    console.log('   1. Will try "Kefir" first → No studies');
    console.log(`   2. Will generate variations → Try "${foundVariation}"`);
    console.log(`   3. Will find ${foundCount} studies → Return real data ✅`);
  } else {
    console.log('❌ No variations found studies');
    console.log('');
    console.log('⚠️  System behavior:');
    console.log('   1. Will try "Kefir" first → No studies');
    console.log('   2. Will generate variations → Try all variations');
    console.log('   3. No studies found → Return 404 (insufficient_data)');
  }
  console.log('');
}

// Run test
testKefirSearch().catch(console.error);

