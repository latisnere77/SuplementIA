"use strict";
/**
 * Content Enricher Lambda Handler
 *
 * Generates enriched supplement content using AWS Bedrock (Claude)
 * Integrates with Cache Service for performance
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const aws_xray_sdk_core_1 = __importDefault(require("aws-xray-sdk-core"));
const config_1 = require("./config");
const bedrock_1 = require("./bedrock");
const bedrockConverse_1 = require("./bedrockConverse");
const cache_1 = require("./cache");
const job_store_1 = require("./job-store");
const synergies_1 = require("./synergies");
// Feature flag to enable Tool Use API (will be controlled via environment variable)
const USE_TOOL_API = process.env.USE_TOOL_API === 'true';
/**
 * Main Lambda handler
 */
async function handler(event, context) {
    // Get X-Ray segment
    const segment = config_1.config.xrayEnabled ? aws_xray_sdk_core_1.default.getSegment() : null;
    const subsegment = segment?.addNewSubsegment?.('content-enricher');
    const requestId = context.awsRequestId;
    const startTime = Date.now();
    const correlationId = event.headers?.['X-Request-ID'] ||
        event.headers?.['x-request-id'] ||
        requestId;
    try {
        // Parse request
        let request;
        if (event.httpMethod === 'GET' && event.queryStringParameters) {
            // GET with query params
            request = {
                supplementId: event.queryStringParameters.supplementId || '',
                category: event.queryStringParameters.category,
                forceRefresh: event.queryStringParameters.forceRefresh === 'true',
            };
        }
        else if (event.body) {
            // POST with body
            request = JSON.parse(event.body);
        }
        else {
            return createErrorResponse(400, 'Missing request body or query parameters', requestId);
        }
        const { supplementId, category, forceRefresh, studies, ranking, contentType = 'standard', benefitQuery, jobId } = request;
        // CRITICAL DEBUG: Log what we received for ranking
        console.log(JSON.stringify({
            event: 'RANKING_DEBUG',
            requestId,
            hasRanking: !!ranking,
            rankingType: ranking ? typeof ranking : 'undefined',
            rankingKeys: ranking && typeof ranking === 'object' ? Object.keys(ranking) : 'N/A',
            rankingPositiveCount: ranking?.positive?.length || 0,
            rankingNegativeCount: ranking?.negative?.length || 0,
            timestamp: new Date().toISOString(),
        }));
        // Validate supplementId
        if (!supplementId || supplementId.trim().length === 0) {
            return createErrorResponse(400, 'supplementId is required', requestId);
        }
        // Extract study metadata
        const studiesCount = studies?.length || 0;
        const studyTypes = studies?.map((s) => s.studyType || 'unknown') || [];
        const studyIds = studies?.map((s) => s.pmid).filter(Boolean) || [];
        const uniqueStudyTypes = [...new Set(studyTypes)];
        // Add X-Ray annotations
        if (subsegment) {
            subsegment.addAnnotation('supplementId', supplementId);
            subsegment.addAnnotation('module', 'content-enricher');
            subsegment.addAnnotation('version', '1.0.0');
            subsegment.addAnnotation('correlationId', correlationId);
            subsegment.addAnnotation('forceRefresh', forceRefresh || false);
            subsegment.addAnnotation('studiesProvided', studiesCount);
            subsegment.addAnnotation('hasRealData', studiesCount > 0);
            subsegment.addAnnotation('hasBenefitQuery', !!benefitQuery);
            subsegment.addMetadata('studies', {
                count: studiesCount,
                studyTypes: uniqueStudyTypes,
                sampleIds: studyIds.slice(0, 10), // First 10 IDs for reference
                hasStudies: studiesCount > 0,
            });
            subsegment.addMetadata('request', {
                supplementId,
                category: category || 'general',
                forceRefresh: forceRefresh || false,
            });
        }
        // Log request
        console.log(JSON.stringify({
            event: 'CONTENT_ENRICH_REQUEST',
            requestId,
            correlationId,
            supplementId,
            category: category || 'general',
            contentType: contentType || 'standard',
            forceRefresh: forceRefresh || false,
            studiesProvided: studiesCount,
            hasRealData: studiesCount > 0,
            studyTypes: uniqueStudyTypes,
            timestamp: new Date().toISOString(),
        }));
        // Try cache first (unless forceRefresh)
        let enrichedContent;
        let cachedRanking;
        if (!forceRefresh) {
            const cached = await (0, cache_1.getFromCache)(supplementId);
            if (cached) {
                enrichedContent = cached.data;
                cachedRanking = cached.metadata?.studies?.ranked;
                if (subsegment) {
                    subsegment.addAnnotation('cacheHit', true);
                    subsegment.addAnnotation('hasCachedRanking', !!cachedRanking);
                }
                // Fetch synergies for cached content (synergies are NOT cached, always fresh from external DB)
                let cachedSynergies = [];
                let cachedSynergiesSource = 'claude_fallback';
                try {
                    const externalSynergies = await (0, synergies_1.getSynergiesForSupplement)(supplementId);
                    if (externalSynergies.length > 0) {
                        cachedSynergies = externalSynergies;
                        cachedSynergiesSource = 'external_db';
                    }
                    else {
                        // Fallback to Claude's stacksWith if no external synergies found
                        const standardContent = enrichedContent;
                        cachedSynergies = (0, synergies_1.transformStacksWithFallback)(standardContent.dosage?.stacksWith);
                        cachedSynergiesSource = 'claude_fallback';
                    }
                }
                catch (synergiesError) {
                    console.error(JSON.stringify({
                        event: 'SYNERGIES_FETCH_ERROR_CACHE_PATH',
                        requestId,
                        supplementId,
                        error: synergiesError instanceof Error ? synergiesError.message : 'Unknown error',
                        timestamp: new Date().toISOString(),
                    }));
                }
                // Add synergies to cached content
                const contentWithSynergies = enrichedContent;
                contentWithSynergies.synergies = cachedSynergies;
                contentWithSynergies.synergiesSource = cachedSynergiesSource;
                const duration = Date.now() - startTime;
                console.log(JSON.stringify({
                    event: 'CACHE_HIT',
                    requestId,
                    correlationId,
                    supplementId,
                    duration,
                    studiesProvided: studiesCount,
                    hasCachedRanking: !!cachedRanking,
                    cachedRankingPositive: cachedRanking?.positive?.length || 0,
                    cachedRankingNegative: cachedRanking?.negative?.length || 0,
                    synergiesCount: cachedSynergies.length,
                    synergiesSource: cachedSynergiesSource,
                    timestamp: new Date().toISOString(),
                }));
                // Use cached ranking if available, otherwise fall back to provided ranking
                const finalRanking = cachedRanking || ranking;
                const response = {
                    success: true,
                    data: enrichedContent,
                    metadata: {
                        supplementId,
                        generatedAt: new Date().toISOString(),
                        cached: true,
                        hasRealData: studiesCount > 0,
                        studiesUsed: studiesCount,
                        requestId,
                        correlationId,
                    },
                    // Preserve ranking data from cache OR LanceDB if provided
                    ...(finalRanking && {
                        evidence_summary: {
                            studies: {
                                ranked: finalRanking,
                            },
                        },
                    }),
                    // Add synergies at top level for frontend
                    ...(cachedSynergies.length > 0 && {
                        synergies: cachedSynergies,
                        synergiesSource: cachedSynergiesSource,
                    }),
                };
                // Update job store if jobId provided (cache hit path)
                if (jobId) {
                    await (0, job_store_1.updateJobWithResult)(jobId, 'completed', {
                        recommendation: response, // Now includes synergies!
                    });
                }
                if (subsegment) {
                    subsegment.addAnnotation('success', true);
                    subsegment.addMetadata('response', {
                        cached: true,
                        hasRealData: studiesCount > 0,
                        studiesUsed: studiesCount,
                    });
                    subsegment.close();
                }
                return {
                    statusCode: 200,
                    headers: config_1.CORS_HEADERS,
                    body: JSON.stringify(response),
                };
            }
        }
        if (subsegment) {
            subsegment.addAnnotation('cacheHit', false);
        }
        // Cache miss or forceRefresh - call Bedrock
        console.log(JSON.stringify({
            event: 'GENERATING_CONTENT',
            requestId,
            correlationId,
            supplementId,
            reason: forceRefresh ? 'force_refresh' : 'cache_miss',
            studiesProvided: studiesCount,
            studyTypes: uniqueStudyTypes,
            useToolAPI: USE_TOOL_API,
            timestamp: new Date().toISOString(),
        }));
        // OPTIMIZATION: Summarize studies first to reduce tokens by 60%
        let processedStudies = studies;
        if (studies && studies.length > 0) {
            try {
                const { summarizeStudies } = await Promise.resolve().then(() => __importStar(require('./studySummarizer')));
                const summaries = await summarizeStudies(studies);
                // Convert summaries back to study format for compatibility
                processedStudies = summaries.map(s => ({
                    ...studies.find(study => study.pmid === s.pmid),
                    abstract: s.summary, // Replace long abstract with short summary
                    findings: undefined, // Remove findings to save tokens
                }));
                console.log(JSON.stringify({
                    event: 'STUDIES_SUMMARIZED',
                    requestId,
                    correlationId,
                    originalStudies: studies.length,
                    summarizedStudies: processedStudies?.length || 0,
                    timestamp: new Date().toISOString(),
                }));
            }
            catch (error) {
                console.error(JSON.stringify({
                    event: 'STUDIES_SUMMARIZATION_FAILED',
                    requestId,
                    correlationId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    fallback: 'using_original_studies',
                    timestamp: new Date().toISOString(),
                }));
                // Fallback: use original studies
                processedStudies = studies;
            }
        }
        // Choose API based on feature flag
        const { content, metadata: bedrockMetadata } = USE_TOOL_API
            ? await (0, bedrockConverse_1.generateEnrichedContentWithToolUse)(supplementId, category || 'general', processedStudies, // Pass summarized studies to Claude
            benefitQuery // Pass benefitQuery for focused analysis
            )
            : await (0, bedrock_1.generateEnrichedContent)(supplementId, category || 'general', studies, // Pass real PubMed studies to Claude
            contentType, // Pass content type for format selection
            benefitQuery // Pass benefitQuery for focused analysis
            );
        enrichedContent = content;
        // Fetch synergies from external database (only if not provided in request)
        let localSynergies = [];
        let localSynergiesSource = 'claude_fallback';
        // Fetch synergies from external DynamoDB (cross-account)
        try {
            const externalSynergies = await (0, synergies_1.getSynergiesForSupplement)(supplementId);
            if (externalSynergies.length > 0) {
                localSynergies = externalSynergies;
                localSynergiesSource = 'external_db';
            }
            else {
                // Fallback to Claude's stacksWith if no external synergies found
                const standardContent = enrichedContent;
                localSynergies = (0, synergies_1.transformStacksWithFallback)(standardContent.dosage?.stacksWith);
                localSynergiesSource = 'claude_fallback';
            }
            console.log(JSON.stringify({
                event: 'SYNERGIES_FETCHED',
                requestId,
                supplementId,
                synergiesCount: localSynergies.length,
                source: localSynergiesSource,
                positiveCount: localSynergies.filter((s) => s.direction === 'positive').length,
                negativeCount: localSynergies.filter((s) => s.direction === 'negative').length,
                timestamp: new Date().toISOString(),
            }));
        }
        catch (synergiesError) {
            console.error(JSON.stringify({
                event: 'SYNERGIES_FETCH_ERROR',
                requestId,
                supplementId,
                error: synergiesError instanceof Error ? synergiesError.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }));
            // Continue without synergies on error
        }
        // Add synergies to enriched content
        const contentWithSynergies = enrichedContent;
        contentWithSynergies.synergies = localSynergies;
        contentWithSynergies.synergiesSource = localSynergiesSource;
        // Save to cache with ranking metadata (await to ensure it completes before Lambda freezes)
        try {
            const cacheMetadata = {
                supplementId,
                generatedAt: new Date().toISOString(),
                contentType: contentType,
                hasRealData: !!studies && studies.length > 0,
                studiesUsed: studies?.length || 0,
                ...(ranking ? {
                    studies: {
                        ranked: ranking,
                        all: studies || [],
                        total: studies?.length || 0,
                    },
                } : {}),
            };
            await (0, cache_1.saveToCacheAsync)(supplementId, enrichedContent, cacheMetadata);
        }
        catch (err) {
            console.error('Failed to save to cache (non-fatal):', err);
        }
        const duration = Date.now() - startTime;
        // Log success (handle both content types)
        const logData = {
            event: 'CONTENT_ENRICH_SUCCESS',
            requestId,
            correlationId,
            supplementId,
            contentType,
            duration,
            bedrockDuration: bedrockMetadata.duration,
            tokensUsed: bedrockMetadata.tokensUsed,
            studiesUsed: studiesCount,
            hasRealData: studiesCount > 0,
            timestamp: new Date().toISOString(),
        };
        // Add format-specific metrics
        if (contentType === 'examine-style') {
            const examineContent = enrichedContent;
            logData.benefitsCount = examineContent.benefitsByCondition?.length || 0;
            logData.mechanismsCount = examineContent.mechanisms?.length || 0;
        }
        else {
            const standardContent = enrichedContent;
            logData.mechanismsCount = standardContent.mechanisms?.length || 0;
            logData.worksForCount = standardContent.worksFor?.length || 0;
        }
        console.log(JSON.stringify(logData));
        // Add metadata to X-Ray
        if (subsegment) {
            subsegment.addAnnotation('success', true);
            subsegment.addAnnotation('studiesUsed', studiesCount);
            subsegment.addAnnotation('contentType', contentType);
            subsegment.addMetadata('bedrock', {
                duration: bedrockMetadata.duration,
                tokensUsed: bedrockMetadata.tokensUsed,
            });
            subsegment.addMetadata('response', {
                duration,
                contentType,
                hasRealData: studiesCount > 0,
                studiesUsed: studiesCount,
            });
            subsegment.close();
        }
        const response = {
            success: true,
            data: enrichedContent,
            metadata: {
                supplementId,
                generatedAt: new Date().toISOString(),
                bedrockDuration: bedrockMetadata.duration,
                tokensUsed: bedrockMetadata.tokensUsed,
                cached: false,
                hasRealData: studiesCount > 0,
                studiesUsed: studiesCount,
                requestId,
                correlationId,
            },
            // Preserve ranking data from LanceDB if provided
            ...(ranking && {
                evidence_summary: {
                    studies: {
                        ranked: ranking,
                    },
                },
            }),
            // Add synergies at top level for frontend
            ...(localSynergies.length > 0 && {
                synergies: localSynergies,
                synergiesSource: localSynergiesSource,
            }),
        };
        // Update job store if jobId provided (async enrichment)
        if (jobId) {
            await (0, job_store_1.updateJobWithResult)(jobId, 'completed', {
                recommendation: response, // Store the full enrichment response (now includes synergies!)
            });
        }
        return {
            statusCode: 200,
            headers: config_1.CORS_HEADERS,
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        // Extract error details
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        // Extract jobId from request for error handling
        let jobId;
        let supplementId = 'unknown';
        try {
            if (event.body) {
                const parsedBody = JSON.parse(event.body);
                jobId = parsedBody.jobId;
                supplementId = parsedBody.supplementId || 'unknown';
            }
        }
        catch {
            // Ignore parsing errors
        }
        // Log error
        console.error(JSON.stringify({
            event: 'CONTENT_ENRICH_ERROR',
            requestId,
            correlationId,
            supplementId,
            jobId,
            error: errorMessage,
            stack: errorStack,
            duration,
            timestamp: new Date().toISOString(),
        }));
        // Create error object for X-Ray
        const errorObj = error instanceof Error ? error : new Error(errorMessage);
        // Update job store with failed status if jobId provided
        if (jobId) {
            await (0, job_store_1.updateJobWithResult)(jobId, 'failed', {
                error: `Enrichment failed: ${errorMessage}`,
            });
        }
        // Add error to X-Ray
        if (subsegment) {
            subsegment.addAnnotation('success', false);
            subsegment.addAnnotation('error', errorMessage);
            subsegment.addError(errorObj);
            subsegment.close();
        }
        return createErrorResponse(500, 'Failed to generate enriched content', requestId, errorMessage);
    }
}
/**
 * Create error response
 */
function createErrorResponse(statusCode, error, requestId, details) {
    const response = {
        success: false,
        error,
        message: details,
    };
    return {
        statusCode,
        headers: config_1.CORS_HEADERS,
        body: JSON.stringify({
            ...response,
            requestId,
        }),
    };
}
//# sourceMappingURL=index.js.map