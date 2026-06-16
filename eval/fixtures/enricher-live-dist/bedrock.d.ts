/**
 * Bedrock client for calling Claude
 */
import { EnrichedContent, ExamineStyleContent, PubMedStudy } from './types';
/**
 * Call Bedrock to generate enriched content
 */
export declare function generateEnrichedContent(supplementId: string, category?: string, studies?: PubMedStudy[], contentType?: 'standard' | 'examine-style', benefitQuery?: string): Promise<{
    content: EnrichedContent | ExamineStyleContent;
    metadata: {
        tokensUsed: number;
        duration: number;
        studiesProvided: number;
    };
}>;
//# sourceMappingURL=bedrock.d.ts.map