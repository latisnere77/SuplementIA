/**
 * Study Summarizer Service
 *
 * Reduces study content by 60% while maintaining key information
 * Uses Claude Haiku for fast, cost-effective summarization
 */
export interface Study {
    pmid: string;
    title: string;
    abstract?: string;
    authors?: string[];
    journal?: string;
    year?: number;
    studyType?: string;
    sampleSize?: number;
    findings?: string;
}
export interface StudySummary {
    pmid: string;
    title: string;
    summary: string;
    studyType?: string;
    year?: number;
}
/**
 * Summarize multiple studies in parallel
 * Reduces total token count by ~60%
 */
export declare function summarizeStudies(studies: Study[]): Promise<StudySummary[]>;
/**
 * Format summaries for content generation prompt
 */
export declare function formatSummariesForPrompt(summaries: StudySummary[]): string;
//# sourceMappingURL=studySummarizer.d.ts.map