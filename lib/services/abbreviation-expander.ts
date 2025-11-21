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
  region: process.env.AWS_REGION || 'us-east-1',
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
 */
async function expandWithLLM(term: string): Promise<string[]> {
  console.log(`[ABBREVIATION] Expanding "${term}" with Claude Haiku...`);

  const prompt = `You are a supplement and biochemistry expert. A user searched for the supplement abbreviation "${term}".

Your task: Provide the full chemical or scientific names for this supplement abbreviation, optimized for PubMed searches.

Rules:
1. Return ONLY names that would find studies in PubMed
2. Order by: most common scientific name first
3. Include chemical names, brand names if very common
4. Maximum 3-4 alternatives
5. If you don't recognize it, return empty array

Return ONLY a JSON array, no explanation:
["primary name", "alternative name 1", "alternative name 2"]

Examples:
- "HMB" → ["beta-hydroxy beta-methylbutyrate", "β-hydroxy-β-methylbutyrate", "leucine metabolite"]
- "BCAA" → ["branched-chain amino acids", "leucine isoleucine valine"]
- "NAC" → ["N-acetylcysteine", "N-acetyl-L-cysteine"]

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

    console.log(`[ABBREVIATION] Claude response: ${content}`);

    // Parse JSON array from response
    // Handle both direct JSON and markdown-wrapped JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`[ABBREVIATION] No JSON array found in response`);
      return [];
    }

    const alternatives = JSON.parse(jsonMatch[0]) as string[];

    // Validate and filter
    const validated = alternatives
      .filter(alt => typeof alt === 'string' && alt.length > 0)
      .slice(0, 4); // Max 4 alternatives

    console.log(`[ABBREVIATION] Expanded to: ${validated.join(', ')}`);

    return validated;

  } catch (error) {
    console.error('[ABBREVIATION] Error expanding with LLM:', error);
    return [];
  }
}

// ====================================
// MAIN EXPANSION FUNCTION
// ====================================

/**
 * Main function: Detect and expand abbreviation
 *
 * @param term - The supplement term to analyze
 * @returns Expansion result with alternatives
 *
 * @example
 * const result = await expandAbbreviation('HMB');
 * // result.alternatives = ['beta-hydroxy beta-methylbutyrate', ...]
 */
export async function expandAbbreviation(
  term: string
): Promise<AbbreviationExpansion> {
  const trimmed = term.trim();

  console.log(`[ABBREVIATION] Analyzing term: "${trimmed}"`);

  // 1. Check if it's an abbreviation
  const isAbbr = isLikelyAbbreviation(trimmed);

  if (!isAbbr) {
    console.log(`[ABBREVIATION] Not an abbreviation, using original term`);
    return {
      original: trimmed,
      isAbbreviation: false,
      alternatives: [trimmed],
      confidence: 1.0,
      source: 'none',
    };
  }

  console.log(`[ABBREVIATION] Detected abbreviation, expanding...`);

  // 2. Try to expand with LLM
  const llmAlternatives = await expandWithLLM(trimmed);

  if (llmAlternatives.length > 0) {
    return {
      original: trimmed,
      isAbbreviation: true,
      alternatives: llmAlternatives,
      confidence: 0.9,
      source: 'llm',
    };
  }

  // 3. Fallback: use original term
  console.log(`[ABBREVIATION] Could not expand, using original term`);
  return {
    original: trimmed,
    isAbbreviation: true,
    alternatives: [trimmed],
    confidence: 0.5,
    source: 'heuristic',
  };
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
