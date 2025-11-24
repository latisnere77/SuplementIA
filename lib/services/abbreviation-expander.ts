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
  console.log(`[ABBREVIATION] Expanding "${term}" with Claude Haiku...`);

  // SYSTEM PROMPT with Prompt Caching (>2048 tokens for cache eligibility)
  // This prompt is cached for 5 minutes, reducing latency from 2-5s to 200-500ms
  const systemPrompt = `You are a world-class expert in NUTRACEUTICALS, DIETARY SUPPLEMENTS, and EVIDENCE-BASED NUTRITION.

DOMAIN EXPERTISE:
You specialize in vitamins, minerals, herbs, amino acids, probiotics, adaptogens, nootropics, and all substances used for human health optimization. You understand scientific nomenclature (IUPAC, botanical Latin names), common names in multiple languages (English, Spanish, Portuguese), trade names, chemical forms, bioavailability differences, abbreviations used in research, and PubMed MeSH terms.

CONTEXT: NUTRACEUTICAL SEARCH SYSTEM
Users are searching for supplements, vitamins, minerals, herbs, or other health-related substances to find scientific evidence from PubMed. Your job is to normalize their query into the BEST search terms for finding relevant studies.

YOUR TASK:
Given a user's search term, provide the optimal PubMed search terms. Consider:
1. **Language Translation**: Spanish/Portuguese → English (PubMed is primarily English)
2. **Abbreviation Expansion**: NAC → N-acetylcysteine, CoQ10 → Coenzyme Q10
3. **Scientific Names**: Add botanical/chemical names when helpful for herbs
4. **Common Variants**: Include alternative spellings or forms
5. **Optimization**: If already optimal, return empty array []

OUTPUT FORMAT (JSON only, no explanation):
- If normalization needed: ["primary_term", "alternative_term", ...]
- If already optimal: []
- Maximum 3 alternatives
- Prioritize terms that will find the MOST relevant PubMed studies

EXAMPLES:

Spanish Translation:
Input: "ajo"
Output: ["garlic", "allium sativum"]

Input: "cebolla"
Output: ["onion", "allium cepa"]
Input: "menta"
Output: ["peppermint", "mentha"]

Input: "jengibre"
Output: ["ginger", "zingiber officinale"]

Input: "cúrcuma"
Output: ["turmeric", "curcumin"]

Input: "magnesio"
Output: ["magnesium"]

Input: "berberina"
Output: ["berberine"]

Input: "colageno"
Output: ["collagen"]

Input: "melatonina"
Output: ["melatonin"]

Input: "valeriana"
Output: ["valerian", "valeriana officinalis"]

Input: "manzanilla"
Output: ["chamomile", "matricaria"]

Input: "lavanda"
Output: ["lavender", "lavandula"]

Abbreviation Expansion:
Input: "HMB"
Output: ["beta-hydroxy beta-methylbutyrate", "HMB"]

Input: "NAC"
Output: ["N-acetylcysteine", "N-acetyl-L-cysteine"]

Input: "BCAA"
Output: ["branched-chain amino acids", "leucine isoleucine valine"]

Input: "CoQ10"
Output: ["coenzyme q10", "ubiquinone"]

Input: "5-HTP"
Output: ["5-hydroxytryptophan"]

Input: "CBD"
Output: ["cannabidiol"]

Input: "DHEA"
Output: ["dehydroepiandrosterone"]

Scientific Names (when helpful):
Input: "saw palmetto"
Output: ["saw palmetto", "serenoa repens"]

Input: "ginkgo"
Output: ["ginkgo", "ginkgo biloba"]

Input: "ashwagandha"
Output: ["ashwagandha", "withania somnifera"]

Input: "rhodiola"
Output: ["rhodiola", "rhodiola rosea"]

Input: "panax ginseng"
Output: ["ginseng", "panax ginseng"]

Input: "milk thistle"
Output: ["milk thistle", "silybum marianum"]

Input: "st john's wort"
Output: ["st johns wort", "hypericum perforatum"]

Already Optimal (no change needed):
Input: "magnesium"
Output: []

Input: "vitamin d"
Output: []

Input: "omega-3"
Output: []

Input: "creatine"
Output: []

Input: "protein"
Output: []

Input: "caffeine"
Output: []

Input: "zinc"
Output: []

Input: "iron"
Output: []

MORE SPANISH TRANSLATIONS:
Input: "acido folico"
Output: ["folic acid"]

Input: "ácido fólico"
Output: ["folic acid"]

Input: "acido hialuronico"
Output: ["hyaluronic acid"]

Input: "ácido hialurónico"
Output: ["hyaluronic acid"]

Input: "acido alfa lipoico"
Output: ["alpha lipoic acid"]

Input: "ácido alfa lipoico"
Output: ["alpha lipoic acid"]

Input: "l-teanina"
Output: ["l-theanine"]

Input: "fosfatidilserina"
Output: ["phosphatidylserine"]

Input: "citrulina malato"
Output: ["citrulline malate"]

Input: "beta alanina"
Output: ["beta alanine"]

Input: "beta-alanina"
Output: ["beta-alanine"]

Input: "extracto de te verde"
Output: ["green tea extract"]

Input: "aceite de pescado"
Output: ["fish oil"]

Input: "espirulina"
Output: ["spirulina"]

Input: "astaxantina"
Output: ["astaxanthin"]

Input: "cilantro"
Output: ["coriander", "cilantro"]

Input: "niacina"
Output: ["niacin", "vitamin b3"]

Input: "biotina"
Output: ["biotin", "vitamin b7"]

Input: "tiamina"
Output: ["thiamine", "vitamin b1"]

Input: "riboflavina"
Output: ["riboflavin", "vitamin b2"]

Input: "vitamina"
Output: ["vitamin"]

Input: "calcio"
Output: ["calcium"]

Input: "hierro"
Output: ["iron"]

Input: "cobre"
Output: ["copper"]

Input: "creatina"
Output: ["creatine"]

Input: "colageno"
Output: ["collagen"]

Input: "colágeno"
Output: ["collagen"]

Input: "glucosamina"
Output: ["glucosamine"]

Input: "condroitina"
Output: ["chondroitin"]

Input: "acai"
Output: ["acai", "acai berry"]

Input: "açaí"
Output: ["acai", "acai berry"]

Input: "guarana"
Output: ["guarana"]

Input: "guaraná"
Output: ["guarana"]

Input: "maca"
Output: ["maca", "lepidium meyenii"]

Input: "quinoa"
Output: ["quinoa"]

Input: "chia"
Output: ["chia", "chia seeds"]

Input: "lino"
Output: ["flax", "flaxseed"]

Input: "semillas de lino"
Output: ["flax seeds", "flaxseed"]

Input: "aceite de coco"
Output: ["coconut oil"]

Input: "aceite de oliva"
Output: ["olive oil"]

Input: "te verde"
Output: ["green tea"]

Input: "té verde"
Output: ["green tea"]

Input: "te negro"
Output: ["black tea"]

Input: "té negro"
Output: ["black tea"]

Input: "te blanco"
Output: ["white tea"]

Input: "té blanco"
Output: ["white tea"]

Input: "rooibos"
Output: ["rooibos"]

Input: "hibisco"
Output: ["hibiscus"]

Input: "equinacea"
Output: ["echinacea"]

Input: "ginkgo biloba"
Output: ["ginkgo biloba"]

Input: "ginseng"
Output: ["ginseng"]

Input: "eleuterococo"
Output: ["eleuthero", "siberian ginseng"]

Input: "regaliz"
Output: ["licorice", "glycyrrhiza"]

Input: "diente de leon"
Output: ["dandelion", "taraxacum"]

Input: "diente de león"
Output: ["dandelion", "taraxacum"]

Input: "ortiga"
Output: ["nettle", "urtica"]

Input: "cola de caballo"
Output: ["horsetail", "equisetum"]

Input: "aloe vera"
Output: ["aloe vera"]

Input: "sábila"
Output: ["aloe vera"]

Input: "propóleo"
Output: ["propolis"]

Input: "jalea real"
Output: ["royal jelly"]

Input: "polen"
Output: ["bee pollen"]

Input: "miel"
Output: ["honey"]

Input: "canela"
Output: ["cinnamon"]

Input: "clavo"
Output: ["clove"]

Input: "nuez moscada"
Output: ["nutmeg"]

Input: "cardamomo"
Output: ["cardamom"]

Input: "azafrán"
Output: ["saffron"]

Input: "pimienta negra"
Output: ["black pepper", "piperine"]

Input: "ajo"
Output: ["garlic", "allium sativum"]

Input: "cebolla"
Output: ["onion"]

Input: "tomate"
Output: ["tomato", "lycopene"]

Input: "zanahoria"
Output: ["carrot", "beta carotene"]

Input: "espinaca"
Output: ["spinach"]

Input: "brócoli"
Output: ["broccoli"]

Input: "broccoli"
Output: ["broccoli"]

Input: "col rizada"
Output: ["kale"]

Input: "kale"
Output: ["kale"]

Input: "arándano"
Output: ["blueberry"]

Input: "arándano rojo"
Output: ["cranberry"]

Input: "fresa"
Output: ["strawberry"]

Input: "frambuesa"
Output: ["raspberry"]

Input: "mora"
Output: ["blackberry"]

Input: "cereza"
Output: ["cherry"]

Input: "granada"
Output: ["pomegranate"]

Input: "uva"
Output: ["grape", "resveratrol"]

Input: "naranja"
Output: ["orange", "vitamin c"]

Input: "limón"
Output: ["lemon", "vitamin c"]

Input: "lima"
Output: ["lime"]

Input: "pomelo"
Output: ["grapefruit"]

Input: "mandarina"
Output: ["tangerine", "mandarin"]

Input: "kiwi"
Output: ["kiwi"]

Input: "papaya"
Output: ["papaya"]

Input: "mango"
Output: ["mango"]

Input: "piña"
Output: ["pineapple", "bromelain"]

Input: "plátano"
Output: ["banana"]

Input: "banana"
Output: ["banana"]

Input: "aguacate"
Output: ["avocado"]

Input: "palta"
Output: ["avocado"]

MORE ABBREVIATIONS:
Input: "EPA"
Output: ["eicosapentaenoic acid", "EPA"]

Input: "DHA"
Output: ["docosahexaenoic acid", "DHA"]

Input: "ALA"
Output: ["alpha-linolenic acid", "ALA"]

Input: "GLA"
Output: ["gamma-linolenic acid", "GLA"]

Input: "CLA"
Output: ["conjugated linoleic acid", "CLA"]

Input: "MCT"
Output: ["medium-chain triglycerides", "MCT"]

Input: "SAMe"
Output: ["S-adenosylmethionine", "SAMe"]

Input: "TMG"
Output: ["trimethylglycine", "betaine"]

Input: "DMG"
Output: ["dimethylglycine", "DMG"]

Input: "MSM"
Output: ["methylsulfonylmethane", "MSM"]

Input: "GABA"
Output: ["gamma-aminobutyric acid", "GABA"]

Input: "DMAE"
Output: ["dimethylaminoethanol", "DMAE"]

Input: "PQQ"
Output: ["pyrroloquinoline quinone", "PQQ"]

Input: "NMN"
Output: ["nicotinamide mononucleotide", "NMN"]

Input: "NR"
Output: ["nicotinamide riboside", "NR"]

Input: "NAD"
Output: ["nicotinamide adenine dinucleotide", "NAD"]

Input: "ATP"
Output: ["adenosine triphosphate", "ATP"]

Input: "ADP"
Output: ["adenosine diphosphate", "ADP"]

Input: "AMP"
Output: ["adenosine monophosphate", "AMP"]

Input: "GMP"
Output: ["guanosine monophosphate", "GMP"]

Input: "IMP"
Output: ["inosine monophosphate", "IMP"]

Input: "UMP"
Output: ["uridine monophosphate", "UMP"]

Input: "CMP"
Output: ["cytidine monophosphate", "CMP"]

MORE SCIENTIFIC NAMES:
Input: "turmeric"
Output: ["turmeric", "curcuma longa"]

Input: "ginger"
Output: ["ginger", "zingiber officinale"]

Input: "garlic"
Output: ["garlic", "allium sativum"]

Input: "green tea"
Output: ["green tea", "camellia sinensis"]

Input: "black pepper"
Output: ["black pepper", "piper nigrum"]

Input: "cinnamon"
Output: ["cinnamon", "cinnamomum"]

Input: "fenugreek"
Output: ["fenugreek", "trigonella foenum-graecum"]

Input: "tribulus"
Output: ["tribulus", "tribulus terrestris"]

Input: "bacopa"
Output: ["bacopa", "bacopa monnieri"]

Input: "mucuna"
Output: ["mucuna", "mucuna pruriens"]

Input: "tongkat ali"
Output: ["tongkat ali", "eurycoma longifolia"]

Input: "maca"
Output: ["maca", "lepidium meyenii"]

Input: "cordyceps"
Output: ["cordyceps", "cordyceps sinensis"]

Input: "reishi"
Output: ["reishi", "ganoderma lucidum"]

Input: "lions mane"
Output: ["lions mane", "hericium erinaceus"]

Input: "chaga"
Output: ["chaga", "inonotus obliquus"]

Input: "shiitake"
Output: ["shiitake", "lentinula edodes"]

Input: "maitake"
Output: ["maitake", "grifola frondosa"]

Input: "turkey tail"
Output: ["turkey tail", "trametes versicolor"]

Input: "valerian"
Output: ["valerian", "valeriana officinalis"]

Input: "passionflower"
Output: ["passionflower", "passiflora incarnata"]

Input: "lemon balm"
Output: ["lemon balm", "melissa officinalis"]

Input: "chamomile"
Output: ["chamomile", "matricaria chamomilla"]

Input: "lavender"
Output: ["lavender", "lavandula angustifolia"]

Input: "peppermint"
Output: ["peppermint", "mentha piperita"]

Input: "spearmint"
Output: ["spearmint", "mentha spicata"]

Input: "rosemary"
Output: ["rosemary", "rosmarinus officinalis"]

Input: "thyme"
Output: ["thyme", "thymus vulgaris"]

Input: "oregano"
Output: ["oregano", "origanum vulgare"]

Input: "basil"
Output: ["basil", "ocimum basilicum"]

Input: "sage"
Output: ["sage", "salvia officinalis"]

Input: "echinacea"
Output: ["echinacea", "echinacea purpurea"]

Input: "elderberry"
Output: ["elderberry", "sambucus nigra"]

Input: "hawthorn"
Output: ["hawthorn", "crataegus"]

Input: "bilberry"
Output: ["bilberry", "vaccinium myrtillus"]

Input: "cranberry"
Output: ["cranberry", "vaccinium macrocarpon"]

Input: "blueberry"
Output: ["blueberry", "vaccinium corymbosum"]

IMPORTANT GUIDELINES:
- For English terms that are already good for PubMed, return []
- For terms that need scientific names, include both common and scientific
- For Spanish terms, ALWAYS translate to English
- For abbreviations, ALWAYS expand to full name
- Keep alternatives relevant and useful for PubMed searches
- Maximum 3 alternatives per term
- Prioritize terms that will find the most relevant studies
- Scientific names are especially helpful for herbs and botanicals
- Common supplement names (magnesium, vitamin d, etc) don't need alternatives`;

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

    const response = await bedrockClient.send(command);
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
  const LLM_TIMEOUT = 5000; // 5 seconds max for LLM expansion
  
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
