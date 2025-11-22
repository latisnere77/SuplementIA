/**
 * Abbreviation Expander Service
 * Intelligently detects and expands supplement abbreviations using Claude Haiku
 *
 * Examples:
 * - "HMB" → ["beta-hydroxy beta-methylbutyrate", "β-hydroxy-β-methylbutyrate"]
 * - "BCAA" → ["branched-chain amino acids", "leucine isoleucine valine"]
 * - "NAC" → ["N-acetylcysteine", "N-acetyl-L-cysteine"]
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

// ====================================
// TYPES
// ====================================

export interface AbbreviationExpansion {
  original: string;
  isAbbreviation: boolean;
  alternatives: string[];
  confidence: number;
  source: 'llm' | 'heuristic' | 'none';
}

// ====================================
// BEDROCK CLIENT
// ====================================

const bedrockClient = new BedrockRuntimeClient({
  region: (process.env.AWS_REGION || 'us-east-1').trim(),
});

// Use Haiku for fast, cheap abbreviation expansion
const MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

// ====================================
// ABBREVIATION DETECTION
// ====================================

/**
 * Detect if a term is likely an abbreviation
 *
 * Heuristics:
 * 1. 2-5 uppercase letters (HMB, NAC, BCAA)
 * 2. Contains numbers (CoQ10, B12, 5-HTP)
 * 3. All caps and short (EPA, DHA, ALA)
 */
export function isLikelyAbbreviation(term: string): boolean {
  const trimmed = term.trim();
  const normalized = trimmed.toUpperCase();

  // Skip if too long (likely not an abbreviation)
  if (trimmed.length > 10) {
    return false;
  }

  // Skip if contains spaces (multi-word terms)
  if (trimmed.includes(' ')) {
    return false;
  }

  // Check patterns:
  const patterns = [
    // 2-5 uppercase letters: HMB, NAC, BCAA, EPA, DHA
    /^[A-Z]{2,5}$/,

    // Letters + numbers: CoQ10, B12, 5-HTP, D3
    /^[A-Z0-9-]{2,6}$/,

    // Greek letters: α-GPC, β-alanine (but these are usually written out)
    /^[α-ωΑ-Ω]+-?[A-Za-z]+$/,
  ];

  return patterns.some(pattern => pattern.test(trimmed));
}

// ====================================
// LLM-BASED EXPANSION
// ====================================

/**
 * Expand abbreviation using Claude Haiku
 * Also handles Spanish→English translation for PubMed searches
 */
async function expandWithLLM(term: string): Promise<string[]> {
  console.log(`[ABBREVIATION] Expanding "${term}" with Claude Haiku...`);

  const prompt = `You are a supplement and biochemistry expert. A user searched for the supplement term "${term}".

Your task: Provide the full chemical or scientific names optimized for PubMed searches.

CRITICAL RULES:
1. If it's an ABBREVIATION (like HMB, BCAA, NAC), expand it to full chemical names
2. If it's in SPANISH, you MUST translate it to English scientific names (PubMed is in English)
   - Spanish herbs/spices: "cilantro" → "coriander", "perejil" → "parsley", "romero" → "rosemary"
   - Spanish vitamins: "vitamina c" → "vitamin c", "vitamina d" → "vitamin d"
   - Spanish minerals: "magnesio" → "magnesium", "calcio" → "calcium"
   - ALWAYS translate Spanish terms - PubMed searches require English
3. Return ONLY names that would find studies in PubMed
4. Order by: most common scientific name first
5. Include chemical names, brand names if very common
6. Maximum 3-4 alternatives
7. If it's already in English and not an abbreviation, return empty array ONLY if you're certain

IMPORTANT: Be aggressive with Spanish→English translation. If you detect Spanish, translate it immediately.

Return ONLY a JSON array, no explanation:
["primary name", "alternative name 1", "alternative name 2"]

Examples:
- "HMB" → ["beta-hydroxy beta-methylbutyrate", "β-hydroxy-β-methylbutyrate", "leucine metabolite"]
- "BCAA" → ["branched-chain amino acids", "leucine isoleucine valine"]
- "NAC" → ["N-acetylcysteine", "N-acetyl-L-cysteine"]
- "DHEA" → ["dehydroepiandrosterone", "DHEA hormone"]
- "CoQ10" → ["coenzyme q10", "ubiquinone"]
- "cilantro" → ["coriander", "Coriandrum sativum"] (Spanish→English translation)
- "jengibre" → ["ginger", "Zingiber officinale"] (Spanish→English translation)
- "cúrcuma" → ["turmeric", "curcumin"] (Spanish→English translation)
- "niacina" → ["niacin", "vitamin b3", "nicotinic acid"] (Spanish→English translation)
- "magnesio" → ["magnesium"] (Spanish→English translation)
- "acido hialuronico" → ["hyaluronic acid", "sodium hyaluronate"] (Spanish→English translation)
- "colageno" → ["collagen", "collagen peptides"] (Spanish→English translation)
- "ashwagandha" → [] (already in English)
- "ginseng" → [] (already in English)

Now expand: "${term}"`;

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        temperature: 0.1, // Low temperature for consistency
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    console.log(
      JSON.stringify({
        event: 'LLM_EXPANSION_RESPONSE',
        term,
        rawResponse: content,
        responseLength: content.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Parse JSON array from response
    // Handle both direct JSON and markdown-wrapped JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(
        JSON.stringify({
          event: 'LLM_EXPANSION_NO_JSON',
          term,
          rawResponse: content.substring(0, 500), // First 500 chars
          timestamp: new Date().toISOString(),
        })
      );
      return [];
    }

    let alternatives: string[] = [];
    try {
      alternatives = JSON.parse(jsonMatch[0]) as string[];
    } catch (parseError: any) {
      console.error(
        JSON.stringify({
          event: 'LLM_EXPANSION_JSON_PARSE_ERROR',
          term,
          jsonMatch: jsonMatch[0].substring(0, 500),
          error: parseError.message,
          timestamp: new Date().toISOString(),
        })
      );
      return [];
    }

    // Validate and filter
    const validated = alternatives
      .filter(alt => typeof alt === 'string' && alt.length > 0)
      .slice(0, 4); // Max 4 alternatives

    console.log(
      JSON.stringify({
        event: 'LLM_EXPANSION_SUCCESS',
        term,
        alternativesCount: validated.length,
        alternatives: validated,
        originalCount: alternatives.length,
        timestamp: new Date().toISOString(),
      })
    );

    return validated;

  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: 'LLM_EXPANSION_ERROR',
        term,
        error: error.message,
        errorStack: error.stack,
        errorName: error.name,
        timestamp: new Date().toISOString(),
      })
    );
    return [];
  }
}

// ====================================
// MAIN EXPANSION FUNCTION
// ====================================

/**
 * Main function: Detect and expand abbreviation OR translate Spanish terms
 *
 * @param term - The supplement term to analyze
 * @returns Expansion result with alternatives
 *
 * @example
 * const result = await expandAbbreviation('HMB');
 * // result.alternatives = ['beta-hydroxy beta-methylbutyrate', ...]
 *
 * @example
 * const result = await expandAbbreviation('cúrcuma');
 * // result.alternatives = ['turmeric', 'curcumin']
 */
export async function expandAbbreviation(
  term: string
): Promise<AbbreviationExpansion> {
  const trimmed = term.trim();
  const startTime = Date.now();

  console.log(
    JSON.stringify({
      event: 'ABBREVIATION_EXPANSION_START',
      term: trimmed,
      timestamp: new Date().toISOString(),
    })
  );

  // 1. Check if it's an abbreviation
  const isAbbr = isLikelyAbbreviation(trimmed);

  console.log(
    JSON.stringify({
      event: 'ABBREVIATION_ANALYSIS',
      term: trimmed,
      isAbbreviation: isAbbr,
      timestamp: new Date().toISOString(),
    })
  );

  // 2. ALWAYS try LLM expansion (handles both abbreviations AND Spanish translation)
  // The LLM will return empty array if no expansion/translation needed
  const llmStartTime = Date.now();
  const llmAlternatives = await expandWithLLM(trimmed);
  const llmDuration = Date.now() - llmStartTime;

  console.log(
    JSON.stringify({
      event: 'ABBREVIATION_LLM_COMPLETE',
      term: trimmed,
      isAbbreviation: isAbbr,
      alternativesCount: llmAlternatives.length,
      alternatives: llmAlternatives,
      llmDuration,
      timestamp: new Date().toISOString(),
    })
  );

  if (llmAlternatives.length > 0) {
    const totalDuration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: 'ABBREVIATION_EXPANSION_SUCCESS',
        term: trimmed,
        expandedTo: llmAlternatives[0],
        alternatives: llmAlternatives,
        source: 'llm',
        confidence: 0.9,
        totalDuration,
        timestamp: new Date().toISOString(),
      })
    );

    return {
      original: trimmed,
      isAbbreviation: isAbbr,
      alternatives: llmAlternatives,
      confidence: 0.9,
      source: 'llm',
    };
  }

  // 3. Fallback: use original term (no expansion needed)
  const totalDuration = Date.now() - startTime;
  console.log(
    JSON.stringify({
      event: 'ABBREVIATION_NO_EXPANSION',
      term: trimmed,
      isAbbreviation: isAbbr,
      reason: 'llm_returned_empty_or_no_expansion_needed',
      source: isAbbr ? 'heuristic' : 'none',
      confidence: 1.0,
      totalDuration,
      timestamp: new Date().toISOString(),
    })
  );

  return {
    original: trimmed,
    isAbbreviation: isAbbr,
    alternatives: [trimmed],
    confidence: 1.0, // High confidence - term is already good
    source: isAbbr ? 'heuristic' : 'none',
  };
}

// ====================================
// SEARCH VARIATION GENERATION
// ====================================

/**
 * Generate search variations for a supplement term when initial search fails
 * Uses LLM to generate intelligent variations optimized for PubMed searches
 * 
 * @param term - The supplement term that didn't find results
 * @returns Array of search variations to try
 * 
 * @example
 * generateSearchVariations('kefir')
 * // Returns: ['kefir milk', 'kefir grains', 'kefir supplementation', 'kefir probiotics']
 */
export async function generateSearchVariations(term: string): Promise<string[]> {
  const trimmed = term.trim();

  console.log(
    JSON.stringify({
      event: 'SEARCH_VARIATIONS_GENERATION_START',
      term: trimmed,
      timestamp: new Date().toISOString(),
    })
  );

  const prompt = `You are a PubMed search expert. A user searched for "${trimmed}" but found no studies.

Your task: Generate 3-5 search term variations that would likely find studies in PubMed for this supplement.

Rules:
1. Generate variations that are commonly used in scientific literature
2. Include compound terms (e.g., "kefir milk", "kefir grains")
3. Include scientific/technical terms if applicable
4. Include "supplementation" or "supplement" variations
5. Order by likelihood of finding results (most likely first)
6. Return ONLY a JSON array, no explanation

Examples:
- "kefir" → ["kefir milk", "kefir grains", "kefir supplementation", "kefir probiotics"]
- "ashwagandha" → ["ashwagandha supplementation", "Withania somnifera", "ashwagandha extract"]
- "turmeric" → ["turmeric", "curcumin", "turmeric extract", "curcuma longa"]

Generate variations for: "${trimmed}"`;

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        temperature: 0.2, // Slightly higher for creativity in variations
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    console.log(
      JSON.stringify({
        event: 'SEARCH_VARIATIONS_LLM_RESPONSE',
        term: trimmed,
        rawResponse: content,
        timestamp: new Date().toISOString(),
      })
    );

    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(
        JSON.stringify({
          event: 'SEARCH_VARIATIONS_NO_JSON',
          term: trimmed,
          rawResponse: content.substring(0, 500),
          timestamp: new Date().toISOString(),
        })
      );
      // Fallback: generate basic variations
      return generateBasicVariations(trimmed);
    }

    let variations: string[] = [];
    try {
      variations = JSON.parse(jsonMatch[0]) as string[];
    } catch (parseError: any) {
      console.error(
        JSON.stringify({
          event: 'SEARCH_VARIATIONS_JSON_PARSE_ERROR',
          term: trimmed,
          jsonMatch: jsonMatch[0].substring(0, 500),
          error: parseError.message,
          timestamp: new Date().toISOString(),
        })
      );
      return generateBasicVariations(trimmed);
    }

    // Validate and filter
    const validated = variations
      .filter(v => typeof v === 'string' && v.length > 0 && v.length < 100)
      .slice(0, 5); // Max 5 variations

    // Always include original term as first option
    const finalVariations = [trimmed, ...validated.filter(v => v.toLowerCase() !== trimmed.toLowerCase())];

    console.log(
      JSON.stringify({
        event: 'SEARCH_VARIATIONS_SUCCESS',
        term: trimmed,
        variationsCount: finalVariations.length,
        variations: finalVariations,
        timestamp: new Date().toISOString(),
      })
    );

    return finalVariations;

  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: 'SEARCH_VARIATIONS_ERROR',
        term: trimmed,
        error: error.message,
        errorStack: error.stack,
        errorName: error.name,
        timestamp: new Date().toISOString(),
      })
    );
    // Fallback to basic variations
    return generateBasicVariations(trimmed);
  }
}

/**
 * Generate basic search variations as fallback
 */
function generateBasicVariations(term: string): string[] {
  const variations = [
    term,
    `${term} supplementation`,
    `${term} supplement`,
    `${term} extract`,
  ];

  // Remove duplicates and return
  return Array.from(new Set(variations));
}

// ====================================
// BATCH EXPANSION (for multiple terms)
// ====================================

/**
 * Expand multiple abbreviations in parallel
 */
export async function expandAbbreviations(
  terms: string[]
): Promise<Map<string, AbbreviationExpansion>> {
  const results = new Map<string, AbbreviationExpansion>();

  // Expand all in parallel
  const expansions = await Promise.all(
    terms.map(term => expandAbbreviation(term))
  );

  // Map results
  terms.forEach((term, index) => {
    results.set(term, expansions[index]);
  });

  return results;
}

// ====================================
// EXPORTS
// ====================================

export {
  isLikelyAbbreviation as detectAbbreviation,
};
