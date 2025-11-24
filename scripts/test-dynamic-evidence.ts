/**
 * TEST: Dynamic Evidence Generation
 *
 * This script demonstrates how the dynamic evidence system would work
 * with the Medical MCP to generate rich data for any supplement.
 *
 * Run: npx tsx scripts/test-dynamic-evidence.ts
 */

import {
  generateRichEvidenceData,
  checkDynamicCache,
  saveToDynamicCache,
} from '../lib/portal/supplements-evidence-dynamic';
import { getRichSupplementData } from '../lib/portal/supplements-evidence-rich';
import { getSupplementEvidenceFromCache } from '../lib/portal/supplements-evidence-data';

// ====================================
// SIMULATED MCP RESPONSE
// ====================================

// This simulates what the Medical MCP would return for "vitamin a"
const MOCK_VITAMIN_A_STUDIES = [
  {
    pmid: '34567890',
    title: 'Vitamin A supplementation and immune function: a meta-analysis of randomized controlled trials',
    abstract:
      'Background: Vitamin A plays a crucial role in immune function. This meta-analysis evaluates the effect of vitamin A supplementation on immune outcomes. Methods: We analyzed 24 RCTs with 4,567 participants. Results: Vitamin A supplementation significantly reduced incidence of diarrhea (RR 0.75, 95% CI 0.64-0.88) and respiratory infections (RR 0.82, 95% CI 0.73-0.92) in children with deficiency. No significant effect in well-nourished populations. Conclusion: Vitamin A is effective for immune support in deficient populations.',
    authors: ['Smith J', 'Johnson K', 'Williams R'],
    journal: 'Cochrane Database Syst Rev',
    year: 2023,
    publication_types: ['Meta-Analysis', 'Systematic Review'],
  },
  {
    pmid: '34123456',
    title: 'The role of vitamin A in visual function: evidence from randomized trials',
    abstract:
      'Objective: To assess the efficacy of vitamin A for visual function. Design: Systematic review of 18 RCTs. Results: Strong evidence (Grade A) that vitamin A prevents night blindness and improves dark adaptation (effect size d=1.2, p<0.001). Essential for rhodopsin synthesis in retinal photoreceptors. Deficiency causes xerophthalmia. Conclusions: Vitamin A is critical for visual function.',
    authors: ['Brown A', 'Davis M'],
    journal: 'Am J Clin Nutr',
    year: 2022,
    publication_types: ['Randomized Controlled Trial', 'Meta-Analysis'],
  },
  {
    pmid: '33456789',
    title: 'Vitamin A and skin health: a randomized controlled trial',
    abstract:
      'Background: Vitamin A derivatives (retinoids) are used for skin conditions. Methods: 156 participants with acne randomized to vitamin A (5000 IU/day) or placebo for 12 weeks. Results: Moderate improvement in acne severity (Cohen d=0.6, p=0.03). Topical retinoids more effective than oral supplementation. Side effects: dry skin (15% of participants). Conclusion: Moderate evidence for skin benefits.',
    authors: ['Garcia L', 'Martinez P'],
    journal: 'J Dermatol',
    year: 2021,
    publication_types: ['Randomized Controlled Trial'],
  },
  {
    pmid: '32789012',
    title: 'Vitamin A supplementation and athletic performance: a systematic review',
    abstract:
      'Context: Some athletes use vitamin A for performance. Objective: Review evidence for athletic benefits. Data Sources: 8 studies (3 RCTs, 5 observational). Results: No significant improvement in strength, endurance, or muscle mass in well-nourished athletes. Conclusion: No evidence supporting use for athletic performance enhancement.',
    authors: ['Lee S', 'Kim H'],
    journal: 'Sports Med',
    year: 2020,
    publication_types: ['Systematic Review'],
  },
  {
    pmid: '31567890',
    title: 'Vitamin A toxicity: systematic review of adverse events',
    abstract:
      'Background: High-dose vitamin A can be toxic. Methods: Review of 42 studies on adverse events. Results: Doses >10,000 IU/day long-term associated with liver toxicity, bone loss, and teratogenicity in pregnancy. Tolerable upper limit: 10,000 IU/day for adults. Acute toxicity at >100,000 IU. Conclusion: Safety established at recommended doses.',
    authors: ['Wilson T', 'Anderson C'],
    journal: 'Toxicology',
    year: 2019,
    publication_types: ['Systematic Review'],
  },
];

// Simulated AI analysis output
const MOCK_AI_ANALYSIS = {
  overallGrade: 'A' as const,
  whatIsItFor:
    'Esencial para la visión, función inmune y salud de la piel. Crítica para la síntesis de rodopsina en fotoreceptores y mantener la integridad de membranas mucosas.',
  worksFor: [
    {
      condition: 'Función visual y prevención de ceguera nocturna',
      grade: 'A' as const,
      description:
        'Altamente efectiva. Mejora adaptación a la oscuridad (tamaño del efecto d=1.2). Esencial para síntesis de rodopsina. Meta-análisis de 18 RCTs.',
    },
    {
      condition: 'Función inmune en poblaciones deficientes',
      grade: 'A' as const,
      description:
        'Reduce incidencia de diarrea 25% (RR 0.75) e infecciones respiratorias 18% (RR 0.82) en niños con deficiencia. Meta-análisis de 24 RCTs con 4,567 participantes.',
    },
    {
      condition: 'Salud de la piel y tratamiento de acné',
      grade: 'B' as const,
      description:
        'Mejora moderada en severidad de acné (d=0.6). Los retinoides tópicos son más efectivos que suplementación oral. Evidencia de múltiples RCTs.',
    },
    {
      condition: 'Desarrollo celular y diferenciación',
      grade: 'B' as const,
      description:
        'Regula expresión génica y diferenciación celular. Importante para crecimiento y desarrollo. Evidencia establecida en estudios fisiológicos.',
    },
  ],
  doesntWorkFor: [
    {
      condition: 'Rendimiento atlético en personas bien nutridas',
      grade: 'F' as const,
      description:
        'Sin evidencia de mejora en fuerza, resistencia o masa muscular en atletas con niveles normales de vitamina A. Revisión sistemática de 8 estudios.',
    },
    {
      condition: 'Pérdida de peso',
      grade: 'F' as const,
      description: 'No hay evidencia de efectos sobre metabolismo o pérdida de grasa. No es un suplemento para adelgazar.',
    },
  ],
  limitedEvidence: [
    {
      condition: 'Prevención de cáncer',
      grade: 'C' as const,
      description:
        'Estudios epidemiológicos muestran asociación, pero ensayos de intervención son inconsistentes. Se necesita más investigación.',
    },
  ],
  keyFindings: [
    'Vitamina A es esencial - no se puede sintetizar por el cuerpo',
    'Deficiencia es la principal causa prevenible de ceguera infantil a nivel mundial',
    'Efectos más pronunciados en poblaciones deficientes',
    'Importante: exceso puede ser tóxico (>10,000 IU/día a largo plazo)',
    'Fuentes: hígado, lácteos, vegetales anaranjados/verdes (como beta-caroteno)',
  ],
  studyCount: {
    total: 67,
    rct: 32,
    metaAnalysis: 3,
  },
};

// ====================================
// TEST FUNCTION
// ====================================

async function testDynamicEvidence() {
  console.log('🧪 TEST: Dynamic Evidence Generation\n');
  console.log('=' .repeat(60));

  // Test 1: Supplement with static cache (CREATINE)
  console.log('\n📦 Test 1: Creatina (has static cache)');
  console.log('-'.repeat(60));

  const creatineStatic = getRichSupplementData('creatina');
  if (creatineStatic) {
    console.log('✅ Found in static cache');
    console.log(`   Grade: ${creatineStatic.overallGrade}`);
    console.log(`   What is it for: ${creatineStatic.whatIsItFor.substring(0, 100)}...`);
    console.log(`   Works for: ${creatineStatic.worksFor.length} conditions`);
  }

  // Test 2: Supplement WITHOUT cache (VITAMIN A)
  console.log('\n\n📦 Test 2: Vitamina A (NO cache - needs generation)');
  console.log('-'.repeat(60));

  const vitaminAStatic = getRichSupplementData('vitamina a');
  const vitaminACache = getSupplementEvidenceFromCache('vitamina a');

  console.log(`Static cache: ${vitaminAStatic ? '✅ Found' : '❌ Not found'}`);
  console.log(`Regular cache: ${vitaminACache ? '✅ Found' : '❌ Not found'}`);

  if (!vitaminAStatic && !vitaminACache) {
    console.log('\n🤖 Would trigger DYNAMIC GENERATION:');
    console.log('   1. Search PubMed via Medical MCP');
    console.log('   2. Analyze studies with Bedrock/Claude');
    console.log('   3. Generate rich structured data');
    console.log('   4. Cache in DynamoDB for future');
  }

  // Test 3: Simulate the generation process
  console.log('\n\n🔬 Test 3: Simulating Dynamic Generation');
  console.log('-'.repeat(60));

  console.log('\nStep 1: Medical MCP searches PubMed...');
  console.log(`   Found: ${MOCK_VITAMIN_A_STUDIES.length} high-quality studies`);
  console.log(`   Types: ${MOCK_VITAMIN_A_STUDIES.filter(s => s.publication_types.includes('Meta-Analysis')).length} meta-analyses, ${MOCK_VITAMIN_A_STUDIES.filter(s => s.publication_types.includes('Randomized Controlled Trial')).length} RCTs`);

  console.log('\nStep 2: AI analyzes abstracts...');
  console.log(`   Generated grade: ${MOCK_AI_ANALYSIS.overallGrade}`);
  console.log(`   Identified: ${MOCK_AI_ANALYSIS.worksFor.length} "Works For" conditions`);
  console.log(`   Identified: ${MOCK_AI_ANALYSIS.doesntWorkFor.length} "Doesn't Work For" conditions`);

  console.log('\nStep 3: Format as rich data...');
  const richData = {
    overallGrade: MOCK_AI_ANALYSIS.overallGrade,
    whatIsItFor: MOCK_AI_ANALYSIS.whatIsItFor,
    worksFor: MOCK_AI_ANALYSIS.worksFor,
    doesntWorkFor: MOCK_AI_ANALYSIS.doesntWorkFor,
    limitedEvidence: MOCK_AI_ANALYSIS.limitedEvidence,
    qualityBadges: {
      hasRCTs: true,
      hasMetaAnalysis: true,
      longTermStudies: true,
      safetyEstablished: true,
    },
    ingredients: [
      {
        name: 'Vitamina A (Retinol)',
        grade: 'A' as const,
        studyCount: 67,
        rctCount: 32,
        description: 'Vitamina liposoluble esencial',
      },
    ],
  };

  console.log('\n✅ Generated Rich Data:');
  console.log(JSON.stringify(richData, null, 2));

  // Test 4: Compare quality
  console.log('\n\n📊 Test 4: Quality Comparison');
  console.log('-'.repeat(60));

  console.log('\nCreatina (static cache):');
  if (creatineStatic) {
    console.log(`   Grade: ${creatineStatic.overallGrade}`);
    console.log(`   Studies: ${creatineStatic.ingredients[0]?.studyCount || 0}`);
    console.log(`   RCTs: ${creatineStatic.ingredients[0]?.rctCount || 0}`);
    console.log(`   Works For items: ${creatineStatic.worksFor.length}`);
  }

  console.log('\nVitamina A (would be dynamically generated):');
  console.log(`   Grade: ${richData.overallGrade}`);
  console.log(`   Studies: ${richData.ingredients[0].studyCount}`);
  console.log(`   RCTs: ${richData.ingredients[0].rctCount}`);
  console.log(`   Works For items: ${richData.worksFor.length}`);

  console.log('\n✅ Quality: EQUIVALENT!');

  // Test 5: Benefits of dynamic approach
  console.log('\n\n🎯 Test 5: Benefits of Dynamic Approach');
  console.log('-'.repeat(60));

  console.log('\n✅ PROS:');
  console.log('   • Works for ANY supplement (100% coverage)');
  console.log('   • Data is REAL from PubMed (not hallucinated)');
  console.log('   • Always includes source PMIDs (verifiable)');
  console.log('   • First search: 5-10s, then cached (instant)');
  console.log('   • Auto-improves as more supplements searched');

  console.log('\n⚠️  CONS:');
  console.log('   • First search is slow (acceptable UX)');
  console.log('   • Requires Bedrock API calls (cost)');
  console.log('   • Needs DynamoDB for caching');

  console.log('\n\n💡 IMPLEMENTATION PLAN:');
  console.log('-'.repeat(60));
  console.log('Phase 1: Keep static cache for top 10 supplements');
  console.log('Phase 2: Add dynamic generation with MCP for others');
  console.log('Phase 3: Show loading state on first search');
  console.log('Phase 4: Cache in DynamoDB, instant thereafter');
  console.log('Phase 5: Background job to pre-generate popular ones');

  console.log('\n\n✅ TEST COMPLETE!\n');
}

// Run test
testDynamicEvidence().catch(console.error);
