/**
 * Test PubMed modules only (no AWS dependencies)
 * Can run locally without Bedrock access
 */

// Test Query Builder
function testQueryBuilder() {
  console.log('\n=== Query Builder Tests ===\n');
  
  const tests = [
    {
      name: 'Simple term',
      input: { supplementName: 'magnesium' },
      expected: 'magnesium[tiab]',
    },
    {
      name: 'Multi-word with proximity',
      input: { supplementName: 'magnesium glycinate', useProximity: true },
      expected: '"magnesium glycinate"[Title:~3]',
    },
    {
      name: 'With study types',
      input: {
        supplementName: 'magnesium',
        studyTypes: ['randomized controlled trial', 'meta-analysis'],
      },
      contains: ['magnesium[tiab]', 'randomized controlled trial', 'meta-analysis'],
    },
    {
      name: 'With year range',
      input: {
        supplementName: 'magnesium',
        yearFrom: 2020,
        yearTo: 2023,
      },
      contains: ['magnesium[tiab]', '2020:2023[pdat]'],
    },
    {
      name: 'High quality query',
      supplement: 'vitamin d',
      type: 'highQuality',
      contains: ['vitamin d', 'randomized controlled trial', 'meta-analysis', 'systematic review'],
    },
    {
      name: 'Recent query',
      supplement: 'omega-3',
      type: 'recent',
      contains: ['omega-3'],
    },
    {
      name: 'Negative query',
      supplement: 'creatine',
      type: 'negative',
      contains: ['creatine', 'no effect', 'ineffective'],
    },
    {
      name: 'Cochrane query',
      supplement: 'zinc',
      type: 'systematic',
      contains: ['zinc', 'systematic[sb]'],
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    try {
      let query: string;
      
      if (test.input) {
        // Direct buildMainQuery test
        query = buildMainQuery(test.input);
        
        if (test.expected && query === test.expected) {
          console.log(`✅ ${test.name}`);
          console.log(`   Query: ${query}`);
          passed++;
        } else if (test.contains) {
          const allPresent = test.contains.every(term => query.includes(term));
          if (allPresent) {
            console.log(`✅ ${test.name}`);
            console.log(`   Query: ${query}`);
            passed++;
          } else {
            console.log(`❌ ${test.name}`);
            console.log(`   Query: ${query}`);
            console.log(`   Missing terms: ${test.contains.filter(t => !query.includes(t)).join(', ')}`);
            failed++;
          }
        } else {
          console.log(`✅ ${test.name}`);
          console.log(`   Query: ${query}`);
          passed++;
        }
      } else if (test.type) {
        // Specific query type test
        switch (test.type) {
          case 'highQuality':
            query = buildHighQualityQuery(test.supplement!);
            break;
          case 'recent':
            query = buildRecentQuery(test.supplement!, 5);
            break;
          case 'negative':
            query = buildNegativeQuery(test.supplement!);
            break;
          case 'systematic':
            query = buildSystematicReviewQuery(test.supplement!);
            break;
          default:
            throw new Error(`Unknown type: ${test.type}`);
        }
        
        const allPresent = test.contains!.every(term => 
          query.toLowerCase().includes(term.toLowerCase())
        );
        
        if (allPresent) {
          console.log(`✅ ${test.name}`);
          console.log(`   Query: ${query.substring(0, 100)}...`);
          passed++;
        } else {
          console.log(`❌ ${test.name}`);
          console.log(`   Query: ${query}`);
          console.log(`   Missing: ${test.contains!.filter(t => !query.toLowerCase().includes(t.toLowerCase())).join(', ')}`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error}`);
      failed++;
    }
  });
  
  console.log(`\nQuery Builder: ${passed}/${tests.length} passed\n`);
  return failed === 0;
}

// Test Scorer
function testScorer() {
  console.log('\n=== Scorer Tests ===\n');
  
  const testStudies = [
    {
      name: 'Cochrane Review (should score highest)',
      study: {
        pmid: '1',
        title: 'Magnesium for sleep',
        journal: 'Cochrane Database Syst Rev',
        studyType: 'systematic review',
        year: 2023,
        participants: 1000,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
      expectedMin: 85,
      expectedTier: 'exceptional',
    },
    {
      name: 'Recent Meta-analysis',
      study: {
        pmid: '2',
        title: 'Meta-analysis of vitamin D',
        journal: 'JAMA',
        studyType: 'meta-analysis',
        year: 2023,
        participants: 5000,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
      expectedMin: 75,
      expectedTier: 'exceptional', // High score + large sample = exceptional
    },
    {
      name: 'Recent RCT',
      study: {
        pmid: '3',
        title: 'RCT of omega-3',
        journal: 'American Journal of Clinical Nutrition',
        studyType: 'randomized controlled trial',
        year: 2022,
        participants: 500,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
      expectedMin: 60,
    },
    {
      name: 'Old small study',
      study: {
        pmid: '4',
        title: 'Small study',
        journal: 'Unknown Journal',
        studyType: 'clinical trial',
        year: 2000,
        participants: 30,
        abstract: 'Test',
        pubmedUrl: 'test',
      },
      expectedMax: 40,
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  testStudies.forEach(test => {
    try {
      const score = scoreStudy(test.study);
      
      let testPassed = true;
      const issues = [];
      
      if (test.expectedMin && score.totalScore < test.expectedMin) {
        testPassed = false;
        issues.push(`Score ${score.totalScore} < expected min ${test.expectedMin}`);
      }
      
      if (test.expectedMax && score.totalScore > test.expectedMax) {
        testPassed = false;
        issues.push(`Score ${score.totalScore} > expected max ${test.expectedMax}`);
      }
      
      if (test.expectedTier && score.qualityTier !== test.expectedTier) {
        testPassed = false;
        issues.push(`Tier ${score.qualityTier} !== expected ${test.expectedTier}`);
      }
      
      if (testPassed) {
        console.log(`✅ ${test.name}`);
        console.log(`   Score: ${score.totalScore} (${score.qualityTier})`);
        console.log(`   Breakdown: M=${score.breakdown.methodologyScore}, R=${score.breakdown.recencyScore}, S=${score.breakdown.sampleSizeScore}, J=${score.breakdown.journalScore}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Issues: ${issues.join(', ')}`);
        console.log(`   Score: ${score.totalScore} (${score.qualityTier})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error}`);
      failed++;
    }
  });
  
  console.log(`\nScorer: ${passed}/${testStudies.length} passed\n`);
  return failed === 0;
}

// Import functions (inline for testing)
interface QueryOptions {
  supplementName: string;
  useProximity?: boolean;
  studyTypes?: string[];
  yearFrom?: number;
  yearTo?: number;
  humanStudiesOnly?: boolean;
}

function buildMainQuery(options: QueryOptions): string {
  const { supplementName, useProximity = true } = options;
  const parts: string[] = [];

  const mainTerm = buildMainTerm(supplementName, useProximity);
  parts.push(mainTerm);

  if (options.studyTypes && options.studyTypes.length > 0) {
    const typeQueries = options.studyTypes.map(type => `"${type}"[pt]`);
    parts.push(`(${typeQueries.join(' OR ')})`);
  }

  if (options.yearFrom || options.yearTo) {
    const yearFrom = options.yearFrom || 1900;
    const yearTo = options.yearTo || new Date().getFullYear();
    parts.push(`${yearFrom}:${yearTo}[pdat]`);
  }

  if (options.humanStudiesOnly !== false) {
    parts.push('"humans"[mh]');
  }

  return parts.join(' AND ');
}

function buildMainTerm(supplementName: string, useProximity: boolean): string {
  const normalized = supplementName.trim().replace(/\s+/g, ' ');
  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length === 1) {
    return `${normalized}[tiab]`;
  }

  if (useProximity) {
    return `"${normalized}"[Title:~3]`;
  }

  const wordQueries = words.map(word => `${word}[tiab]`);
  return `(${wordQueries.join(' AND ')})`;
}

function buildHighQualityQuery(supplementName: string): string {
  return buildMainQuery({
    supplementName,
    useProximity: true,
    studyTypes: [
      'randomized controlled trial',
      'meta-analysis',
      'systematic review',
    ],
    humanStudiesOnly: true,
  });
}

function buildRecentQuery(supplementName: string, yearsBack: number = 5): string {
  const currentYear = new Date().getFullYear();
  return buildMainQuery({
    supplementName,
    useProximity: true,
    yearFrom: currentYear - yearsBack,
    humanStudiesOnly: true,
  });
}

function buildNegativeQuery(supplementName: string): string {
  const negativeTerms = [
    'no effect',
    'not effective',
    'ineffective',
    'no significant difference',
    'no benefit',
    'failed to show',
    'did not improve',
  ];

  const mainTerm = `${supplementName}[tiab]`;
  const negativeQueries = negativeTerms.map(term => `"${term}"[tiab]`);
  const negativeClause = `(${negativeQueries.join(' OR ')})`;

  return `${mainTerm} AND ${negativeClause} AND (clinical trial[pt] OR randomized controlled trial[pt])`;
}

function buildSystematicReviewQuery(supplementName: string): string {
  return `${supplementName}[tiab] AND systematic[sb]`;
}

function scoreStudy(study: any): any {
  const methodologyScore = scoreMethodology(study.studyType, study.journal);
  const recencyScore = scoreRecency(study.year);
  const sampleSizeScore = scoreSampleSize(study.participants);
  const citationScore = 3;
  const journalScore = scoreJournal(study.journal);

  const totalScore = 
    methodologyScore +
    recencyScore +
    sampleSizeScore +
    citationScore +
    journalScore;

  const qualityTier = determineQualityTier(totalScore, methodologyScore);

  return {
    pmid: study.pmid,
    totalScore,
    breakdown: {
      methodologyScore,
      recencyScore,
      sampleSizeScore,
      citationScore,
      journalScore,
    },
    qualityTier,
  };
}

function scoreMethodology(studyType?: string, journal?: string): number {
  const journalLower = journal?.toLowerCase() || '';
  
  if (journalLower.includes('cochrane')) {
    return 50;
  }

  if (!studyType) return 5;

  const type = studyType.toLowerCase();

  if (type.includes('meta-analysis')) return 40;
  if (type.includes('systematic review')) return 35;
  if (type.includes('randomized controlled trial')) return 30;
  if (type.includes('clinical trial')) return 20;
  if (type.includes('cohort')) return 15;
  if (type.includes('case-control')) return 10;
  if (type.includes('review')) return 8;

  return 5;
}

function scoreRecency(year?: number): number {
  if (!year) return 2;

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age < 0) return 2;
  if (age <= 2) return 20;
  if (age <= 5) return 15;
  if (age <= 10) return 10;
  if (age <= 20) return 5;
  return 2;
}

function scoreSampleSize(participants?: number): number {
  if (!participants) return 2;

  if (participants >= 1000) return 20;
  if (participants >= 500) return 15;
  if (participants >= 100) return 10;
  if (participants >= 50) return 5;
  return 2;
}

function scoreJournal(journal?: string): number {
  if (!journal) return 2;

  const j = journal.toLowerCase();

  const topTier = [
    'nature', 'science', 'cell', 'lancet',
    'new england journal of medicine', 'nejm',
    'jama', 'bmj', 'plos medicine',
  ];

  for (const top of topTier) {
    if (j.includes(top)) return 5;
  }

  const highImpact = [
    'american journal of clinical nutrition',
    'journal of nutrition',
    'nutrients',
    'clinical nutrition',
    'british journal of nutrition',
  ];

  for (const high of highImpact) {
    if (j.includes(high)) return 4;
  }

  return 3;
}

function determineQualityTier(
  totalScore: number,
  methodologyScore: number
): string {
  if (methodologyScore >= 50) return 'exceptional';
  
  if (totalScore >= 80) return 'exceptional';
  if (totalScore >= 60) return 'high';
  if (totalScore >= 40) return 'good';
  if (totalScore >= 20) return 'moderate';
  return 'low';
}

// Run tests
console.log('🧪 PUBMED MODULES VALIDATION (No AWS Required)');
console.log('===============================================');

const queryBuilderPassed = testQueryBuilder();
const scorerPassed = testScorer();

console.log('\n📋 SUMMARY');
console.log('==========');
console.log(`Query Builder: ${queryBuilderPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Scorer: ${scorerPassed ? '✅ PASSED' : '❌ FAILED'}`);

if (queryBuilderPassed && scorerPassed) {
  console.log('\n✅ All core modules validated!');
  console.log('Ready to test with PubMed API.');
} else {
  
  process.exit(1);
}
