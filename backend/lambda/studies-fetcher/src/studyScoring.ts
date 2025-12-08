/**
 * Study Scoring System
 * Multi-dimensional scoring for study quality and relevance
 * 
 * @deprecated Use scoring/scorer.ts instead
 */

import { Study } from './types';

export interface StudyScore {
  pmid: string;
  totalScore: number;
  breakdown: {
    methodologyScore: number;    // 0-40 points
    recencyScore: number;         // 0-20 points
    sampleSizeScore: number;      // 0-20 points
    citationScore: number;        // 0-10 points (placeholder for now)
    journalScore: number;         // 0-10 points (placeholder for now)
  };
}

/**
 * Calculate comprehensive score for a study
 */
export function calculateStudyScore(study: Study): StudyScore {
  const methodologyScore = scoreMethodology(study.studyType);
  const recencyScore = scoreRecency(study.year);
  const sampleSizeScore = scoreSampleSize(study.participants);
  const citationScore = 5; // Placeholder - will implement with Europe PMC
  const journalScore = scoreJournal(study.journal);

  const totalScore = 
    methodologyScore +
    recencyScore +
    sampleSizeScore +
    citationScore +
    journalScore;

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
  };
}

/**
 * Score study methodology (0-40 points)
 * Higher quality study designs get more points
 */
function scoreMethodology(studyType?: string): number {
  if (!studyType) return 5;

  const type = studyType.toLowerCase();

  // Meta-analysis: Highest quality
  if (type.includes('meta-analysis') || type.includes('meta analysis')) {
    return 40;
  }

  // Systematic review: Very high quality
  if (type.includes('systematic review')) {
    return 35;
  }

  // Randomized controlled trial: Gold standard
  if (type.includes('randomized controlled trial') || type.includes('rct')) {
    return 30;
  }

  // Clinical trial: Good quality
  if (type.includes('clinical trial')) {
    return 20;
  }

  // Cohort study: Moderate quality
  if (type.includes('cohort')) {
    return 15;
  }

  // Case-control: Lower quality
  if (type.includes('case-control') || type.includes('case control')) {
    return 10;
  }

  // Review or other: Lowest
  if (type.includes('review')) {
    return 8;
  }

  return 5;
}

/**
 * Score study recency (0-20 points)
 * More recent studies are generally more relevant
 */
function scoreRecency(year?: number): number {
  if (!year) return 2;

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age < 0) return 2; // Future year (error)
  if (age <= 2) return 20;  // < 2 years
  if (age <= 5) return 15;  // 2-5 years
  if (age <= 10) return 10; // 5-10 years
  if (age <= 20) return 5;  // 10-20 years
  return 2;                 // > 20 years
}

/**
 * Score sample size (0-20 points)
 * Larger samples are more statistically powerful
 */
function scoreSampleSize(participants?: number): number {
  if (!participants) return 2;

  if (participants >= 1000) return 20;
  if (participants >= 500) return 15;
  if (participants >= 100) return 10;
  if (participants >= 50) return 5;
  return 2;
}

/**
 * Score journal quality (0-10 points)
 * Based on known high-impact journals
 */
function scoreJournal(journal?: string): number {
  if (!journal) return 3;

  const j = journal.toLowerCase();

  // Top tier journals
  const topTier = [
    'nature',
    'science',
    'cell',
    'lancet',
    'new england journal of medicine',
    'nejm',
    'jama',
    'bmj',
    'plos medicine',
  ];

  for (const top of topTier) {
    if (j.includes(top)) return 10;
  }

  // High impact nutrition/supplement journals
  const highImpact = [
    'american journal of clinical nutrition',
    'journal of nutrition',
    'nutrients',
    'clinical nutrition',
    'british journal of nutrition',
    'european journal of nutrition',
    'journal of the academy of nutrition',
  ];

  for (const high of highImpact) {
    if (j.includes(high)) return 7;
  }

  // Medium impact
  return 5;
}

/**
 * Batch score multiple studies
 */
export function scoreStudies(studies: Study[]): StudyScore[] {
  return studies.map(study => calculateStudyScore(study));
}

/**
 * Sort studies by score (highest first)
 */
export function sortByScore(
  studies: Study[],
  scores: StudyScore[]
): Study[] {
  const scoreMap = new Map(scores.map(s => [s.pmid, s.totalScore]));
  
  return [...studies].sort((a, b) => {
    const scoreA = scoreMap.get(a.pmid) || 0;
    const scoreB = scoreMap.get(b.pmid) || 0;
    return scoreB - scoreA;
  });
}
