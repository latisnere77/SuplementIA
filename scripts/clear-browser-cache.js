/**
 * Clear Browser LocalStorage Cache
 *
 * Run this script in the browser console to clear cached recommendations
 * that contain fake/generated data.
 *
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 */

(function clearFakeSupplementCache() {
  console.log('🗑️  Clearing fake supplement cache from localStorage...');

  let cleared = 0;
  let total = 0;

  // Iterate through all localStorage keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);

    if (!key || !key.startsWith('recommendation_')) {
      continue;
    }

    total++;

    try {
      const data = JSON.parse(localStorage.getItem(key));
      const recommendation = data?.recommendation;

      if (!recommendation) {
        console.log(`⚠️  Removing invalid entry: ${key}`);
        localStorage.removeItem(key);
        cleared++;
        continue;
      }

      // Check if this recommendation has fake data
      const metadata = recommendation._enrichment_metadata || {};
      const totalStudies = recommendation.evidence_summary?.totalStudies || 0;
      const studiesUsed = metadata.studiesUsed || 0;

      // If totalStudies > 0 but studiesUsed = 0, this is fake/generated data
      const hasFakeData = totalStudies > 0 && studiesUsed === 0;

      // Also check for known fake supplement names
      const category = recommendation.category?.toLowerCase() || '';
      const fakeSupplement = [
        'enzima q15',
        'enzima q12',
        'q20',
        'q30',
        'q40',
        'q50',
        'xyz',
        'abc123',
        'test',
      ].some(fake => category.includes(fake));

      if (hasFakeData || fakeSupplement) {
        console.log(`❌ Removing fake data: ${key} (${recommendation.category})`);
        console.log(`   - totalStudies: ${totalStudies}, studiesUsed: ${studiesUsed}`);
        localStorage.removeItem(key);
        cleared++;
      } else {
        console.log(`✅ Keeping valid data: ${key} (${recommendation.category})`);
      }
    } catch (error) {
      console.error(`⚠️  Error processing ${key}:`, error);
      localStorage.removeItem(key);
      cleared++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Total recommendations checked: ${total}`);
  console.log(`Fake data removed: ${cleared}`);
  console.log(`Valid data kept: ${total - cleared}`);
  console.log('='.repeat(60));
  console.log('✅ Browser cache cleanup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Try searching for "Enzima q15" - you should see the error page');
  console.log('2. Click the "Buscar CoQ10" button to see the correct supplement');

})();
