/**
 * Supplement Variant Detection System
 * Detects and categorizes supplement variants from study data
 * Examples: Magnesium Glycinate, Magnesium Citrate, Creatine Monohydrate, etc.
 */

import type { SupplementVariant, VariantDetectionResult } from '@/types/supplement-variants';

// Variant patterns for different supplements
// Maps: supplement name → variant types and their patterns
const VARIANT_PATTERNS: Record<string, Array<{ type: string; patterns: string[]; description: string }>> = {
  magnesium: [
    {
      type: 'glycinate',
      patterns: ['glycinate', 'bisglycinate', 'mg-glycine'],
      description: 'Better absorption, gentle on digestion'
    },
    {
      type: 'citrate',
      patterns: ['citrate', 'mag citrate'],
      description: 'Good bioavailability, supports digestion'
    },
    {
      type: 'taurate',
      patterns: ['taurate', 'mag taurate'],
      description: 'Heart and muscle health'
    },
    {
      type: 'threonate',
      patterns: ['threonate', 'l-threonate'],
      description: 'Crosses blood-brain barrier'
    },
    {
      type: 'oxide',
      patterns: ['oxide', 'magnesium oxide'],
      description: 'Most common, lower absorption'
    },
    {
      type: 'malate',
      patterns: ['malate', 'malic acid'],
      description: 'Energy and muscle support'
    }
  ],
  creatine: [
    {
      type: 'monohydrate',
      patterns: ['monohydrate', 'creatine monohydrate'],
      description: 'Most studied form, proven efficacy'
    },
    {
      type: 'hcl',
      patterns: ['hcl', 'hydrochloride', 'creatine-hcl'],
      description: 'Better solubility, faster absorption'
    },
    {
      type: 'ethyl_ester',
      patterns: ['ethyl ester', 'ethyl-ester', 'cee'],
      description: 'Lipid-soluble form'
    },
    {
      type: 'buffered',
      patterns: ['buffered', 'kre-alkalyn', 'alkalyn'],
      description: 'pH-balanced, may reduce creatinine levels'
    },
    {
      type: 'nitrate',
      patterns: ['nitrate', 'crn'],
      description: 'Enhanced absorption, improved delivery'
    }
  ],
  vitamin_d: [
    {
      type: 'd2',
      patterns: ['ergocalciferol', 'vitamin d2', 'd2'],
      description: 'Plant-derived form, less stable'
    },
    {
      type: 'd3',
      patterns: ['cholecalciferol', 'vitamin d3', 'd3'],
      description: 'More bioavailable, preferred form'
    }
  ],
  vitamin_b: [
    {
      type: 'b1',
      patterns: ['thiamine', 'vitamin b1', 'b1', 'thiamin'],
      description: 'Energy and nerve function'
    },
    {
      type: 'b2',
      patterns: ['riboflavin', 'vitamin b2', 'b2'],
      description: 'Energy metabolism, eye health'
    },
    {
      type: 'b3',
      patterns: ['niacin', 'nicotinamide', 'vitamin b3', 'b3'],
      description: 'Energy, cholesterol support'
    },
    {
      type: 'b5',
      patterns: ['pantothenic acid', 'panthenol', 'vitamin b5', 'b5'],
      description: 'Stress and energy support'
    },
    {
      type: 'b6',
      patterns: ['pyridoxine', 'pyridoxal', 'vitamin b6', 'b6'],
      description: 'Mood and immune support'
    },
    {
      type: 'b12',
      patterns: ['cobalamin', 'cyanocobalamin', 'methylcobalamin', 'vitamin b12', 'b12'],
      description: 'Energy, neurological health'
    }
  ],
  'omega-3': [
    {
      type: 'fish_oil',
      patterns: ['fish oil', 'epa', 'dha', 'triglyceride'],
      description: 'Marine source, high EPA/DHA'
    },
    {
      type: 'algae',
      patterns: ['algae', 'vegan', 'plant-based'],
      description: 'Plant-based source, vegetarian'
    }
  ],
  iron: [
    {
      type: 'ferrous',
      patterns: ['ferrous', 'fe2+', 'ferrous sulfate'],
      description: 'More bioavailable, better absorption'
    },
    {
      type: 'ferric',
      patterns: ['ferric', 'fe3+', 'ferric', 'iron oxide'],
      description: 'More stable but less absorbable'
    },
    {
      type: 'heme',
      patterns: ['heme', 'heme iron'],
      description: 'Superior absorption from meat sources'
    }
  ]
};

/**
 * Normalize supplement name for pattern matching
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]+/g, '_');
}

/**
 * Extract variants from study titles/abstracts
 * Looks for patterns like "Magnesium Glycinate" or "Creatine HCL"
 */
function extractVariantsFromStudies(
  supplementName: string,
  studyTitles: string[]
): Map<string, { count: number; confidence: number }> {
  const normalized = normalizeName(supplementName);
  const patterns = VARIANT_PATTERNS[normalized];

  if (!patterns) {
    return new Map(); // No patterns defined for this supplement
  }

  const variantCounts = new Map<string, { count: number; confidence: number }>();

  studyTitles.forEach(title => {
    const titleLower = title.toLowerCase();

    patterns.forEach(({ type, patterns: typePatterns }) => {
      // Check if any pattern matches in the title
      const matched = typePatterns.some(pattern =>
        titleLower.includes(pattern) &&
        titleLower.includes(supplementName.toLowerCase())
      );

      if (matched) {
        const current = variantCounts.get(type) || { count: 0, confidence: 0 };
        current.count++;
        // Confidence increases with more matches (cap at 0.95)
        current.confidence = Math.min(0.95, 0.5 + current.count * 0.1);
        variantCounts.set(type, current);
      }
    });
  });

  return variantCounts;
}

/**
 * Main function: Detect variants from PubMed/LanceDB search results
 * @param supplementName Base supplement name (e.g., "Magnesium")
 * @param studyHits Array of study objects with titles
 * @returns VariantDetectionResult with detected variants
 */
export function detectVariants(
  supplementName: string,
  studyHits: Array<{ title: string; abstract?: string }>
): VariantDetectionResult {
  // Collect all study titles and abstracts
  const studyTexts = studyHits.map(h => `${h.title} ${h.abstract || ''}`);

  // Extract variant occurrences
  const variantCounts = extractVariantsFromStudies(supplementName, studyTexts);

  // If no variants found, return empty result
  if (variantCounts.size === 0) {
    return {
      baseSupplementName: supplementName,
      variants: [],
      hasVariants: false,
      mostStudied: null,
      recommendedForGenericSearch: false
    };
  }

  // Get patterns for this supplement
  const normalized = normalizeName(supplementName);
  const patterns = VARIANT_PATTERNS[normalized] || [];

  // Build variant objects
  const variants: SupplementVariant[] = Array.from(variantCounts.entries())
    .map(([type, { count, confidence }]) => {
      const patternInfo = patterns.find(p => p.type === type);
      return {
        name: type,
        type: type,
        displayName: formatVariantName(supplementName, type),
        studyCount: count,
        confidence: confidence,
        description: patternInfo?.description
      };
    })
    .sort((a, b) => b.studyCount - a.studyCount); // Sort by study count descending

  // Find most studied variant
  const mostStudied = variants.length > 0 ? variants[0] : null;

  // Recommend showing selector if:
  // 1. At least 2 variants found
  // 2. Each with significant study count (>5)
  // 3. Top variant has <60% of total studies (not completely dominant)
  const totalVariantStudies = variants.reduce((sum, v) => sum + v.studyCount, 0);
  const topStudyPercentage = mostStudied ? (mostStudied.studyCount / totalVariantStudies) * 100 : 0;

  const shouldRecommend =
    variants.length >= 2 &&
    variants.every(v => v.studyCount >= 3) && // Each variant has reasonable studies
    topStudyPercentage < 80; // Top variant isn't completely dominant

  return {
    baseSupplementName: supplementName,
    variants: variants,
    hasVariants: variants.length >= 2,
    mostStudied: mostStudied,
    recommendedForGenericSearch: shouldRecommend
  };
}

/**
 * Format variant name for display (e.g., "Magnesium Glycinate")
 */
function formatVariantName(supplementName: string, variantType: string): string {
  // Map variant types to display names
  const displayMap: Record<string, string> = {
    glycinate: 'Glycinate',
    citrate: 'Citrate',
    taurate: 'Taurate',
    threonate: 'Threonate',
    oxide: 'Oxide',
    malate: 'Malate',
    monohydrate: 'Monohydrate',
    hcl: 'HCL',
    ethyl_ester: 'Ethyl Ester',
    buffered: 'Buffered',
    nitrate: 'Nitrate',
    d2: 'D2 (Ergocalciferol)',
    d3: 'D3 (Cholecalciferol)',
    b1: 'B1 (Thiamine)',
    b2: 'B2 (Riboflavin)',
    b3: 'B3 (Niacin)',
    b5: 'B5 (Pantothenic Acid)',
    b6: 'B6 (Pyridoxine)',
    b12: 'B12 (Cobalamin)',
    fish_oil: 'Fish Oil',
    algae: 'Algae (Vegan)',
    ferrous: 'Ferrous',
    ferric: 'Ferric',
    heme: 'Heme Iron'
  };

  const displayName = displayMap[variantType] || variantType;
  return `${supplementName} ${displayName}`;
}

/**
 * Check if a supplement is known to have multiple variants
 */
export function isSupplementWithKnownVariants(supplementName: string): boolean {
  return supplementName in VARIANT_PATTERNS;
}
