/**
 * Study Scoring Module
 * Multi-dimensional quality scoring
 */

import { Study } from '../types';

export interface StudyScore {
  pmid: string;
  totalScore: number;
  breakdown: {
    methodologyScore: number;    // 0-50 points (Cochrane gets 50)
    recencyScore: number;         // 0-20 points
    sampleSizeScore: number;      // 0-20 points
    citationScore: number;        // 0-5 points (placeholder)
    journalScore: number;         // 0-5 points
  };
  qualityTier: 'exceptional' | 'high' | 'good' | 'moderate' | 'low';
}

/**
 * Calculate comprehensive score for a study
 */
export function scoreStudy(study: Study): StudyScore {
  const methodologyScore = scoreMethodology(study.studyType, study.journal);
  const recencyScore = scoreRecency(study.year);
  const sampleSizeScore = scoreSampleSize(study.participants);
  const citationScore = 3; // Placeholder
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

/**
 * Score methodology (0-50 points)
 * Cochrane reviews get highest score
 */
function scoreMethodology(studyType?: string, journal?: string): number {
  const journalLower = journal?.toLowerCase() || '';
  
  // Cochrane Review: Exceptional quality
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

/**
 * Score recency (0-20 points)
 */
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

/**
 * Score sample size (0-20 points)
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
 * Score journal quality (0-5 points)
 */
function scoreJournal(journal?: string): number {
  if (!journal) return 2;

  const j = journal.toLowerCase();

  // Top tier
  const topTier = [
    'nature', 'science', 'cell', 'lancet',
    'new england journal of medicine', 'nejm',
    'jama', 'bmj', 'plos medicine',
  ];

  for (const top of topTier) {
    if (j.includes(top)) return 5;
  }

  // High impact nutrition journals
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

/**
 * Determine quality tier based on total score
 */
function determineQualityTier(
  totalScore: number,
  methodologyScore: number
): 'exceptional' | 'high' | 'good' | 'moderate' | 'low' {
  // Cochrane reviews are always exceptional
  if (methodologyScore >= 50) return 'exceptional';
  
  if (totalScore >= 80) return 'exceptional';
  if (totalScore >= 60) return 'high';
  if (totalScore >= 40) return 'good';
  if (totalScore >= 20) return 'moderate';
  return 'low';
}

/**
 * Batch score multiple studies
 */
export function scoreStudies(studies: Study[]): StudyScore[] {
  return studies.map(study => scoreStudy(study));
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
