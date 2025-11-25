/**
 * Diagnostic script for Agmatine Sulfate enrichment
 * Tests the complete flow from normalization to enrichment
 */

import { normalizeQuery } from '../lib/portal/query-normalization';
import { getSupplementMapping } from '../lib/portal/supplement-mappings';

async function diagnoseAgmatine() {
  console.log('====================================================================================================');
  console.log('🔍 DIAGNOSTIC: Agmatine Sulfate Enrichment Flow');
  console.log('====================================================================================================\n');

  // Test queries
  const queries = [
    'agmatina sulfato',
    'agmatine sulfate',
    'Agmatina',
    'Agmatine',
  ];

  for (const query of queries) {
    console.log(`\n📝 Testing query: "${query}"`);
    console.log('─'.repeat(100));

    // Step 1: Normalization
    const normalized = normalizeQuery(query);
    console.log(`✓ Normalized: "${normalized.normalized}" (confidence: ${normalized.confidence})`);
    if (normalized.corrections && normalized.corrections.length > 0) {
      console.log(`  Corrections applied: ${normalized.corrections.join(', ')}`);
    }

    // Step 2: Mapping
    const mapping = getSupplementMapping(normalized.normalized);
    if (mapping) {
      console.log(`✓ Mapping found:`);
      console.log(`  - Normalized Name: ${mapping.normalizedName}`);
      console.log(`  - Scientific Name: ${mapping.scientificName || 'N/A'}`);
      console.log(`  - Common Names: ${mapping.commonNames.join(', ')}`);
      console.log(`  - Category: ${mapping.category}`);
      console.log(`  - PubMed Query: ${mapping.pubmedQuery}`);
      console.log(`  - Popularity: ${mapping.popularity}`);
    } else {
      console.log(`❌ No mapping found`);
    }

    // Step 3: Test enrichment endpoint
    console.log(`\n🔄 Testing enrichment endpoint...`);
    try {
      const enrichResponse = await fetch('http://localhost:3000/api/portal/enrich-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplementName: mapping?.normalizedName || normalized.normalized,
          category: mapping?.normalizedName || normalized.normalized,
          forceRefresh: false,
          maxStudies: 10,
          rctOnly: false,
          yearFrom: 2010,
          customPubMedQuery: mapping?.pubmedQuery,
        }),
      });

      if (enrichResponse.ok) {
        const enrichData = await enrichResponse.json();
        console.log(`✓ Enrichment successful:`);
        console.log(`  - Success: ${enrichData.success}`);
        console.log(`  - Has Data: ${!!enrichData.data}`);
        console.log(`  - Studies Used: ${enrichData.metadata?.studiesUsed || 0}`);
        console.log(`  - Has Real Data: ${enrichData.metadata?.hasRealData || false}`);
        
        if (enrichData.data) {
          console.log(`  - Name: ${enrichData.data.name}`);
          console.log(`  - Works For: ${enrichData.data.worksFor?.length || 0} items`);
          console.log(`  - Dosage: ${enrichData.data.dosage ? 'Yes' : 'No'}`);
        }
      } else {
        const errorText = await enrichResponse.text();
        console.log(`❌ Enrichment failed (${enrichResponse.status}):`);
        console.log(`  ${errorText.substring(0, 200)}`);
      }
    } catch (error: any) {
      console.log(`❌ Enrichment error: ${error.message}`);
    }
  }

  console.log('\n====================================================================================================');
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('====================================================================================================');
}

// Run diagnostic
diagnoseAgmatine().catch(console.error);
