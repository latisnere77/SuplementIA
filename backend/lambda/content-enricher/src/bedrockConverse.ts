/**
 * Bedrock Converse API client with Tool Use
 * This replaces the old InvokeModel API with JSON Prefilling
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { ConverseResponse, EnrichedContent, PubMedStudy } from './types';
import { buildEnrichmentPrompt, validateEnrichedContent } from './prompts';
import { retryWithBackoff } from './retry';
import { ENRICHED_CONTENT_TOOL_CONFIG } from './toolSchema';

// Initialize Bedrock client
const baseClient = new BedrockRuntimeClient({ region: config.region });

// Capture with X-Ray if enabled
const client = config.xrayEnabled ? AWSXRay.captureAWSv3Client(baseClient) : baseClient;

/**
 * Call Bedrock Converse API to generate enriched content using Tool Use
 */
export async function generateEnrichedContentWithToolUse(
  supplementId: string,
  category: string = 'general',
  studies?: PubMedStudy[],
  benefitQuery?: string
): Promise<{
  content: EnrichedContent;
  metadata: {
    tokensUsed: number;
    duration: number;
    studiesProvided: number;
  };
}> {
  const startTime = Date.now();

  // Build prompt with optional studies and benefitQuery
  const prompt = buildEnrichmentPrompt(supplementId, category, studies, benefitQuery);

  console.log(
    JSON.stringify({
      operation: 'BuildPromptToolUse',
      supplementId,
      studiesProvided: studies?.length || 0,
      hasRealData: studies && studies.length > 0,
      apiVersion: 'Converse',
    })
  );

  // Prepare Converse API request with Tool Use
  // IMPORTANT: toolChoice forces Claude to use the tool instead of generating text
  const converseRequest = {
    modelId: config.modelId,
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            text: prompt,
          },
        ],
      },
    ],
    toolConfig: {
      ...ENRICHED_CONTENT_TOOL_CONFIG,
      toolChoice: {
        tool: {
          name: 'generate_enriched_content',
        },
      },
    },
    inferenceConfig: {
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    },
  };

  console.log(
    JSON.stringify({
      operation: 'ConverseAPICall',
      supplementId,
      modelId: config.modelId,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      toolsProvided: ENRICHED_CONTENT_TOOL_CONFIG.tools?.length || 0,
    })
  );

  // Call Bedrock Converse API with automatic retry on transient errors
  const response = await retryWithBackoff(
    async () => {
      return await client.send(new ConverseCommand(converseRequest));
    },
    `generateEnrichedContent-${supplementId}`
  );

  const duration = Date.now() - startTime;

  // Parse response
  const converseResponse = response as unknown as ConverseResponse;

  // Calculate token usage metrics
  const tokensUsed = converseResponse.usage.inputTokens + converseResponse.usage.outputTokens;
  const percentageUsed = (converseResponse.usage.outputTokens / config.maxTokens) * 100;

  console.log(
    JSON.stringify({
      operation: 'ConverseAPIResponse',
      supplementId,
      duration,
      tokensUsed,
      inputTokens: converseResponse.usage.inputTokens,
      outputTokens: converseResponse.usage.outputTokens,
      stopReason: converseResponse.stopReason,
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
        outputTokens: converseResponse.usage.outputTokens,
        maxTokens: config.maxTokens,
        percentageUsed: percentageUsed.toFixed(1),
        stopReason: converseResponse.stopReason,
        recommendation: 'Consider increasing max_tokens or simplifying prompt',
      })
    );
  }

  // Alert on unexpected stop_reason
  if (
    converseResponse.stopReason &&
    converseResponse.stopReason !== 'end_turn' &&
    converseResponse.stopReason !== 'tool_use'
  ) {
    console.error(
      JSON.stringify({
        event: 'UNEXPECTED_STOP_REASON',
        supplementId,
        stopReason: converseResponse.stopReason,
        expectedReasons: ['end_turn', 'tool_use'],
        outputTokens: converseResponse.usage.outputTokens,
        maxTokens: config.maxTokens,
        percentageUsed: percentageUsed.toFixed(1),
      })
    );
  }

  // Extract tool use from response
  const toolUseBlock = converseResponse.output.message.content.find((block) => block.toolUse);

  if (!toolUseBlock || !toolUseBlock.toolUse) {
    // If no tool use, check for text response (fallback)
    const textBlock = converseResponse.output.message.content.find((block) => block.text);

    console.error(
      JSON.stringify({
        event: 'NO_TOOL_USE_IN_RESPONSE',
        supplementId,
        stopReason: converseResponse.stopReason,
        hasTextBlock: !!textBlock,
        textPreview: textBlock?.text?.substring(0, 200),
      })
    );

    throw new Error(
      `Expected tool use in response but got stop_reason: ${converseResponse.stopReason}. ` +
        `This indicates the model did not use the generate_enriched_content tool.`
    );
  }

  // Extract EnrichedContent from tool use input
  const enrichedData = toolUseBlock.toolUse.input as EnrichedContent;

  console.log(
    JSON.stringify({
      event: 'TOOL_USE_EXTRACTED',
      supplementId,
      toolName: toolUseBlock.toolUse.name,
      toolUseId: toolUseBlock.toolUse.toolUseId,
      hasData: !!enrichedData,
      dataFields: Object.keys(enrichedData || {}).length,
    })
  );

  // Validate structure
  const validation = validateEnrichedContent(enrichedData);
  if (!validation.valid) {
    console.error(
      JSON.stringify({
        event: 'VALIDATION_FAILED',
        supplementId,
        validationErrors: validation.errors,
      })
    );
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
