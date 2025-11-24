/**
 * Test New Supplements Normalization
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

function testNewSupplements() {
  console.log('🧪 TESTING NEW SUPPLEMENTS NORMALIZATION\n');
  console.log('='.repeat(60));

  const testCases = [
    // Multivitamins
    'multivitaminico',
    'multivitamin',
    'multimineral',
    
    // Oils
    'vinagre de sidra de manzana',
    'apple cider vinegar',
    'acv',
    'aceite de coco',
    'coconut oil',
    'mct oil',
    'aceite de onagra',
    'evening primrose oil',
    'linaza',
    'flaxseed',
    
    // Herbs
    'ajo',
    'garlic',
    'arandano rojo',
    'cranberry',
    'aloe vera',
    
    // Others
    'dhea',
    'lecitina',
    'lecithin',
    
    // Protein variants
    'proteina en polvo',
    'protein powder',
    'whey isolate',
    'proteina vegana',
  ];

  console.log('\n📝 Normalization Tests');
  console.log('-'.repeat(60));
  
  for (const query of testCases) {
    const normalized = normalizeQuery(query);
    const status = normalized.confidence >= 0.9 ? '✅' : normalized.confidence >= 0.5 ? '⚠️' : '❌';
    console.log(`${status} "${query}" → "${normalized.normalized}" (${normalized.confidence})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE\n');
}

testNewSupplements();
