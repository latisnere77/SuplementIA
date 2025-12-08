/**
 * Study Ranker Module
 * Combines scoring and sentiment for balanced results
 */

import { Study } from '../types';
import { StudyScore, scoreStudies } from './scorer';
import { StudySentiment, analyzeBatch } from './sentiment';

export interface ScoredStudy {
  study: Study;
  score: StudyScore;
  sentiment: StudySentiment;
}

export interface RankedResults {
  positive: ScoredStudy[];
  negative: ScoredStudy[];
  metadata: {
    totalPositive: number;
    totalNegative: number;
    totalNeutral: number;
    averageQualityPositive: number;
    averageQualityNegative: number;
    consensus: 'strong_positive' | 'moderate_positive' | 'mixed' | 'moderate_negative' | 'strong_negative' | 'insufficient_data';
    confidenceScore: number;
  };
}

/**
 * Rank and balance studies
 */
export async function rankStudies(
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
    minConfidence = 0.5,
  } = options;

  console.log(JSON.stringify({
    event: 'RANKING_START',
    studiesCount: studies.length,
    supplementName,
    timestamp: new Date().toISOString(),
  }));

  // Step 1: Score all studies
  const scores = scoreStudies(studies);

  // Step 2: Analyze sentiment
  const sentiments = await analyzeBatch(studies, supplementName);

  // Step 3: Combine
  const scoredStudies: ScoredStudy[] = studies.map((study, i) => ({
    study,
    score: scores[i],
    sentiment: sentiments[i],
  }));

  // Step 4: Filter by confidence
  const highConfidence = scoredStudies.filter(
    s => s.sentiment.confidence >= minConfidence
  );

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

  // Step 6: Select top N
  const topPositiveStudies = positive.slice(0, topPositive);
  const topNegativeStudies = negative.slice(0, topNegative);

  // Step 7: Fill negative with neutral if needed
  if (topNegativeStudies.length < topNegative && neutral.length > 0) {
    const needed = topNegative - topNegativeStudies.length;
    topNegativeStudies.push(...neutral.slice(0, needed));
  }

  // Step 8: Calculate metadata
  const metadata = calculateMetadata(
    topPositiveStudies,
    topNegativeStudies,
    positive.length,
    negative.length,
    neutral.length
  );

  

  return {
    positive: topPositiveStudies,
    negative: topNegativeStudies,
    metadata,
  };
}

/**
 * Calculate metadata
 */
function calculateMetadata(
  topPositive: ScoredStudy[],
  topNegative: ScoredStudy[],
  totalPositive: number,
  totalNegative: number,
  totalNeutral: number
): RankedResults['metadata'] {
  const avgQualityPositive = topPositive.length > 0
    ? topPositive.reduce((sum, s) => sum + s.score.totalScore, 0) / topPositive.length
    : 0;

  const avgQualityNegative = topNegative.length > 0
    ? topNegative.reduce((sum, s) => sum + s.score.totalScore, 0) / topNegative.length
    : 0;

  const consensus = calculateConsensus(totalPositive, totalNegative, totalNeutral);
  const confidenceScore = calculateConfidence(
    topPositive,
    topNegative,
    totalPositive,
    totalNegative
  );

  return {
    totalPositive,
    totalNegative,
    totalNeutral,
    averageQualityPositive: Math.round(avgQualityPositive),
    averageQualityNegative: Math.round(avgQualityNegative),
    consensus,
    confidenceScore,
  };
}

/**
 * Calculate consensus
 */
function calculateConsensus(
  positive: number,
  negative: number,
  neutral: number
): RankedResults['metadata']['consensus'] {
  const total = positive + negative + neutral;

  if (total < 3) return 'insufficient_data';

  const positiveRatio = positive / total;
  const negativeRatio = negative / total;

  if (positiveRatio > 0.7) return 'strong_positive';
  if (positiveRatio > 0.55) return 'moderate_positive';
  if (negativeRatio > 0.7) return 'strong_negative';
  if (negativeRatio > 0.55) return 'moderate_negative';

  return 'mixed';
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(
  topPositive: ScoredStudy[],
  topNegative: ScoredStudy[],
  totalPositive: number,
  totalNegative: number
): number {
  let score = 0;

  // Factor 1: Number of studies (max 30)
  const total = totalPositive + totalNegative;
  if (total >= 20) score += 30;
  else if (total >= 10) score += 20;
  else if (total >= 5) score += 10;
  else score += 5;

  // Factor 2: Quality of top studies (max 40)
  const allTop = [...topPositive, ...topNegative];
  if (allTop.length > 0) {
    const avgQuality = allTop.reduce((sum, s) => sum + s.score.totalScore, 0) / allTop.length;
    score += Math.min(40, (avgQuality / 100) * 40);
  }

  // Factor 3: Sentiment confidence (max 20)
  if (allTop.length > 0) {
    const avgConfidence = allTop.reduce((sum, s) => sum + s.sentiment.confidence, 0) / allTop.length;
    score += avgConfidence * 20;
  }

  // Factor 4: Consistency (max 10)
  const ratio = totalPositive / (totalPositive + totalNegative || 1);
  if (ratio > 0.8 || ratio < 0.2) score += 10;
  else if (ratio > 0.65 || ratio < 0.35) score += 5;

  return Math.round(Math.min(100, score));
}
