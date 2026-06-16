/* eslint-disable */
// @ts-nocheck
export {};
"use strict";
/**
 * Bedrock Converse API client with Tool Use
 * This replaces the old InvokeModel API with JSON Prefilling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEnrichedContentWithToolUse = generateEnrichedContentWithToolUse;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const aws_xray_sdk_core_1 = __importDefault(require("aws-xray-sdk-core"));
const config_1 = require("./config");
const prompts_1 = require("./prompts");
const retry_1 = require("./retry");
const toolSchema_1 = require("./toolSchema");
// Initialize Bedrock client
const baseClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: config_1.config.region });
// Capture with X-Ray if enabled
const client = config_1.config.xrayEnabled ? aws_xray_sdk_core_1.default.captureAWSv3Client(baseClient) : baseClient;
/**
 * Call Bedrock Converse API to generate enriched content using Tool Use
 */
async function generateEnrichedContentWithToolUse(supplementId, category = 'general', studies, benefitQuery) {
    const startTime = Date.now();
    // Build prompt with optional studies and benefitQuery
    const prompt = (0, prompts_1.buildEnrichmentPrompt)(supplementId, category, studies, benefitQuery);
    console.log(JSON.stringify({
        operation: 'BuildPromptToolUse',
        supplementId,
        studiesProvided: studies?.length || 0,
        hasRealData: studies && studies.length > 0,
        apiVersion: 'Converse',
    }));
    // Prepare Converse API request with Tool Use
    // IMPORTANT: toolChoice forces Claude to use the tool instead of generating text
    const converseRequest = {
        modelId: config_1.config.modelId,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        toolConfig: {
            ...toolSchema_1.ENRICHED_CONTENT_TOOL_CONFIG,
            toolChoice: {
                tool: {
                    name: 'generate_enriched_content',
                },
            },
        },
        inferenceConfig: {
            maxTokens: config_1.config.maxTokens,
            temperature: config_1.config.temperature,
        },
    };
    console.log(JSON.stringify({
        operation: 'ConverseAPICall',
        supplementId,
        modelId: config_1.config.modelId,
        maxTokens: config_1.config.maxTokens,
        temperature: config_1.config.temperature,
        toolsProvided: toolSchema_1.ENRICHED_CONTENT_TOOL_CONFIG.tools?.length || 0,
    }));
    // Call Bedrock Converse API with automatic retry on transient errors
    const response = await (0, retry_1.retryWithBackoff)(async () => {
        return await client.send(new client_bedrock_runtime_1.ConverseCommand(converseRequest));
    }, `generateEnrichedContent-${supplementId}`);
    const duration = Date.now() - startTime;
    // Parse response
    const converseResponse = response;
    // Calculate token usage metrics
    const tokensUsed = converseResponse.usage.inputTokens + converseResponse.usage.outputTokens;
    const percentageUsed = (converseResponse.usage.outputTokens / config_1.config.maxTokens) * 100;
    console.log(JSON.stringify({
        operation: 'ConverseAPIResponse',
        supplementId,
        duration,
        tokensUsed,
        inputTokens: converseResponse.usage.inputTokens,
        outputTokens: converseResponse.usage.outputTokens,
        stopReason: converseResponse.stopReason,
        maxTokensConfig: config_1.config.maxTokens,
        percentageUsed: percentageUsed.toFixed(1),
    }));
    // Extract tool use before classifying stop_reason. Bedrock can report max_tokens
    // even when Claude already emitted a complete tool_use block.
    const toolUseBlock = converseResponse.output.message.content.find((block) => block.toolUse);
    const hasToolUseBlock = !!toolUseBlock?.toolUse;
    // Alert if approaching token limit
    if (percentageUsed > 90) {
        const logLevel = hasToolUseBlock ? console.log : console.warn;
        logLevel(JSON.stringify({
            event: hasToolUseBlock ? 'TOKEN_LIMIT_HIGH_WITH_TOOL_USE' : 'NEAR_TOKEN_LIMIT',
            supplementId,
            outputTokens: converseResponse.usage.outputTokens,
            maxTokens: config_1.config.maxTokens,
            percentageUsed: percentageUsed.toFixed(1),
            stopReason: converseResponse.stopReason,
            recommendation: 'Consider increasing max_tokens or simplifying prompt',
        }));
    }
    // Alert on unexpected stop_reason
    if (converseResponse.stopReason &&
        converseResponse.stopReason !== 'end_turn' &&
        converseResponse.stopReason !== 'tool_use') {
        const logLevel = hasToolUseBlock ? console.log : console.error;
        logLevel(JSON.stringify({
            event: hasToolUseBlock ? 'STOP_REASON_WITH_TOOL_USE' : 'UNEXPECTED_STOP_REASON',
            supplementId,
            stopReason: converseResponse.stopReason,
            expectedReasons: ['end_turn', 'tool_use'],
            outputTokens: converseResponse.usage.outputTokens,
            maxTokens: config_1.config.maxTokens,
            percentageUsed: percentageUsed.toFixed(1),
            hasToolUseBlock,
        }));
    }
    // Extract tool use from response
    if (!toolUseBlock || !toolUseBlock.toolUse) {
        // If no tool use, check for text response (fallback)
        const textBlock = converseResponse.output.message.content.find((block) => block.text);
        console.error(JSON.stringify({
            event: 'NO_TOOL_USE_IN_RESPONSE',
            supplementId,
            stopReason: converseResponse.stopReason,
            hasTextBlock: !!textBlock,
            textPreview: textBlock?.text?.substring(0, 200),
        }));
        throw new Error(`Expected tool use in response but got stop_reason: ${converseResponse.stopReason}. ` +
            `This indicates the model did not use the generate_enriched_content tool.`);
    }
    // Extract EnrichedContent from tool use input
    const enrichedData = toolUseBlock.toolUse.input;
    console.log(JSON.stringify({
        event: 'TOOL_USE_EXTRACTED',
        supplementId,
        toolName: toolUseBlock.toolUse.name,
        toolUseId: toolUseBlock.toolUse.toolUseId,
        hasData: !!enrichedData,
        dataFields: Object.keys(enrichedData || {}).length,
    }));
    // Validate structure
    const validation = (0, prompts_1.validateEnrichedContent)(enrichedData);
    if (!validation.valid) {
        console.error(JSON.stringify({
            event: 'VALIDATION_FAILED',
            supplementId,
            validationErrors: validation.errors,
        }));
        throw new Error(`Invalid enriched content structure: ${validation.errors.join(', ')}`);
    }
    // CRITICAL SAFETY STEP: Sanitize dosage data to remove unsupported claims
    if (enrichedData.dosage) {
        const originalDosage = JSON.stringify(enrichedData.dosage);
        enrichedData.dosage = (0, prompts_1.sanitizeDosageWithPMIDValidation)(enrichedData.dosage);
        const sanitizedDosage = JSON.stringify(enrichedData.dosage);
        if (originalDosage !== sanitizedDosage) {
            console.warn(JSON.stringify({
                event: 'DOSAGE_SANITIZED',
                supplementId,
                message: 'Removed unverified dosage claims without PMID support',
                hadSourcePMIDs: !!enrichedData.dosage.sourcePMIDs,
            }));
        }
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
