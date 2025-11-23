/**
 * Intelligent PubMed Search
 * Uses multiple search strategies to find both positive and negative studies
 */

import { Study } from './types';
import { searchPubMed } from './pubmed';

export interface IntelligentSearchOptions {
  maxResults?: number;
  includeNegativeSearch?: boolean;
  yearFrom?: number;
}

/**
 * Perform intelligent multi-strategy search
 */
export async function intelligentPubMedSearch(
  supplementName: string,
  options: IntelligentSearchOptions = {}
): Promise<Study[]> {
  const {
    maxResults = 50,
    includeNegativeSearch = true,
    yearFrom = 2010, // Last ~15 years by default
  } = options;

  console.log(JSON.stringify({
    event: 'INTELLIGENT_SEARCH_START',
    supplementName,
    maxResults,
    includeNegativeSearch,
    timestamp: new Date().toISOString(),
  }));

  const allStudies: Study[] = [];
  const seenPMIDs = new Set<string>();

  // Strategy 1: High-quality studies (RCT + Meta-analysis + Systematic Reviews)
  console.log('Strategy 1: Searching high-quality studies...');
  try {
    const highQuality = await searchPubMed({
      supplementName,
      maxResults: Math.floor(maxResults * 0.4), // 40% of results
      filters: {
        studyTypes: [
          'randomized controlled trial',
          'meta-analysis',
          'systematic review',
        ],
        yearFrom,
        humanStudiesOnly: true,
      },
    });

    for (const study of highQuality) {
      if (!seenPMIDs.has(study.pmid)) {
        allStudies.push(study);
        seenPMIDs.add(study.pmid);
      }
    }

    console.log(JSON.stringify({
      event: 'STRATEGY_1_COMPLETE',
      found: highQuality.length,
      unique: allStudies.length,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Strategy 1 failed:', error);
  }

  // Small delay to respect rate limits
  await delay(300);

  // Strategy 2: Recent studies (all types, last 5 years)
  console.log('Strategy 2: Searching recent studies...');
  try {
    const recent = await searchPubMed({
      supplementName,
      maxResults: Math.floor(maxResults * 0.3), // 30% of results
      filters: {
        yearFrom: new Date().getFullYear() - 5,
        humanStudiesOnly: true,
      },
    });

    for (const study of recent) {
      if (!seenPMIDs.has(study.pmid)) {
        allStudies.push(study);
        seenPMIDs.add(study.pmid);
      }
    }

    console.log(JSON.stringify({
      event: 'STRATEGY_2_COMPLETE',
      found: recent.length,
      unique: allStudies.length,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Strategy 2 failed:', error);
  }

  // Small delay
  await delay(300);

  // Strategy 3: Negative/null results search
  if (includeNegativeSearch) {
    console.log('Strategy 3: Searching for negative/null results...');
    try {
      const negativeTerms = [
        `${supplementName} AND (no effect OR ineffective OR not effective)`,
        `${supplementName} AND (placebo OR no difference OR no significant)`,
        `${supplementName} AND (failed OR negative result OR null result)`,
      ];

      for (const searchTerm of negativeTerms) {
        const negative = await searchPubMed({
          supplementName: searchTerm,
          maxResults: Math.floor(maxResults * 0.1), // 10% per negative search
          filters: {
            yearFrom,
            humanStudiesOnly: true,
          },
        });

        for (const study of negative) {
          if (!seenPMIDs.has(study.pmid)) {
            allStudies.push(study);
            seenPMIDs.add(study.pmid);
          }
        }

        // Delay between negative searches
        await delay(300);
      }

      console.log(JSON.stringify({
        event: 'STRATEGY_3_COMPLETE',
        unique: allStudies.length,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Strategy 3 failed:', error);
    }
  }

  

  return allStudies;
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deduplicate studies by PMID
 */
export function deduplicateStudies(studies: Study[]): Study[] {
  const seen = new Set<string>();
  const unique: Study[] = [];

  for (const study of studies) {
    if (!seen.has(study.pmid)) {
      unique.push(study);
      seen.add(study.pmid);
    }
  }

  return unique;
}

/**
 * Merge multiple study arrays and deduplicate
 */
export function mergeAndDeduplicate(...studyArrays: Study[][]): Study[] {
  const allStudies = studyArrays.flat();
  return deduplicateStudies(allStudies);
}
