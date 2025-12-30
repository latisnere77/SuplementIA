/**
 * Abbreviation Expander Service
 * Intelligently detects and expands supplement abbreviations using Claude Haiku
 *
 * Examples:
 * - "HMB" → ["beta-hydroxy beta-methylbutyrate", "β-hydroxy-β-methylbutyrate"]
 * - "BCAA" → ["branched-chain amino acids", "leucine isoleucine valine"]
 * - "NAC" → ["N-acetylcysteine", "N-acetyl-L-cysteine"]
 */

// Dynamic import to avoid loading AWS SDK when credentials are not available
// This prevents CredentialsProviderError during module load in Amplify environment
type BedrockRuntimeClient = any;
type InvokeModelCommand = any;

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

// Use Haiku for fast, cheap abbreviation expansion
const MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

// Lazy-initialize Bedrock client to avoid credentials errors at module load time
let bedrockClient: any | null = null;
let bedrockInitAttempted = false;

async function getBedrockClient(): Promise<any | null> {
  if (bedrockInitAttempted) {
    return bedrockClient;
  }

  bedrockInitAttempted = true;

  try {
    // Dynamic import to avoid loading AWS SDK at module load time
    const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');

    bedrockClient = new BedrockRuntimeClient({
      region: (process.env.AWS_REGION || 'us-east-1').trim(),
    });
    console.log('[BEDROCK] Bedrock client initialized successfully');
    return bedrockClient;
  } catch (error) {
    console.warn('[BEDROCK] Bedrock client initialization failed - LLM expansion disabled:', error instanceof Error ? error.message : 'Unknown error');
    bedrockClient = null;
    return null;
  }
}

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

/**
 * Detect if a term contains Spanish characteristics
 * This is a fallback safety net in case LLM fails to translate
 *
 * Spanish patterns:
 * - Ends in: -ina, -ino, -eno, -ano, -osa, -ato
 * - Contains: ácido, acido, vitamina
 * - Accent marks: á, é, í, ó, ú, ñ
 */
function detectSpanishTerm(term: string): boolean {
  const lower = term.toLowerCase();

  // Pattern 1: Spanish endings
  const spanishEndings = ['-ina', '-ino', '-eno', '-ano', '-osa', '-ato'];
  const hasSpanishEnding = spanishEndings.some(ending => {
    // Check if ANY word in the term has this ending
    const words = lower.split(/\s+/);
    return words.some(word => word.endsWith(ending) && word.length > 4);
  });

  // Pattern 2: Spanish keywords
  const spanishKeywords = ['ácido', 'acido', 'vitamina', 'hierro', 'calcio', 'extracto'];
  const hasSpanishKeyword = spanishKeywords.some(keyword => lower.includes(keyword));

  // Pattern 3: Spanish accent marks
  const hasAccent = /[áéíóúñ]/.test(lower);

  return hasSpanishEnding || hasSpanishKeyword || hasAccent;
}

/**
 * Programmatic Spanish→English translation fallback
 * Used when LLM fails to translate Spanish terms
 *
 * This is a SIMPLE pattern-based translator for common supplement terms
 */
function translateSpanishProgrammatically(term: string): string | null {
  const lower = term.toLowerCase().trim();

  // Common Spanish→English supplement translations
  const translations: Record<string, string> = {
    // Single words
    'magnesio': 'magnesium',
    'calcio': 'calcium',
    'hierro': 'iron',
    'zinc': 'zinc',
    'cobre': 'copper',
    'creatina': 'creatine',
    'melatonina': 'melatonin',
    'colageno': 'collagen',
    'espirulina': 'spirulina',
    'astaxantina': 'astaxanthin',
    'curcuma': 'turmeric',
    'cúrcuma': 'turmeric',
    'jengibre': 'ginger',
    'cilantro': 'coriander',
    'niacina': 'niacin',
    'biotina': 'biotin',
    'tiamina': 'thiamine',
    'riboflavina': 'riboflavin',
    'vitamina': 'vitamin',
    'yodo': 'iodine',

    // Compound terms
    'acido hialuronico': 'hyaluronic acid',
    'ácido hialuronico': 'hyaluronic acid',
    'acido folico': 'folic acid',
    'ácido fólico': 'folic acid',
    'acido alfa lipoico': 'alpha lipoic acid',
    'ácido alfa lipoico': 'alpha lipoic acid',
    'l-teanina': 'l-theanine',
    'fosfatidilserina': 'phosphatidylserine',
    'citrulina malato': 'citrulline malate',
    'beta alanina': 'beta alanine',
    'beta-alanina': 'beta-alanine',
    'extracto de te verde': 'green tea extract',
    'aceite de pescado': 'fish oil',
    'astrágalo': 'astragalus',
    'astragalo': 'astragalus',
    'melena de león': 'lions mane',
    'melena de leon': 'lions mane',
    'hongo reishi': 'reishi',
    'reishi': 'reishi',
    'cardo mariano': 'milk thistle',
    'uñas de gato': 'cats claw',
    'uña de gato': 'cats claw',
  };

  // Direct lookup
  if (translations[lower]) {
    return translations[lower];
  }

  // Pattern-based translation for terms not in dictionary
  // This handles simple endings transformation
  let translated = lower;

  // Transform common patterns
  if (translated.endsWith('eno')) {
    translated = translated.replace(/eno$/, 'en'); // colageno → collagen
  } else if (translated.endsWith('io')) {
    translated = translated.replace(/io$/, 'ium'); // magnesio → magnesium
  } else if (translated.endsWith('ato')) {
    translated = translated.replace(/ato$/, 'ate'); // malato → malate
  }

  // Only return if we actually transformed something
  return translated !== lower ? translated : null;
}

// ====================================
// LLM-BASED EXPANSION
// ====================================

/**
 * Expand abbreviation using Claude Haiku with Prompt Caching
 * Handles:
 * - Spanish→English translation
 * - Abbreviation expansion
 * - Scientific name suggestions
 */
async function expandWithLLM(term: string): Promise<string[]> {
  // TEMPORARILY DISABLED: LLM expansion causes credentials errors in Amplify environment
  // TODO: Re-enable once AWS credentials are properly configured in Amplify
  console.log(`[ABBREVIATION] LLM expansion temporarily disabled - skipping for "${term}"`);
  return [];

  /* COMMENTED OUT - Re-enable when credentials are available
  // Check if LLM expansion is disabled via environment variable
  if (process.env.DISABLE_LLM_EXPANSION === 'true') {
    console.log(`[ABBREVIATION] LLM expansion disabled via DISABLE_LLM_EXPANSION - skipping for "${term}"`);
    return [];
  }

  // Lazy-load Bedrock client and check if available
  const client = await getBedrockClient();
  if (!client) {
    console.log(`[ABBREVIATION] Bedrock not available - skipping LLM expansion for "${term}"`);
    return [];
  }
  */
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

  // 2. Detect if term is Spanish BEFORE calling LLM (fallback safety net)
  const isSpanish = detectSpanishTerm(trimmed);

  console.log(
    JSON.stringify({
      event: 'SPANISH_DETECTION',
      term: trimmed,
      isSpanish,
      timestamp: new Date().toISOString(),
    })
  );

  // 3. ALWAYS try LLM expansion (handles both abbreviations AND Spanish translation)
  // The LLM will return empty array if no expansion/translation needed
  // Add timeout to prevent slow LLM calls from blocking the entire request
  const llmStartTime = Date.now();
  const LLM_TIMEOUT = 8000; // 8 seconds max for LLM expansion

  let llmAlternatives: string[] = [];
  try {
    llmAlternatives = await Promise.race([
      expandWithLLM(trimmed),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error('LLM expansion timeout')), LLM_TIMEOUT)
      ),
    ]);
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'ABBREVIATION_LLM_TIMEOUT',
        term: trimmed,
        error: error instanceof Error ? error.message : 'Unknown error',
        timeout: LLM_TIMEOUT,
        fallback: 'using_original_term',
        timestamp: new Date().toISOString(),
      })
    );
    llmAlternatives = [];
  }

  const llmDuration = Date.now() - llmStartTime;

  console.log(
    JSON.stringify({
      event: 'ABBREVIATION_LLM_COMPLETE',
      term: trimmed,
      isAbbreviation: isAbbr,
      isSpanish,
      alternativesCount: llmAlternatives.length,
      alternatives: llmAlternatives,
      llmDuration,
      timestamp: new Date().toISOString(),
    })
  );

  // 4. If LLM returned results, use them
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

  // 5. CRITICAL FALLBACK: If Spanish term detected but LLM returned empty, use programmatic translation
  // This is a safety net for when Claude Haiku fails to translate Spanish terms
  if (isSpanish && llmAlternatives.length === 0) {
    console.warn(
      JSON.stringify({
        event: 'SPANISH_LLM_FAILURE_FALLBACK',
        term: trimmed,
        reason: 'llm_failed_to_translate_spanish_term',
        action: 'using_programmatic_translation',
        timestamp: new Date().toISOString(),
      })
    );

    // Simple programmatic Spanish→English translation for common patterns
    const programmaticTranslation = translateSpanishProgrammatically(trimmed);

    if (programmaticTranslation) {
      const totalDuration = Date.now() - startTime;
      console.log(
        JSON.stringify({
          event: 'SPANISH_FALLBACK_SUCCESS',
          term: trimmed,
          translatedTo: programmaticTranslation,
          source: 'programmatic_fallback',
          totalDuration,
          timestamp: new Date().toISOString(),
        })
      );

      return {
        original: trimmed,
        isAbbreviation: false,
        alternatives: [programmaticTranslation],
        confidence: 0.7, // Lower confidence than LLM
        source: 'heuristic',
      };
    }
  }

  // 6. Final fallback: use original term (no expansion needed)
  const totalDuration = Date.now() - startTime;
  console.log(
    JSON.stringify({
      event: 'ABBREVIATION_NO_EXPANSION',
      term: trimmed,
      isAbbreviation: isAbbr,
      isSpanish,
      reason: isSpanish ? 'spanish_term_but_no_translation_available' : 'llm_returned_empty_or_no_expansion_needed',
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

  // TEMPORARILY DISABLED: LLM expansion causes credentials errors in Amplify environment
  // TODO: Re-enable once AWS credentials are properly configured in Amplify
  console.log(`[SEARCH_VARIATIONS] LLM expansion temporarily disabled - skipping for "${trimmed}"`);
  return [];

  /* COMMENTED OUT - Re-enable when credentials are available
  // Check if LLM expansion is disabled via environment variable
  if (process.env.DISABLE_LLM_EXPANSION === 'true') {
    console.log(`[SEARCH_VARIATIONS] LLM expansion disabled via DISABLE_LLM_EXPANSION - skipping for "${trimmed}"`);
    return [];
  }

  // Lazy-load Bedrock client and check if available
  const client = await getBedrockClient();
  if (!client) {
    console.log(`[SEARCH_VARIATIONS] Bedrock not available - skipping variations for "${trimmed}"`);
    return [];
  }

  // Dynamic import of InvokeModelCommand
  const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

  console.log(
    JSON.stringify({
      event: 'SEARCH_VARIATIONS_GENERATION_START',
      term: trimmed,
      timestamp: new Date().toISOString(),
    })
  );
  */
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
