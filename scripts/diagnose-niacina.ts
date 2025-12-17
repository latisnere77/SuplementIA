#!/usr/bin/env tsx
/**
 * Diagnose Niacina Search Failure
 * Traces the complete flow to identify where it fails at 65%
 */

async function diagnoseNiacina() {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://suplementia.vercel.app';
  
  console.log('🔍 Diagnosing Niacina search failure...\n');
  
  // Step 1: Query normalization
  console.log('Step 1: Query Normalization');
  console.log('Input: "niacina"');
  console.log('Expected: Should normalize to "Niacin" (English)');
  console.log('');
  
  // Step 2: Try expansion endpoint
  console.log('Step 2: LLM Expansion');
  try {
    const expandResponse = await fetch(`${BASE_URL}/api/portal/expand-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'niacina' }),
    });
    
    if (expandResponse.ok) {
      const expandData = await expandResponse.json();
      console.log('✅ Expansion successful:', JSON.stringify(expandData, null, 2));
    } else {
      console.log('❌ Expansion failed:', expandResponse.status, await expandResponse.text());
    }
  } catch (error: any) {
    console.log('❌ Expansion error:', error.message);
  }
  console.log('');
  
  // Step 3: Try recommend endpoint
  console.log('Step 3: Recommend Endpoint');
  try {
    const recommendResponse = await fetch(`${BASE_URL}/api/portal/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'niacina',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });
    
    console.log('Status:', recommendResponse.status);
    const recommendData = await recommendResponse.json();
    
    if (recommendResponse.ok) {
      console.log('✅ Recommend successful');
      console.log('Supplement:', recommendData.recommendation?.supplement?.name);
      console.log('Studies:', recommendData.recommendation?.evidence_summary?.totalStudies);
      console.log('Has real data:', recommendData.recommendation?._enrichment_metadata?.hasRealData);
    } else {
      console.log('❌ Recommend failed');
      console.log('Error:', recommendData.error);
      console.log('Message:', recommendData.message);
      console.log('Full response:', JSON.stringify(recommendData, null, 2));
    }
  } catch (error: any) {
    console.log('❌ Recommend error:', error.message);
  }
  console.log('');
  
  // Step 4: Check if it's in the normalization map
  console.log('Step 4: Check Normalization Map');
  const normalizations = {
    'niacina': 'Niacin',
    'niacin': 'Niacin',
    'vitamina b3': 'Niacin',
    'vitamin b3': 'Niacin',
  };
  
  if (normalizations['niacina']) {
    console.log('✅ "niacina" is in normalization map → "Niacin"');
  } else {
    console.log('❌ "niacina" is NOT in normalization map');
  }
  console.log('');
  
  // Step 5: Direct Lambda test
  console.log('Step 5: Direct Lambda Studies Search');
  try {
    const studiesUrl = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
    
    // Try with Spanish term
    console.log('Trying with "niacina" (Spanish)...');
    const response1 = await fetch(studiesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'niacina',
        maxResults: 5,
        rctOnly: false,
        yearFrom: 2010,
      }),
    });
    
    const data1 = await response1.json();
    console.log('Studies found:', data1.data?.studies?.length || 0);
    
    // Try with English term
    console.log('Trying with "Niacin" (English)...');
    const response2 = await fetch(studiesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'Niacin',
        maxResults: 5,
        rctOnly: false,
        yearFrom: 2010,
      }),
    });
    
    const data2 = await response2.json();
    console.log('Studies found:', data2.data?.studies?.length || 0);
    
    if (data2.data?.studies?.length > 0) {
      console.log('✅ Studies found with English term "Niacin"');
      console.log('First study:', data2.data.studies[0].title);
    } else {
      console.log('❌ No studies found even with English term');
    }
  } catch (error: any) {
    console.log('❌ Lambda error:', error.message);
  }
  console.log('');
  
  console.log('📊 Diagnosis Summary:');
  console.log('The issue is likely:');
  console.log('1. Query normalization not happening (niacina → Niacin)');
  console.log('2. LLM expansion timing out or failing');
  console.log('3. Lambda not finding studies with Spanish term');
  console.log('');
  console.log('Solution: Ensure query-normalization.ts has "niacina" → "Niacin" mapping');
}

diagnoseNiacina().catch(console.error);
