/**
 * Bedrock client for calling Claude
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { BedrockRequest, BedrockResponse, EnrichedContent } from './types';
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
  category: string = 'general'
): Promise<{
  content: EnrichedContent;
  metadata: {
    tokensUsed: number;
    duration: number;
  };
}> {
  const startTime = Date.now();

  // Build prompt
  const prompt = buildEnrichmentPrompt(supplementId, category);

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

  // Parse JSON from Claude's response
  let enrichedData: EnrichedContent;

  try {
    enrichedData = JSON.parse(contentText);
  } catch (parseError) {
    // Sometimes Claude wraps JSON in markdown code blocks
    const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      enrichedData = JSON.parse(jsonMatch[1]);
    } else {
      // Try to extract JSON between first { and last }
      const firstBrace = contentText.indexOf('{');
      const lastBrace = contentText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = contentText.substring(firstBrace, lastBrace + 1);
        enrichedData = JSON.parse(jsonStr);
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
    },
  };
}
