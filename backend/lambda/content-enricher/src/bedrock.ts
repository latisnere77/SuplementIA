/**
 * Bedrock client for calling Claude
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { BedrockRequest, BedrockResponse, EnrichedContent, ExamineStyleContent, PubMedStudy } from './types';
import { buildEnrichmentPrompt, validateEnrichedContent } from './prompts';
import { buildExamineStylePrompt, validateExamineStyleContent } from './prompts-examine-style';
import { retryWithBackoff } from './retry';

// Initialize Bedrock client
const baseClient = new BedrockRuntimeClient({ region: config.region });

// Capture with X-Ray if enabled
const client = config.xrayEnabled
  ? AWSXRay.captureAWSv3Client(baseClient)
  : baseClient;

/**
 * Call Bedrock to generate enriched content
 */
export async function generateEnrichedContent(
  supplementId: string,
  category: string = 'general',
  studies?: PubMedStudy[],
  contentType: 'standard' | 'examine-style' = 'standard',
  benefitQuery?: string
): Promise<{
  content: EnrichedContent | ExamineStyleContent;
  metadata: {
    tokensUsed: number;
    duration: number;
    studiesProvided: number;
  };
}> {
  const startTime = Date.now();

  // Build prompt based on content type
  const prompt = contentType === 'examine-style'
    ? buildExamineStylePrompt(supplementId, category, studies)
    : buildEnrichmentPrompt(supplementId, category, studies, benefitQuery);

  console.log(
    JSON.stringify({
      operation: 'BuildPrompt',
      supplementId,
      contentType,
      studiesProvided: studies?.length || 0,
      hasRealData: studies && studies.length > 0,
    })
  );

  // Prepare Bedrock request with JSON prefilling technique
  // Adding an assistant message that starts with "{" forces Claude to continue
  // with valid JSON, significantly reducing malformed JSON responses
  const bedrockRequest: BedrockRequest = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
      {
        role: 'assistant',
        content: '{',
      },
    ],
  };

  console.log(
    JSON.stringify({
      operation: 'BedrockCall',
      supplementId,
      modelId: config.modelId,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    })
  );

  // Call Bedrock with automatic retry on transient errors
  const response = await retryWithBackoff(
    async () => {
      return await client.send(
        new InvokeModelCommand({
          modelId: config.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(bedrockRequest),
        })
      );
    },
    `generateEnrichedContent-${supplementId}`
  );

  const duration = Date.now() - startTime;

  // Parse response
  const responseBody: BedrockResponse = JSON.parse(
    new TextDecoder().decode(response.body)
  );

  // Extract content text and prepend the "{" that we used for prefilling
  // Since we prefilled with "{", Claude's response continues from there
  const contentText = '{' + responseBody.content[0].text;
  const tokensUsed = responseBody.usage.input_tokens + responseBody.usage.output_tokens;

  // Calculate token usage metrics
  const percentageUsed = (responseBody.usage.output_tokens / config.maxTokens * 100);

  console.log(
    JSON.stringify({
      operation: 'BedrockResponse',
      supplementId,
      duration,
      tokensUsed,
      inputTokens: responseBody.usage.input_tokens,
      outputTokens: responseBody.usage.output_tokens,
      stopReason: responseBody.stop_reason || 'unknown',
      maxTokensConfig: config.maxTokens,
      percentageUsed: percentageUsed.toFixed(1),
    })
  );

  // Alert if approaching token limit
  if (percentageUsed > 90) {
    console.warn(
      JSON.stringify({
        event: 'NEAR_TOKEN_LIMIT',
        supplementId,
        outputTokens: responseBody.usage.output_tokens,
        maxTokens: config.maxTokens,
        percentageUsed: percentageUsed.toFixed(1),
        stopReason: responseBody.stop_reason,
        recommendation: 'Consider increasing max_tokens or simplifying prompt',
      })
    );
  }

  // Alert on unexpected stop_reason
  if (responseBody.stop_reason &&
      responseBody.stop_reason !== 'end_turn' &&
      responseBody.stop_reason !== 'tool_use') {
    console.error(
      JSON.stringify({
        event: 'UNEXPECTED_STOP_REASON',
        supplementId,
        stopReason: responseBody.stop_reason,
        expectedReasons: ['end_turn', 'tool_use'],
        outputTokens: responseBody.usage.output_tokens,
        maxTokens: config.maxTokens,
        percentageUsed: percentageUsed.toFixed(1),
      })
    );
  }

  /**
   * Sanitize and repair common JSON errors from LLM responses
   * This is a robust multi-stage sanitization process
   */
  const sanitizeJSON = (str: string): string => {
    let cleaned = str;

    // Stage 0: Fix Unicode typographic characters that break JSON
    // Curly/smart quotes → straight quotes
    cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // " " „ ‟ ″ ‶ → "
    cleaned = cleaned.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // ' ' ‚ ‛ ′ ‵ → '
    // Em/en dashes → regular hyphen
    cleaned = cleaned.replace(/[\u2013\u2014\u2015]/g, '-'); // – — ― → -
    // Ellipsis → three dots
    cleaned = cleaned.replace(/\u2026/g, '...'); // … → ...
    // Non-breaking space → regular space
    cleaned = cleaned.replace(/\u00A0/g, ' ');
    // Zero-width characters → remove
    cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

    // Stage 1: Remove control characters (except tabs, newlines in strings)
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (match) => {
      if (match === '\t' || match === '\n' || match === '\r') {
        return ' ';
      }
      return '';
    });

    // Stage 2: Fix invalid number values with symbols
    // >1000 → 1000, <50 → 50, ~100 → 100
    cleaned = cleaned.replace(/:\s*([><~±≈])(\d+)/g, ': $2');

    // Stage 3: Fix N/A, null, undefined values → 0 or empty string
    cleaned = cleaned.replace(/:\s*N\/A\s*(,|]|})/g, ': 0$1');
    cleaned = cleaned.replace(/:\s*undefined\s*(,|]|})/g, ': 0$1');
    cleaned = cleaned.replace(/:\s*null\s*(,|]|})/g, ': 0$1');

    // Stage 4: Fix numbers with commas (European style): 1,500 → 1500
    cleaned = cleaned.replace(/:\s*(\d{1,3}(?:,\d{3})+)\s*(,|]|})/g, (_match, num, end) => {
      return `: ${num.replace(/,/g, '')}${end}`;
    });

    // Stage 5: Fix trailing commas before } or ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Stage 6: Fix missing commas between array elements
    cleaned = cleaned.replace(/"\s*\n\s*"/g, '",\n"');
    cleaned = cleaned.replace(/}\s*\n\s*{/g, '},\n{');
    cleaned = cleaned.replace(/]\s*\n\s*\[/g, '],\n[');

    // Stage 7: Fix unescaped quotes in string values
    cleaned = cleaned.replace(/:\s*"([^"]*)"([^",}\]]*?)"/g, (match, p1, p2) => {
      if (p2.trim() && !p2.trim().startsWith(',') && !p2.trim().startsWith('}') && !p2.trim().startsWith(']')) {
        return `: "${p1}\\"${p2}"`;
      }
      return match;
    });

    // Stage 8: Fix truncated strings (strings that don't close properly)
    // Find strings that start but don't end properly before a comma or brace
    cleaned = cleaned.replace(/:\s*"([^"]*?)\s*(,|}|])/g, (match, content, end) => {
      // If the content doesn't have a closing quote, add it
      if (!content.includes('"')) {
        return `: "${content}"${end}`;
      }
      return match;
    });

    return cleaned;
  };

  /**
   * Multi-stage JSON parsing with progressive fallback strategies
   */
  const parseJSONWithFallback = (text: string): EnrichedContent => {
    // Strategy 1: Direct parse with sanitization
    try {
      return JSON.parse(sanitizeJSON(text));
    } catch (error1: any) {
      console.warn(`Strategy 1 failed (direct parse): ${error1.message}`);
    }

    // Strategy 2: Extract from markdown code block
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      try {
        return JSON.parse(sanitizeJSON(markdownMatch[1]));
      } catch (error2: any) {
        console.warn(`Strategy 2 failed (markdown): ${error2.message}`);
      }
    }

    // Strategy 3: Extract JSON between first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = text.substring(firstBrace, lastBrace + 1);
      const sanitizedExtracted = sanitizeJSON(extracted);
      try {
        return JSON.parse(sanitizedExtracted);
      } catch (error3: any) {
        console.warn(`Strategy 3 failed (extraction): ${error3.message}`);

        // Get error position for debugging
        const errorPos = parseInt(error3.message.match(/\d+/)?.[0] || '0');
        const snippet = sanitizedExtracted.substring(
          Math.max(0, errorPos - 50),
          Math.min(sanitizedExtracted.length, errorPos + 50)
        );
        // Log character codes around error position for debugging Unicode issues
        const charCodes = sanitizedExtracted.substring(
          Math.max(0, errorPos - 5),
          Math.min(sanitizedExtracted.length, errorPos + 5)
        ).split('').map(c => c.charCodeAt(0));
        console.error(`JSON error at pos ${errorPos}: ...${snippet}... | CharCodes: [${charCodes.join(', ')}]`);
      }
    }

    // Strategy 4: Try aggressive repair - remove everything after last valid }
    try {
      // Find all closing braces and try from the last one backwards
      const braces = [];
      for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === '}') braces.push(i);
      }

      for (const bracePos of braces.slice(0, 20)) { // Try first 20 closing braces (increased from 5 to handle CloudWatch log contamination)
        const candidate = text.substring(firstBrace, bracePos + 1);
        try {
          return JSON.parse(sanitizeJSON(candidate));
        } catch (e) {
          // Try next brace
          continue;
        }
      }
    } catch (error4: any) {
      console.warn(`Strategy 4 failed (aggressive repair): ${error4.message}`);
    }

    // All strategies failed
    throw new Error(
      'Failed to parse JSON from Bedrock response after all repair strategies. ' +
      'The LLM may have generated severely malformed JSON.'
    );
  };

  // Parse JSON from Claude's response with enhanced error handling
  let enrichedData: any;

  try {
    enrichedData = parseJSONWithFallback(contentText);
  } catch (parseError: any) {
    // Log detailed error for debugging
    console.error(
      JSON.stringify({
        event: 'JSON_PARSE_FAILED_ALL_STRATEGIES',
        supplementId,
        contentType,
        error: parseError.message,
        responseLength: contentText.length,
        responsePreview: contentText.substring(0, 500),
        timestamp: new Date().toISOString(),
      })
    );

    // Re-throw with more context
    throw new Error(
      `Failed to parse enriched content JSON: ${parseError.message}. ` +
      `This indicates the LLM generated invalid JSON despite repair attempts.`
    );
  }

  // Validate structure based on content type
  const validation = contentType === 'examine-style'
    ? validateExamineStyleContent(enrichedData)
    : validateEnrichedContent(enrichedData);
    
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    throw new Error(`Invalid enriched content structure: ${validation.errors.join(', ')}`);
  }

  return {
    content: enrichedData,
    metadata: {
      tokensUsed,
      duration,
      studiesProvided: studies?.length || 0,
    },
  };
}
