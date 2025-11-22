/**
 * Bedrock client for calling Claude
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { BedrockRequest, BedrockResponse, EnrichedContent, PubMedStudy } from './types';
import { buildEnrichmentPrompt, validateEnrichedContent } from './prompts';

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
  studies?: PubMedStudy[]
): Promise<{
  content: EnrichedContent;
  metadata: {
    tokensUsed: number;
    duration: number;
    studiesProvided: number;
  };
}> {
  const startTime = Date.now();

  // Build prompt with optional studies
  const prompt = buildEnrichmentPrompt(supplementId, category, studies);

  console.log(
    JSON.stringify({
      operation: 'BuildPrompt',
      supplementId,
      studiesProvided: studies?.length || 0,
      hasRealData: studies && studies.length > 0,
    })
  );

  // Prepare Bedrock request
  const bedrockRequest: BedrockRequest = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
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

  // Call Bedrock
  const response = await client.send(
    new InvokeModelCommand({
      modelId: config.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bedrockRequest),
    })
  );

  const duration = Date.now() - startTime;

  // Parse response
  const responseBody: BedrockResponse = JSON.parse(
    new TextDecoder().decode(response.body)
  );

  const contentText = responseBody.content[0].text;
  const tokensUsed = responseBody.usage.input_tokens + responseBody.usage.output_tokens;

  console.log(
    JSON.stringify({
      operation: 'BedrockResponse',
      supplementId,
      duration,
      tokensUsed,
      inputTokens: responseBody.usage.input_tokens,
      outputTokens: responseBody.usage.output_tokens,
    })
  );

  // Sanitize JSON by removing control characters and fixing common issues
  const sanitizeJSON = (str: string): string => {
    // Remove control characters
    let cleaned = str.replace(/[\x00-\x1F\x7F]/g, (match) => {
      if (match === '\t' || match === '\n' || match === '\r') {
        return ' ';
      }
      return '';
    });

    // Fix trailing commas before } or ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Fix unescaped quotes in string values (heuristic)
    // This is a simple fix - may need refinement
    cleaned = cleaned.replace(/:\s*"([^"]*)"([^",}\]]*?)"/g, (match, p1, p2) => {
      // If there's text after closing quote before comma/brace, it's likely an unescaped quote
      if (p2.trim() && !p2.trim().startsWith(',') && !p2.trim().startsWith('}') && !p2.trim().startsWith(']')) {
        return `: "${p1}\\"${p2}"`;
      }
      return match;
    });

    return cleaned;
  };

  // Parse JSON from Claude's response with enhanced error handling
  let enrichedData: EnrichedContent;

  try {
    enrichedData = JSON.parse(sanitizeJSON(contentText));
  } catch (parseError: any) {
    console.warn(`Initial JSON parse failed: ${parseError.message}`);

    // Sometimes Claude wraps JSON in markdown code blocks
    const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        enrichedData = JSON.parse(sanitizeJSON(jsonMatch[1]));
      } catch (e: any) {
        console.error(`Markdown JSON parse failed: ${e.message}`);
        throw new Error(`Failed to parse JSON from markdown block: ${e.message}`);
      }
    } else {
      // Try to extract JSON between first { and last }
      const firstBrace = contentText.indexOf('{');
      const lastBrace = contentText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = contentText.substring(firstBrace, lastBrace + 1);
        try {
          enrichedData = JSON.parse(sanitizeJSON(jsonStr));
        } catch (e: any) {
          console.error(`Extracted JSON parse failed: ${e.message}`);
          console.error(`JSON snippet around error: ${jsonStr.substring(Math.max(0, parseInt(e.message.match(/\d+/)?.[0] || '0') - 50), Math.min(jsonStr.length, parseInt(e.message.match(/\d+/)?.[0] || '0') + 50))}`);
          throw new Error(`Failed to parse extracted JSON: ${e.message}`);
        }
      } else {
        throw new Error('Failed to parse JSON from Bedrock response - no valid JSON structure found');
      }
    }
  }

  // Validate structure
  const validation = validateEnrichedContent(enrichedData);
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
