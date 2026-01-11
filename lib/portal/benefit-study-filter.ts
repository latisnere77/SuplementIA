/**
 * Client-Side Study Filter for Benefit-Specific Search
 *
 * This module filters and prioritizes studies based on a specific health benefit query.
 * Used as a temporary solution while the backend Lambda is updated to use benefitQuery.
 *
 * Strategy:
 * 1. Extract keywords from benefitQuery (e.g., "hair growth" → ["hair", "growth", "alopecia"])
 * 2. Score each study/benefit based on keyword matching in title, abstract, benefit name
 * 3. Reorder studies to show benefit-relevant ones first
 * 4. Filter out irrelevant studies if score is too low
 */

import { normalizeBenefit } from './benefit-normalization';

interface StudyItem {
  title?: string;
  abstract?: string;
  pmid?: string;
  year?: number;
  studyType?: string;
  conclusion?: string;
  [key: string]: any;
}

interface BenefitItem {
  benefit?: string;
  summary?: string;
  evidence_level?: string;
  studies_found?: number;
  [key: string]: any;
}

/**
 * Generate search keywords for a benefit query
 * Includes synonyms and related terms
 */
function getBenefitKeywords(benefitQuery: string): string[] {
  const normalized = normalizeBenefit(benefitQuery);
  const keywords: string[] = [];

  // Add original and normalized terms
  keywords.push(benefitQuery.toLowerCase());
  if (normalized.normalized !== benefitQuery.toLowerCase()) {
    keywords.push(normalized.normalized.toLowerCase());
  }

  // Add alternatives
  keywords.push(...normalized.alternatives.map(a => a.toLowerCase()));

  // Add individual words (for partial matching)
  const words = normalized.normalized.toLowerCase().split(/\s+/);
  keywords.push(...words.filter(w => w.length > 3)); // Only words longer than 3 chars

  // Add benefit-specific synonyms
  const synonymMap: Record<string, string[]> = {
    'hair growth': ['alopecia', 'hair loss', 'baldness', 'follicle', 'scalp'],
    'sleep': ['insomnia', 'sleep quality', 'sleep onset', 'sleep duration', 'melatonin'],
    'stress': ['cortisol', 'anxiety', 'stress response', 'adaptogen', 'hpa axis'],
    'memory': ['cognitive', 'cognition', 'brain', 'learning', 'recall'],
    'energy': ['fatigue', 'tiredness', 'stamina', 'endurance', 'vitality'],
    'muscle': ['muscle mass', 'strength', 'hypertrophy', 'lean body mass', 'performance'],
    'immune': ['immunity', 'infection', 'immune system', 'immune response', 'lymphocyte'],
    'inflammation': ['anti-inflammatory', 'cytokine', 'inflammatory markers', 'c-reactive protein'],
    'joint': ['arthritis', 'joint pain', 'cartilage', 'osteoarthritis', 'mobility'],
    'skin': ['dermatological', 'skin health', 'collagen', 'elasticity', 'wrinkles'],
  };

  // Find matching synonyms
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (normalized.normalized.toLowerCase().includes(key) ||
        keywords.some(k => k.includes(key))) {
      keywords.push(...synonyms);
    }
  }

  // Deduplicate
  return Array.from(new Set(keywords));
}

/**
 * Calculate relevance score for a text based on benefit keywords
 * Returns 0-100 score
 */
function calculateRelevanceScore(text: string, keywords: string[]): number {
  if (!text) return 0;

  const lowerText = text.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    // Exact phrase match (high score)
    if (lowerText.includes(keyword)) {
      score += 10;
    }

    // Individual word matches (medium score)
    const words = keyword.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && lowerText.includes(word)) {
        score += 3;
      }
    }
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Score a single study based on benefit relevance
 */
function scoreStudy(study: StudyItem, keywords: string[]): number {
  let score = 0;

  // Title has highest weight
  if (study.title) {
    score += calculateRelevanceScore(study.title, keywords) * 2;
  }

  // Abstract has medium weight
  if (study.abstract) {
    score += calculateRelevanceScore(study.abstract, keywords);
  }

  // Conclusion has high weight
  if (study.conclusion) {
    score += calculateRelevanceScore(study.conclusion, keywords) * 1.5;
  }

  return score;
}

/**
 * Score a benefit item based on benefit query relevance
 */
function scoreBenefit(benefit: BenefitItem, keywords: string[]): number {
  let score = 0;

  // Benefit name has highest weight
  if (benefit.benefit) {
    score += calculateRelevanceScore(benefit.benefit, keywords) * 3;
  }

  // Summary has medium weight
  if (benefit.summary) {
    score += calculateRelevanceScore(benefit.summary, keywords);
  }

  return score;
}

/**
 * Filter and reorder recommendation data based on benefit query
 * Returns modified recommendation with benefit-relevant studies prioritized
 */
export function filterByBenefit(recommendation: any, benefitQuery: string): any {
  if (!benefitQuery || !recommendation) {
    return recommendation;
  }

  console.log('[Benefit Filter] Filtering recommendation for benefit:', benefitQuery);

  const keywords = getBenefitKeywords(benefitQuery);
  console.log('[Benefit Filter] Keywords:', keywords);

  // Deep clone to avoid mutating original
  const filtered = JSON.parse(JSON.stringify(recommendation));

  // 1. Filter and reorder structured benefits (worksFor, doesntWorkFor)
  const supplement = filtered.supplement || {};
  const structuredBenefits = supplement.structured_benefits || {};

  if (Array.isArray(structuredBenefits.worksFor)) {
    // Score and sort worksFor
    const scoredWorksFor = structuredBenefits.worksFor.map((item: BenefitItem) => ({
      ...item,
      _relevanceScore: scoreBenefit(item, keywords),
    }));

    // Sort by relevance, keep all items but prioritize relevant ones
    scoredWorksFor.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);

    // Log top matches
    const topMatches = scoredWorksFor.filter((i: any) => i._relevanceScore > 0).slice(0, 3);
    if (topMatches.length > 0) {
      console.log('[Benefit Filter] Top benefit matches:', topMatches.map((m: any) => ({
        benefit: m.benefit,
        score: m._relevanceScore,
      })));
    }

    filtered.supplement.structured_benefits.worksFor = scoredWorksFor;
  }

  if (Array.isArray(structuredBenefits.doesntWorkFor)) {
    // Score and sort doesntWorkFor
    const scoredDoesntWorkFor = structuredBenefits.doesntWorkFor.map((item: BenefitItem) => ({
      ...item,
      _relevanceScore: scoreBenefit(item, keywords),
    }));

    scoredDoesntWorkFor.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);
    filtered.supplement.structured_benefits.doesntWorkFor = scoredDoesntWorkFor;
  }

  // 2. Filter and reorder studies in metadata
  const metadata = filtered._enrichment_metadata || {};
  const studies = metadata.studies || {};

  // Filter positive studies
  if (Array.isArray(studies.ranked?.positive)) {
    const scoredPositive = studies.ranked.positive.map((study: StudyItem) => ({
      ...study,
      _relevanceScore: scoreStudy(study, keywords),
    }));

    // Sort by relevance
    scoredPositive.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);

    // Log top study matches
    const topStudies = scoredPositive.filter((s: any) => s._relevanceScore > 0).slice(0, 3);
    if (topStudies.length > 0) {
      console.log('[Benefit Filter] Top study matches:', topStudies.map((s: any) => ({
        title: s.title?.substring(0, 60) + '...',
        score: s._relevanceScore,
      })));
    }

    filtered._enrichment_metadata.studies.ranked.positive = scoredPositive;
  }

  // Filter negative studies
  if (Array.isArray(studies.ranked?.negative)) {
    const scoredNegative = studies.ranked.negative.map((study: StudyItem) => ({
      ...study,
      _relevanceScore: scoreStudy(study, keywords),
    }));

    scoredNegative.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);
    filtered._enrichment_metadata.studies.ranked.negative = scoredNegative;
  }

  // Filter all studies
  if (Array.isArray(studies.all)) {
    const scoredAll = studies.all.map((study: StudyItem) => ({
      ...study,
      _relevanceScore: scoreStudy(study, keywords),
    }));

    scoredAll.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);
    filtered._enrichment_metadata.studies.all = scoredAll;
  }

  console.log('[Benefit Filter] ✅ Filtering complete');

  return filtered;
}

/**
 * Check if recommendation has any benefit-relevant data
 */
export function hasBenefitRelevantData(recommendation: any, benefitQuery: string): boolean {
  if (!benefitQuery || !recommendation) {
    return false;
  }

  const keywords = getBenefitKeywords(benefitQuery);

  // Check worksFor benefits
  const supplement = recommendation.supplement || {};
  const structuredBenefits = supplement.structured_benefits || {};

  if (Array.isArray(structuredBenefits.worksFor)) {
    const hasRelevantBenefits = structuredBenefits.worksFor.some((item: BenefitItem) =>
      scoreBenefit(item, keywords) > 10
    );
    if (hasRelevantBenefits) return true;
  }

  // Check studies
  const metadata = recommendation._enrichment_metadata || {};
  const studies = metadata.studies || {};

  if (Array.isArray(studies.ranked?.positive)) {
    const hasRelevantStudies = studies.ranked.positive.some((study: StudyItem) =>
      scoreStudy(study, keywords) > 10
    );
    if (hasRelevantStudies) return true;
  }

  return false;
}
