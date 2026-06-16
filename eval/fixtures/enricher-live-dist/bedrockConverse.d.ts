/**
 * Bedrock Converse API client with Tool Use
 * This replaces the old InvokeModel API with JSON Prefilling
 */
import { EnrichedContent, PubMedStudy } from './types';
/**
 * Call Bedrock Converse API to generate enriched content using Tool Use
 */
export declare function generateEnrichedContentWithToolUse(supplementId: string, category?: string, studies?: PubMedStudy[], benefitQuery?: string): Promise<{
    content: EnrichedContent;
    metadata: {
        tokensUsed: number;
        duration: number;
        studiesProvided: number;
    };
}>;
//# sourceMappingURL=bedrockConverse.d.ts.map