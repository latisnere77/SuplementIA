/**
 * Test Script for Intelligent Search System
 * Validates all modules independently and together
 */

import { config } from './config';

// Test 1: PubMed Client
async function testPubMedClient() {
  console.log('\n=== TEST 1: PubMed Client ===');
  
  try {
    const { pubmedClient } = await import('./pubmed/client');
    
    // Test rate limiting
    const start = Date.now();
    await pubmedClient.request(
      pubmedClient.buildUrl('esearch', {
        db: 'pubmed',
        term: 'magnesium',
        retmax: '1',
        retmode: 'json',
      })
    );
    const duration = Date.now() - start;
    
    console.log('✅ PubMed Client working');
    console.log(`   Rate limiting: ${duration}ms`);
    console.log(`   API Key: ${config.pubmedApiKey ? 'Present' : 'Not configured'}`);
    
    return true;
  } catch (error) {
    console.error('❌ PubMed Client failed:', error);
    return false;
  }
}

// Test 2: Query Builder
async function testQueryBuilder() {
  console.log('\n=== TEST 2: Query Builder ===');
  
  try {
    const {
      buildMainQuery,
      buildHighQualityQuery,
      buildRecentQuery,
      buildNegativeQuery,
      buildSystematicReviewQuery,
    } = await import('./pubmed/queryBuilder');
    
    const queries = {
      main: buildMainQuery({ supplementName: 'magnesium glycinate' }),
      highQuality: buildHighQualityQuery('magnesium'),
      recent: buildRecentQuery('magnesium', 5),
      negative: buildNegativeQuery('magnesium'),
      systematic: buildSystematicReviewQuery('magnesium'),
    };
    
    console.log('✅ Query Builder working');
    console.log('   Sample queries:');
    Object.entries(queries).forEach(([name, query]) => {
      console.log(`   ${name}: ${query.substring(0, 80)}...`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Query Builder failed:', error);
    return false;
  }
}

// Test 3: ESearch
async function testESearch() {
  console.log('\n=== TEST 3: ESearch ===');
  
  try {
    const { eSearch } = await import('./pubmed/eSearch');
    
    const result = await eSearch({
      term: 'magnesium[tiab]',
      retmax: 5,
      sort: 'relevance',
    });
    
    console.log('✅ ESearch working');
    console.log(`   Total found: ${result.count}`);
    console.log(`   IDs returned: ${result.idList.length}`);
    console.log(`   Sample PMIDs: ${result.idList.slice(0, 3).join(', ')}`);
    
    return result.idList.length > 0;
  } catch (error) {
    console.error('❌ ESearch failed:', error);
    return false;
  }
}

// Test 4: EFetch
async function testEFetch() {
  console.log('\n=== TEST 4: EFetch ===');
  
  try {
    const { eFetch } = await import('./pubmed/eFetch');
    
    // Use known PMIDs
    const studies = await eFetch({
      id: ['36543174', '35977497'], // Real magnesium studies
    });
    
    console.log('✅ EFetch working');
    console.log(`   Studies fetched: ${studies.length}`);
    
    if (studies.length > 0) {
      const study = studies[0];
      console.log(`   Sample study:`);
      console.log(`     PMID: ${study.pmid}`);
      console.log(`     Title: ${study.title.substring(0, 60)}...`);
      console.log(`     Year: ${study.year}`);
      console.log(`     Type: ${study.studyType || 'N/A'}`);
      console.log(`     Journal: ${study.journal?.substring(0, 40) || 'N/A'}`);
    }
    
    return studies.length > 0;
  } catch (error) {
    console.error('❌ EFetch failed:', error);
    return false;
  }
}

// Test 5: History Server
async function testHistoryServer() {
  console.log('\n=== TEST 5: History Server ===');
  
  try {
    const { multiSearchWithHistory } = await import('./pubmed/historyServer');
    
    const queries = [
      'magnesium[tiab] AND randomized controlled trial[pt]',
      'magnesium[tiab] AND meta-analysis[pt]',
    ];
    
    const { studies, session } = await multiSearchWithHistory(queries, {
      retmax: 10,
    });
    
    console.log('✅ History Server working');
    console.log(`   Queries combined: ${queries.length}`);
    console.log(`   Studies found: ${studies.length}`);
    console.log(`   WebEnv: ${session.webEnv.substring(0, 20)}...`);
    console.log(`   QueryKeys: ${session.queryKeys.join(', ')}`);
    
    return studies.length > 0;
  } catch (error) {
    console.error('❌ History Server failed:', error);
    return false;
  }
}

// Test 6: Multi-Strategy Search
async function testMultiStrategySearch() {
  console.log('\n=== TEST 6: Multi-Strategy Search ===');
  
  try {
    const { multiStrategySearch } = await import('./search/strategies');
    
    const studies = await multiStrategySearch('magnesium', {
      maxResults: 30,
      includeNegativeSearch: true,
      includeSystematicReviews: true,
    });
    
    console.log('✅ Multi-Strategy Search working');
    console.log(`   Total studies: ${studies.length}`);
    
    // Analyze study types
    const types = studies.reduce((acc, s) => {
      const type = s.studyType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Study types:');
    Object.entries(types).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    
    // Check for Cochrane
    const cochrane = studies.filter(s => 
      s.journal?.toLowerCase().includes('cochrane')
    );
    console.log(`   Cochrane reviews: ${cochrane.length}`);
    
    return studies.length > 0;
  } catch (error) {
    console.error('❌ Multi-Strategy Search failed:', error);
    return false;
  }
}

// Test 7: Scorer
async function testScorer() {
  console.log('\n=== TEST 7: Study Scorer ===');
  
  try {
    const { scoreStudy } = await import('./scoring/scorer');
    
    // Mock studies with different characteristics
    const testStudies = [
      {
        pmid: '1',
        title: 'Cochrane Review',
        journal: 'Cochrane Database Syst Rev',
        studyType: 'systematic review',
        year: 2023,
        participants: 1000,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
      {
        pmid: '2',
        title: 'Meta-analysis',
        journal: 'JAMA',
        studyType: 'meta-analysis',
        year: 2022,
        participants: 500,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
      {
        pmid: '3',
        title: 'RCT',
        journal: 'Journal of Nutrition',
        studyType: 'randomized controlled trial',
        year: 2020,
        participants: 100,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
    ];
    
    const scores = testStudies.map(s => scoreStudy(s));
    
    console.log('✅ Scorer working');
    scores.forEach((score, i) => {
      console.log(`   Study ${i + 1}:`);
      console.log(`     Total: ${score.totalScore}`);
      console.log(`     Methodology: ${score.breakdown.methodologyScore}`);
      console.log(`     Recency: ${score.breakdown.recencyScore}`);
      console.log(`     Sample: ${score.breakdown.sampleSizeScore}`);
      console.log(`     Quality: ${score.qualityTier}`);
    });
    
    // Verify Cochrane gets highest score
    const cochraneScore = scores[0].totalScore;
    const othersMax = Math.max(...scores.slice(1).map(s => s.totalScore));
    
    if (cochraneScore > othersMax) {
      console.log('   ✓ Cochrane correctly scored highest');
    } else {
      console.log('   ⚠️  Cochrane not scored highest');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Scorer failed:', error);
    return false;
  }
}

// Test 8: Sentiment Analyzer (requires Bedrock)
async function testSentimentAnalyzer() {
  console.log('\n=== TEST 8: Sentiment Analyzer ===');
  
  try {
    const { analyzeSentiment } = await import('./scoring/sentiment');
    
    const testStudy = {
      pmid: 'test',
      title: 'Magnesium supplementation improves sleep quality',
      abstract: 'This randomized controlled trial found that magnesium supplementation significantly improved sleep quality in elderly participants. The treatment group showed marked improvements compared to placebo.',
      year: 2023,
      journal: 'Sleep Medicine',
      pubmedUrl: 'test',
    };
    
    const sentiment = await analyzeSentiment(testStudy, 'magnesium');
    
    console.log('✅ Sentiment Analyzer working');
    console.log(`   Sentiment: ${sentiment.sentiment}`);
    console.log(`   Confidence: ${(sentiment.confidence * 100).toFixed(0)}%`);
    console.log(`   Reasoning: ${sentiment.reasoning}`);
    
    return sentiment.sentiment === 'positive';
  } catch (error) {
    console.error('❌ Sentiment Analyzer failed:', error);
    console.error('   Note: Requires AWS Bedrock access');
    return false;
  }
}

// Test 9: Full Integration
async function testFullIntegration() {
  console.log('\n=== TEST 9: Full Integration ===');
  
  try {
    const { multiStrategySearch } = await import('./search/strategies');
    const { rankStudies } = await import('./scoring/ranker');
    
    console.log('Searching for "vitamin d"...');
    const studies = await multiStrategySearch('vitamin d', {
      maxResults: 20,
      includeNegativeSearch: true,
    });
    
    console.log(`Found ${studies.length} studies`);
    console.log('Ranking studies...');
    
    const ranked = await rankStudies(studies, 'vitamin d', {
      topPositive: 5,
      topNegative: 5,
      minConfidence: 0.5,
    });
    
    console.log('✅ Full Integration working');
    console.log('\n📊 Results:');
    console.log(`   Positive studies: ${ranked.positive.length}`);
    console.log(`   Negative studies: ${ranked.negative.length}`);
    console.log(`   Consensus: ${ranked.metadata.consensus}`);
    console.log(`   Confidence: ${ranked.metadata.confidenceScore}/100`);
    console.log(`   Total positive: ${ranked.metadata.totalPositive}`);
    console.log(`   Total negative: ${ranked.metadata.totalNegative}`);
    console.log(`   Total neutral: ${ranked.metadata.totalNeutral}`);
    
    console.log('\n🏆 Top Positive Studies:');
    ranked.positive.slice(0, 3).forEach((s, i) => {
      console.log(`   ${i + 1}. [Score: ${s.score.totalScore}] ${s.study.title.substring(0, 60)}...`);
      console.log(`      ${s.study.year} | ${s.study.studyType || 'N/A'}`);
      console.log(`      Sentiment: ${s.sentiment.sentiment} (${(s.sentiment.confidence * 100).toFixed(0)}%)`);
    });
    
    console.log('\n⚠️  Top Negative Studies:');
    ranked.negative.slice(0, 3).forEach((s, i) => {
      console.log(`   ${i + 1}. [Score: ${s.score.totalScore}] ${s.study.title.substring(0, 60)}...`);
      console.log(`      ${s.study.year} | ${s.study.studyType || 'N/A'}`);
      console.log(`      Sentiment: ${s.sentiment.sentiment} (${(s.sentiment.confidence * 100).toFixed(0)}%)`);
    });
    
    return ranked.positive.length > 0 && ranked.negative.length > 0;
  } catch (error) {
    console.error('❌ Full Integration failed:', error);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 INTELLIGENT SEARCH SYSTEM - VALIDATION TESTS');
  console.log('================================================\n');
  
  const tests = [
    { name: 'PubMed Client', fn: testPubMedClient, critical: true },
    { name: 'Query Builder', fn: testQueryBuilder, critical: true },
    { name: 'ESearch', fn: testESearch, critical: true },
    { name: 'EFetch', fn: testEFetch, critical: true },
    { name: 'History Server', fn: testHistoryServer, critical: true },
    { name: 'Multi-Strategy Search', fn: testMultiStrategySearch, critical: true },
    { name: 'Scorer', fn: testScorer, critical: true },
    { name: 'Sentiment Analyzer', fn: testSentimentAnalyzer, critical: false },
    { name: 'Full Integration', fn: testFullIntegration, critical: false },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed, critical: test.critical });
    } catch (error) {
      console.error(`\n❌ ${test.name} threw exception:`, error);
      results.push({ name: test.name, passed: false, critical: test.critical });
    }
  }
  
  // Summary
  console.log('\n\n📋 TEST SUMMARY');
  console.log('================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.critical).length;
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const critical = r.critical ? ' [CRITICAL]' : '';
    console.log(`${icon} ${r.name}${critical}`);
  });
  
  console.log(`\nTotal: ${passed}/${results.length} passed`);
  
  if (criticalFailed > 0) {
    console.log(`\n⚠️  ${criticalFailed} critical tests failed!`);
    console.log('System is NOT ready for integration.');
    process.exit(1);
  } else if (failed > 0) {
    console.log(`\n⚠️  ${failed} non-critical tests failed.`);
    console.log('System is ready for integration with limitations.');
  } else {
    console.log('\n✅ All tests passed!');
    console.log('System is ready for integration.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
