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

  // Dynamic import of InvokeModelCommand
  const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

  console.log(`[ABBREVIATION] Expanding "${term}" with Claude Haiku...`);
  */

  // SYSTEM PROMPT with Prompt Caching (>2048 tokens for cache eligibility)
  // This prompt is cached for 5 minutes, reducing latency from 2-5s to 200-500ms
  const systemPrompt = `You are a world-class expert in NUTRACEUTICALS, DIETARY SUPPLEMENTS, and EVIDENCE-BASED NUTRITION.

DOMAIN EXPERTISE:
Your expertise covers ALL of the following categories:
- Vitamins & Minerals (e.g., Vitamin C, Magnesium Glycinate)
- Medicinal Mushrooms & Fungi (e.g., Reishi, Lion's Mane, Chaga)
- Adaptogens & Herbs (e.g., Ashwagandha, Astragalus, Rhodiola)
- Amino Acids & Proteins (e.g., L-Theanine, Creatine, NAC)
- Probiotics, Prebiotics & Postbiotics
- Enzymes & Co-factors (e.g., CoQ10, digestive enzymes, Q10)
- Nootropics & Cognitive Enhancers
- Essential Fatty Acids (e.g., Omega-3, EPA, DHA)
- Botanical Extracts & Phytochemicals

CORE MISSION:
You act as a normalization layer for a PubMed search system. Users will provide terms in various languages (primarily Spanish or English), often using common names, abbreviations, or trade names. You must provide the OPTIMAL PubMed search terms in English.

YOUR TASK:
1. **Language Translation**: If the input is in Spanish (including those with accents like 'á', 'é', 'í', 'ó', 'ú', 'ñ'), ALWAYS translate it to its primary English common name (e.g., "astrágalo" -> "astragalus", "ajo" -> "garlic", "hongo reishi" -> "reishi").
2. **Abbreviation Expansion**: Expand ANY supplement abbreviations (e.g., "NAC" -> "N-acetylcysteine", "Q10" -> "coenzyme q10", "D3" -> "vitamin d3").
3. **Scientific Nomenclature**: Whenever possible, include the Latin botanical name for herbs and fungi, and the precise chemical form for minerals if applicable.
4. **Variations**: Suggest the best English search terms to find scientific studies (max 3).

OUTPUT REQUIREMENTS:
- Format: Return ONLY a JSON array of strings.
- Size: Maximum 3 primary search terms.
- Language: ALWAYS return English terms, even if the input was Spanish.
- No commentary, no introduction, JUST the JSON array.
- If the term is already an optimal English scientific term, return an empty array [].

EXAMPLES:
Input: "astrágalo" -> Output: ["astragalus", "astragalus membranaceus"]
Input: "cúrcuma" -> Output: ["turmeric", "curcumin", "curcuma longa"]
Input: "melena de león" -> Output: ["lions mane", "hericium erinaceus"]
Input: "citrato de magnesio" -> Output: ["magnesium citrate"]
Input: "Q10" -> Output: ["coenzyme q10", "ubiquinone"]
Input: "NAC" -> Output: ["N-acetylcysteine"]
Input: "ajo" -> Output: ["garlic", "allium sativum"]
Input: "vitamina d" -> Output: ["vitamin d"]
Input: "ashwagandha" -> Output: ["ashwagandha", "withania somnifera"]
Input: "magnesium" -> Output: []

IMPORTANT GUIDELINES:
- For English terms that are already good for PubMed (e.g., "Creatine", "Magnesium Glycinate"), return []
- For Spanish terms, ALWAYS translate to English.
- For botanicals (herbs/fungi), ALWAYS include the Latin name as an alternative.
- For minerals, keep the chemical form (citrate, glycinate, etc.) if provided in the input.
- NEVER return Spanish words in the output array.`;



  const userPrompt = `"${term}"`;

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 150,
        temperature: 0,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }, // Enable prompt caching
          },
        ],
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // Extract cache metrics
    const usage = responseBody.usage || {};
    const cacheReadTokens = usage.cache_read_input_tokens || 0;
    const cacheWriteTokens = usage.cache_creation_input_tokens || 0;
    const cacheHit = cacheReadTokens > 0;

    console.log(
      JSON.stringify({
        event: 'LLM_EXPANSION_RESPONSE',
        term,
        rawResponse: content,
        responseLength: content.length,
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        cacheReadTokens,
        cacheWriteTokens,
        cacheHit,
        cacheSavings: cacheHit ? `${Math.round((cacheReadTokens / (usage.input_tokens || 1)) * 100)}%` : '0%',
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
          rawResponse: content.substring(0, 500),
          timestamp: new Date().toISOString(),
        })
      );
      return [];
    }

    let alternatives: string[] = [];
    try {
      alternatives = JSON.parse(jsonMatch[0]) as string[];
    } catch (parseError) {
      console.error(
        JSON.stringify({
          event: 'LLM_EXPANSION_JSON_PARSE_ERROR',
          term,
          jsonMatch: jsonMatch[0].substring(0, 500),
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
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

  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'LLM_EXPANSION_ERROR',
        term,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
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

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    console.log(
      JSON.stringify({
        event: 'SEARCH_VARIATIONS_LLM_RESPONSE',
        term: trimmed,
        rawResponse: content.substring(0, 500),
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
    } catch (parseError) {
      console.error(
        JSON.stringify({
          event: 'SEARCH_VARIATIONS_JSON_PARSE_ERROR',
          term: trimmed,
          jsonMatch: jsonMatch[0].substring(0, 500),
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
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



    return finalVariations;

  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'SEARCH_VARIATIONS_ERROR',
        term: trimmed,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
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
