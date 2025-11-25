/**
 * Analytics Report Generator
 * 
 * Generates a comprehensive report of search analytics
 * Helps identify which supplements need mappings
 */

import { searchAnalytics, generateAnalyticsReport } from '../lib/portal/search-analytics';

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 GENERATING SEARCH ANALYTICS REPORT');
  console.log('='.repeat(80) + '\n');

  // Generate and display report
  const report = generateAnalyticsReport();
  console.log(report);

  // Export data for further analysis
  const exportData = searchAnalytics.exportData();
  
  console.log('📁 EXPORT DATA SUMMARY:');
  console.log(`  Total Events: ${exportData.events.length}`);
  console.log(`  Failed Searches: ${exportData.failedSearches.length}`);
  console.log(`  Exported At: ${exportData.exportedAt}\n`);

  // Show searches that need immediate attention
  const needMappings = searchAnalytics.getSearchesNeedingMappings(2);
  
  if (needMappings.length > 0) {
    console.log('🚨 IMMEDIATE ACTION NEEDED:');
    console.log('   These searches failed multiple times and need mappings:\n');
    
    needMappings.forEach((fs, i) => {
      console.log(`   ${i + 1}. Add mapping for: "${fs.normalizedQuery}"`);
      console.log(`      Original query: "${fs.query}"`);
      console.log(`      Failed ${fs.count} times`);
      console.log(`      First seen: ${new Date(fs.firstSeen).toLocaleString()}`);
      console.log(`      Last seen: ${new Date(fs.lastSeen).toLocaleString()}`);
      
      if (fs.suggestions.length > 0) {
        console.log(`      Suggested alternatives: ${fs.suggestions.join(', ')}`);
      }
      console.log('');
    });
  }

  console.log('='.repeat(80));
  console.log('✅ REPORT COMPLETE\n');
}

// Run report
generateReport().catch(console.error);
