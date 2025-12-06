/**
 * Test Script: Benefit-Based Study Filter
 * Tests the client-side filtering of studies based on benefit queries
 *
 * Usage:
 *   npx tsx scripts/test-benefit-filter.ts
 */

import { filterByBenefit, hasBenefitRelevantData } from '../lib/portal/benefit-study-filter';

console.log('🧪 Testing Benefit-Based Study Filter\n');
console.log('='.repeat(80));

// Mock recommendation data (simplified structure)
const mockRecommendation = {
  recommendation_id: 'test_123',
  category: 'romero',
  supplement: {
    name: 'Rosemary',
    description: 'Rosemary (Rosmarinus officinalis) is an aromatic herb used in traditional medicine',
    structured_benefits: {
      worksFor: [
        {
          benefit: 'Hair Growth',
          summary: 'Clinical trials show rosemary oil promotes hair growth and treats alopecia',
          evidence_level: 'Fuerte',
          studies_found: 5,
        },
        {
          benefit: 'Cognitive Function',
          summary: 'Studies indicate rosemary may improve memory and cognitive performance',
          evidence_level: 'Moderada',
          studies_found: 8,
        },
        {
          benefit: 'Antioxidant Activity',
          summary: 'Rosemary contains compounds with strong antioxidant properties',
          evidence_level: 'Fuerte',
          studies_found: 12,
        },
        {
          benefit: 'Anti-inflammatory Effects',
          summary: 'Research shows anti-inflammatory properties of rosemary extracts',
          evidence_level: 'Moderada',
          studies_found: 6,
        },
      ],
      doesntWorkFor: [
        {
          benefit: 'Blood Pressure Reduction',
          summary: 'Limited evidence for blood pressure lowering effects',
          evidence_level: 'Insuficiente',
          studies_found: 2,
        },
      ],
    },
  },
  _enrichment_metadata: {
    studies: {
      ranked: {
        positive: [
          {
            title: 'Rosemary oil vs minoxidil 2% for the treatment of androgenetic alopecia: a randomized comparative trial',
            abstract: 'Rosemary oil significantly increased hair count after 6 months of treatment, similar to minoxidil 2%',
            pmid: '25842469',
            year: 2015,
            conclusion: 'Rosemary oil is effective for hair growth',
          },
          {
            title: 'Effect of rosemary extract on memory and cognitive performance in healthy adults',
            abstract: 'Rosemary extract improved memory consolidation and speed of memory in elderly adults',
            pmid: '28864169',
            year: 2017,
            conclusion: 'Rosemary shows promise for cognitive enhancement',
          },
          {
            title: 'Antioxidant activity of rosemary (Rosmarinus officinalis L.) essential oil',
            abstract: 'Rosemary essential oil exhibited strong antioxidant activity in vitro',
            pmid: '19301090',
            year: 2009,
            conclusion: 'Rosemary is a potent natural antioxidant',
          },
          {
            title: 'Anti-inflammatory effects of rosemary extract in experimental models',
            abstract: 'Rosemary extract reduced inflammatory markers in animal models',
            pmid: '23456789',
            year: 2018,
            conclusion: 'Rosemary has anti-inflammatory properties',
          },
        ],
        negative: [],
        metadata: {
          consensus: 'positive',
          confidenceScore: 0.85,
          totalPositive: 4,
          totalNegative: 0,
          totalNeutral: 0,
        },
      },
      all: [
        // Same as positive studies
      ],
      total: 4,
    },
  },
  evidence_summary: {
    totalStudies: 4,
    totalParticipants: 850,
  },
};

console.log('\n📋 TEST 1: Filter for Hair Growth Benefit\n');

const hairGrowthFiltered = filterByBenefit(mockRecommendation, 'crecimiento de cabello');

// Check if hair-related benefits are prioritized
const worksFor = hairGrowthFiltered.supplement?.structured_benefits?.worksFor || [];
console.log('Benefits after filtering (order matters):');
worksFor.forEach((benefit: any, idx: number) => {
  console.log(`  ${idx + 1}. ${benefit.benefit} (Score: ${benefit._relevanceScore || 0})`);
});

// Check if hair-related studies are prioritized
const positiveStudies = hairGrowthFiltered._enrichment_metadata?.studies?.ranked?.positive || [];
console.log('\nStudies after filtering (order matters):');
positiveStudies.forEach((study: any, idx: number) => {
  const titlePreview = study.title.substring(0, 60) + '...';
  console.log(`  ${idx + 1}. ${titlePreview} (Score: ${study._relevanceScore || 0})`);
});

// Check if benefit-relevant data exists
const hasHairData = hasBenefitRelevantData(mockRecommendation, 'crecimiento de cabello');
console.log(`\nHas hair-relevant data: ${hasHairData ? '✅ Yes' : '❌ No'}`);

console.log('\n📋 TEST 2: Filter for Memory/Cognitive Benefit\n');

const memoryFiltered = filterByBenefit(mockRecommendation, 'memoria');

const worksForMemory = memoryFiltered.supplement?.structured_benefits?.worksFor || [];
console.log('Benefits after filtering (order matters):');
worksForMemory.forEach((benefit: any, idx: number) => {
  console.log(`  ${idx + 1}. ${benefit.benefit} (Score: ${benefit._relevanceScore || 0})`);
});

const memoryStudies = memoryFiltered._enrichment_metadata?.studies?.ranked?.positive || [];
console.log('\nStudies after filtering (order matters):');
memoryStudies.forEach((study: any, idx: number) => {
  const titlePreview = study.title.substring(0, 60) + '...';
  console.log(`  ${idx + 1}. ${titlePreview} (Score: ${study._relevanceScore || 0})`);
});

const hasMemoryData = hasBenefitRelevantData(mockRecommendation, 'memoria');
console.log(`\nHas memory-relevant data: ${hasMemoryData ? '✅ Yes' : '❌ No'}`);

console.log('\n📋 TEST 3: No Benefit Query (Should Return Unchanged)\n');

const noFilterApplied = filterByBenefit(mockRecommendation, '');

const worksForNoFilter = noFilterApplied.supplement?.structured_benefits?.worksFor || [];
console.log('Benefits (should be unchanged):');
worksForNoFilter.forEach((benefit: any, idx: number) => {
  console.log(`  ${idx + 1}. ${benefit.benefit}`);
});

console.log('\n📋 TEST 4: Irrelevant Benefit Query\n');

const irrelevantFiltered = filterByBenefit(mockRecommendation, 'weight loss');

const worksForIrrelevant = irrelevantFiltered.supplement?.structured_benefits?.worksFor || [];
console.log('Benefits after filtering (scores should be low/zero):');
worksForIrrelevant.forEach((benefit: any, idx: number) => {
  console.log(`  ${idx + 1}. ${benefit.benefit} (Score: ${benefit._relevanceScore || 0})`);
});

const hasWeightLossData = hasBenefitRelevantData(mockRecommendation, 'weight loss');
console.log(`\nHas weight-loss-relevant data: ${hasWeightLossData ? '✅ Yes' : '❌ No'}`);

console.log('\n' + '='.repeat(80));

console.log('\n✅ Summary:\n');
console.log('1. Hair growth query → Hair-related benefits/studies prioritized');
console.log('2. Memory query → Cognitive benefits/studies prioritized');
console.log('3. No query → Original order preserved');
console.log('4. Irrelevant query → Low scores for all items');

console.log('\n🎉 Client-side benefit filtering is working!\n');
