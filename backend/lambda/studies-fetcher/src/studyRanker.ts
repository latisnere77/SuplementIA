/**
 * Intelligent Study Ranker
 * Combines scoring and sentiment to produce balanced, high-quality results
 */

import { Study } from './types';
import { StudyScore, calculateStudyScore } from './studyScoring';
import { StudySentiment, analyzeBatchSentiment } from './sentimentAnalyzer';

export interface ScoredStudy {
  study: Study;
  score: StudyScore;
  sentiment: StudySentiment;
}

export interface RankedResults {
  positive: ScoredStudy[];  // Top 5 studies showing benefits
  negative: ScoredStudy[];  // Top 5 studies showing no benefits
  metadata: {
    totalPositive: number;
    totalNegative: number;
    totalNeutral: number;
    averageQualityPositive: number;
    averageQualityNegative: number;
    consensus: 'strong_positive' | 'moderate_positive' | 'mixed' | 'moderate_negative' | 'strong_negative' | 'insufficient_data';
    confidenceScore: number; // 0-100
  };
}

/**
 * Rank and balance studies intelligently
 */
export async function rankAndBalanceStudies(
  studies: Study[],
  supplementName: string,
  options: {
    topPositive?: number;
    topNegative?: number;
    minConfidence?: number;
  } = {}
): Promise<RankedResults> {
  const {
    topPositive = 5,
    topNegative = 5,
    minConfidence = 0.1,
  } = options;

  console.log(JSON.stringify({
    event: 'RANKING_START',
    studiesCount: studies.length,
    supplementName,
    timestamp: new Date().toISOString(),
  }));

  // Step 1: Score all studies
  const scores = studies.map(study => calculateStudyScore(study));

  // Step 2: Analyze sentiment for all studies
  const sentiments = await analyzeBatchSentiment(studies, supplementName);

  // Step 3: Combine into scored studies
  const scoredStudies: ScoredStudy[] = studies.map((study, i) => ({
    study,
    score: scores[i],
    sentiment: sentiments[i],
  }));

  // Step 4: Filter by confidence
  const highConfidence = scoredStudies.filter(
    s => s.sentiment.confidence >= minConfidence
  );

  console.log(JSON.stringify({
    event: 'CONFIDENCE_FILTER',
    original: scoredStudies.length,
    filtered: highConfidence.length,
    minConfidence,
    timestamp: new Date().toISOString(),
  }));

  // Step 5: Separate by sentiment and sort by score
  const positive = highConfidence
    .filter(s => s.sentiment.sentiment === 'positive')
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  const negative = highConfidence
    .filter(s => s.sentiment.sentiment === 'negative')
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  const neutral = highConfidence
    .filter(s => s.sentiment.sentiment === 'neutral')
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Step 6: Select top N from each category
  const topPositiveStudies = positive.slice(0, topPositive);
  const topNegativeStudies = negative.slice(0, topNegative);

  // Step 7: If we don't have enough negative studies, add high-quality neutral ones
  if (topNegativeStudies.length < topNegative && neutral.length > 0) {
    const needed = topNegative - topNegativeStudies.length;
    const neutralToAdd = neutral.slice(0, needed);
    topNegativeStudies.push(...neutralToAdd);
    
    console.log(JSON.stringify({
      event: 'NEUTRAL_ADDED_TO_NEGATIVE',
      added: neutralToAdd.length,
      reason: 'insufficient_negative_studies',
      timestamp: new Date().toISOString(),
    }));
  }

  // Step 8: Calculate metadata
  const avgQualityPositive = topPositiveStudies.length > 0
    ? topPositiveStudies.reduce((sum, s) => sum + s.score.totalScore, 0) / topPositiveStudies.length
    : 0;

  const avgQualityNegative = topNegativeStudies.length > 0
    ? topNegativeStudies.reduce((sum, s) => sum + s.score.totalScore, 0) / topNegativeStudies.length
    : 0;

  const consensus = calculateConsensus(positive.length, negative.length, neutral.length);
  const confidenceScore = calculateConfidenceScore(
    topPositiveStudies,
    topNegativeStudies,
    positive.length,
    negative.length
  );

  

  return {
    positive: topPositiveStudies,
    negative: topNegativeStudies,
    metadata: {
      totalPositive: positive.length,
      totalNegative: negative.length,
      totalNeutral: neutral.length,
      averageQualityPositive: Math.round(avgQualityPositive),
      averageQualityNegative: Math.round(avgQualityNegative),
      consensus,
      confidenceScore,
    },
  };
}

/**
 * Calculate consensus based on study distribution
 */
function calculateConsensus(
  positiveCount: number,
  negativeCount: number,
  neutralCount: number
): 'strong_positive' | 'moderate_positive' | 'mixed' | 'moderate_negative' | 'strong_negative' | 'insufficient_data' {
  const total = positiveCount + negativeCount + neutralCount;

  if (total < 3) {
    return 'insufficient_data';
  }

  const positiveRatio = positiveCount / total;
  const negativeRatio = negativeCount / total;

  // Strong positive: >70% positive studies
  if (positiveRatio > 0.7) {
    return 'strong_positive';
  }

  // Moderate positive: 55-70% positive
  if (positiveRatio > 0.55) {
    return 'moderate_positive';
  }

  // Strong negative: >70% negative studies
  if (negativeRatio > 0.7) {
    return 'strong_negative';
  }

  // Moderate negative: 55-70% negative
  if (negativeRatio > 0.55) {
    return 'moderate_negative';
  }

  // Mixed: everything else
  return 'mixed';
}

/**
 * Calculate overall confidence score (0-100)
 * Based on:
 * - Number of high-quality studies
 * - Quality scores
 * - Sentiment confidence
 * - Consistency of results
 */
function calculateConfidenceScore(
  positiveStudies: ScoredStudy[],
  negativeStudies: ScoredStudy[],
  totalPositive: number,
  totalNegative: number
): number {
  let score = 0;

  // Factor 1: Number of studies (max 30 points)
  const totalStudies = totalPositive + totalNegative;
  if (totalStudies >= 20) score += 30;
  else if (totalStudies >= 10) score += 20;
  else if (totalStudies >= 5) score += 10;
  else score += 5;

  // Factor 2: Quality of top studies (max 40 points)
  const allTop = [...positiveStudies, ...negativeStudies];
  if (allTop.length > 0) {
    const avgQuality = allTop.reduce((sum, s) => sum + s.score.totalScore, 0) / allTop.length;
    score += Math.min(40, (avgQuality / 100) * 40);
  }

  // Factor 3: Sentiment confidence (max 20 points)
  if (allTop.length > 0) {
    const avgConfidence = allTop.reduce((sum, s) => sum + s.sentiment.confidence, 0) / allTop.length;
    score += avgConfidence * 20;
  }

  // Factor 4: Consistency (max 10 points)
  // If results are very one-sided, add bonus points
  const ratio = totalPositive / (totalPositive + totalNegative || 1);
  if (ratio > 0.8 || ratio < 0.2) {
    score += 10; // Strong consensus
  } else if (ratio > 0.65 || ratio < 0.35) {
    score += 5; // Moderate consensus
  }

  return Math.round(Math.min(100, score));
}

/**
 * Format ranked results for display
 */
export function formatRankedResults(results: RankedResults): string {
  const lines: string[] = [];

  lines.push(`\n=== RANKED STUDY RESULTS ===`);
  lines.push(`Consensus: ${results.metadata.consensus.toUpperCase()}`);
  lines.push(`Confidence: ${results.metadata.confidenceScore}/100`);
  lines.push(`\nPositive Studies: ${results.metadata.totalPositive} (showing ${results.positive.length})`);
  lines.push(`Negative Studies: ${results.metadata.totalNegative} (showing ${results.negative.length})`);
  lines.push(`Neutral Studies: ${results.metadata.totalNeutral}`);

  lines.push(`\n--- TOP POSITIVE STUDIES ---`);
  results.positive.forEach((s, i) => {
    lines.push(`${i + 1}. [Score: ${s.score.totalScore}] ${s.study.title}`);
    lines.push(`   PMID: ${s.study.pmid} | ${s.study.year} | ${s.study.studyType || 'N/A'}`);
    lines.push(`   Confidence: ${(s.sentiment.confidence * 100).toFixed(0)}% | ${s.sentiment.reasoning}`);
  });

  lines.push(`\n--- TOP NEGATIVE STUDIES ---`);
  results.negative.forEach((s, i) => {
    lines.push(`${i + 1}. [Score: ${s.score.totalScore}] ${s.study.title}`);
    lines.push(`   PMID: ${s.study.pmid} | ${s.study.year} | ${s.study.studyType || 'N/A'}`);
    lines.push(`   Confidence: ${(s.sentiment.confidence * 100).toFixed(0)}% | ${s.sentiment.reasoning}`);
  });

  return lines.join('\n');
}
