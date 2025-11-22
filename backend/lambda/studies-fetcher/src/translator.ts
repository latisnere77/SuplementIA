/**
 * Spanish to English Translator using AWS Bedrock (Claude Haiku)
 * This runs in AWS Lambda so it has access to Bedrock without needing credentials
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

// Static map for high-traffic terms (performance optimization)
const STATIC_TRANSLATIONS: Record<string, string> = {
  // Common Spanish→English translations
  'vitamina d': 'vitamin d',
  'vitamina c': 'vitamin c',
  'vitamina k2': 'vitamin k2',
  'omega 3': 'omega 3',
  'coenzima q10': 'coenzyme q10',
  'magnesio': 'magnesium',
  'calcio': 'calcium',
  'hierro': 'iron',
  'zinc': 'zinc',
  'condroitina': 'chondroitin',
  'glucosamina': 'glucosamine',
  'colageno': 'collagen',
  'colágeno': 'collagen',
  'melatonina': 'melatonin',
  'creatina': 'creatine',
  'berberina': 'berberine',
  'curcuma': 'turmeric',
  'cúrcuma': 'turmeric',
  'jengibre': 'ginger',
  'menta': 'peppermint',
  'valeriana': 'valerian',
  'manzanilla': 'chamomile',
  'lavanda': 'lavender',
  'ginseng': 'ginseng',
  'ashwagandha': 'ashwagandha',
  'rhodiola': 'rhodiola',
};

/**
 * Detect if a term is in Spanish
 */
function isSpanishTerm(term: string): boolean {
  const lower = term.toLowerCase();
  
  // Spanish accent marks
  if (/[áéíóúñ]/.test(lower)) {
    return true;
  }
  
  // Spanish endings
  const spanishEndings = ['ina', 'ino', 'eno', 'ano', 'osa', 'ato'];
  const words = lower.split(/\s+/);
  const hasSpanishEnding = words.some(word => 
    spanishEndings.some(ending => word.endsWith(ending) && word.length > 4)
  );
  
  if (hasSpanishEnding) {
    return true;
  }
  
  // Spanish keywords
  const spanishKeywords = ['vitamina', 'acido', 'ácido', 'extracto'];
  if (spanishKeywords.some(keyword => lower.includes(keyword))) {
    return true;
  }
  
  return false;
}

/**
 * Translate Spanish supplement name to English using Claude Haiku
 */
export async function translateToEnglish(term: string): Promise<string> {
  const lower = term.toLowerCase().trim();
  
  // Check static map first (fast path)
  if (STATIC_TRANSLATIONS[lower]) {
    console.log(
      JSON.stringify({
        event: 'TRANSLATION_STATIC',
        original: term,
        translated: STATIC_TRANSLATIONS[lower],
        source: 'static_map',
        timestamp: new Date().toISOString(),
      })
    );
    return STATIC_TRANSLATIONS[lower];
  }
  
  // Check if it's Spanish
  if (!isSpanishTerm(term)) {
    console.log(
      JSON.stringify({
        event: 'TRANSLATION_SKIPPED',
        term,
        reason: 'not_spanish',
        timestamp: new Date().toISOString(),
      })
    );
    return term; // Not Spanish, return as-is
  }
  
  // Use Claude Haiku for translation
  const startTime = Date.now();
  
  try {
    const prompt = `Translate this Spanish supplement name to English. Return ONLY the English name, nothing else.

Spanish: ${term}
English:`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 50,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const translated = responseBody.content[0].text.trim().toLowerCase();
    const duration = Date.now() - startTime;
    
    console.log(
      JSON.stringify({
        event: 'TRANSLATION_LLM_SUCCESS',
        original: term,
        translated,
        duration,
        inputTokens: responseBody.usage?.input_tokens,
        outputTokens: responseBody.usage?.output_tokens,
        timestamp: new Date().toISOString(),
      })
    );
    
    return translated;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      JSON.stringify({
        event: 'TRANSLATION_LLM_FAILED',
        original: term,
        error: error.message,
        duration,
        fallback: 'using_original',
        timestamp: new Date().toISOString(),
      })
    );
    
    // Fallback: return original term
    return term;
  }
}
