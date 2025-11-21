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

  // Sanitize JSON by removing control characters
  const sanitizeJSON = (str: string): string => {
    // Remove control characters except for tab (\t), newline (\n), and carriage return (\r)
    // But only if they're NOT already properly escaped in the string
    return str.replace(/[\x00-\x1F\x7F]/g, (match) => {
      // Keep tab, newline, carriage return if they're part of JSON syntax
      if (match === '\t' || match === '\n' || match === '\r') {
        return ' '; // Replace with space to avoid breaking JSON
      }
      return ''; // Remove other control chars
    });
  };

  // Parse JSON from Claude's response
  let enrichedData: EnrichedContent;

  try {
    enrichedData = JSON.parse(sanitizeJSON(contentText));
  } catch (parseError) {
    // Sometimes Claude wraps JSON in markdown code blocks
    const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      enrichedData = JSON.parse(sanitizeJSON(jsonMatch[1]));
    } else {
      // Try to extract JSON between first { and last }
      const firstBrace = contentText.indexOf('{');
      const lastBrace = contentText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = contentText.substring(firstBrace, lastBrace + 1);
        enrichedData = JSON.parse(sanitizeJSON(jsonStr));
      } else {
        throw new Error('Failed to parse JSON from Bedrock response');
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
