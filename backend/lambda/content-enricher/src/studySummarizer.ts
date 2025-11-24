/**
 * Study Summarizer Service
 * 
 * Reduces study content by 60% while maintaining key information
 * Uses Claude Haiku for fast, cost-effective summarization
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from './config';

const bedrockClient = new BedrockRuntimeClient({
  region: config.region,
});

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
 * Summarize a single study to 2-3 sentences
 * Focuses on: main findings, sample size, key results
 */
async function summarizeSingleStudy(study: Study): Promise<StudySummary> {
  const prompt = `Summarize this scientific study in 2-3 concise sentences.
Focus on: main findings, sample size, and key results.

Title: ${study.title}
${study.abstract ? `Abstract: ${study.abstract.substring(0, 500)}...` : ''}
${study.findings ? `Findings: ${study.findings}` : ''}
${study.sampleSize ? `Sample Size: ${study.sampleSize}` : ''}

Summary:`;

  try {
    const command = new InvokeModelCommand({
      modelId: config.modelId, // Use Haiku for speed
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 150, // Short summary
        temperature: 0, // Deterministic
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const summary = responseBody.content[0].text.trim();

    console.log(JSON.stringify({
      event: 'STUDY_SUMMARIZED',
      pmid: study.pmid,
      originalLength: (study.abstract?.length || 0) + (study.findings?.length || 0),
      summaryLength: summary.length,
      reduction: Math.round((1 - summary.length / ((study.abstract?.length || 0) + (study.findings?.length || 0))) * 100),
      timestamp: new Date().toISOString(),
    }));

    return {
      pmid: study.pmid,
      title: study.title,
      summary,
      studyType: study.studyType,
      year: study.year,
    };
  } catch (error) {
    console.error(JSON.stringify({
      event: 'STUDY_SUMMARIZATION_ERROR',
      pmid: study.pmid,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));

    // Fallback: use title + first sentence of abstract
    const fallbackSummary = study.abstract 
      ? `${study.title}. ${study.abstract.split('.')[0]}.`
      : study.title;

    return {
      pmid: study.pmid,
      title: study.title,
      summary: fallbackSummary,
      studyType: study.studyType,
      year: study.year,
    };
  }
}

/**
 * Summarize multiple studies in parallel
 * Reduces total token count by ~60%
 */
export async function summarizeStudies(studies: Study[]): Promise<StudySummary[]> {
  const startTime = Date.now();

  console.log(JSON.stringify({
    event: 'STUDY_SUMMARIZATION_START',
    studiesCount: studies.length,
    timestamp: new Date().toISOString(),
  }));

  try {
    // Summarize all studies in parallel
    const summaries = await Promise.all(
      studies.map(study => summarizeSingleStudy(study))
    );

    const duration = Date.now() - startTime;

    // Calculate token reduction
    const originalTokens = studies.reduce((sum, s) => 
      sum + (s.abstract?.length || 0) + (s.findings?.length || 0), 0
    ) / 4; // Rough estimate: 1 token ≈ 4 chars

    const summaryTokens = summaries.reduce((sum, s) => 
      sum + s.summary.length, 0
    ) / 4;

    const reduction = Math.round((1 - summaryTokens / originalTokens) * 100);

    console.log(JSON.stringify({
      event: 'STUDY_SUMMARIZATION_COMPLETE',
      studiesCount: studies.length,
      duration,
      originalTokens: Math.round(originalTokens),
      summaryTokens: Math.round(summaryTokens),
      reduction: `${reduction}%`,
      timestamp: new Date().toISOString(),
    }));

    return summaries;
  } catch (error) {
    console.error(JSON.stringify({
      event: 'STUDY_SUMMARIZATION_FAILED',
      studiesCount: studies.length,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));

    // Fallback: return studies with title only
    return studies.map(study => ({
      pmid: study.pmid,
      title: study.title,
      summary: study.title,
      studyType: study.studyType,
      year: study.year,
    }));
  }
}

/**
 * Format summaries for content generation prompt
 */
export function formatSummariesForPrompt(summaries: StudySummary[]): string {
  return summaries.map((s, i) => 
    `Study ${i + 1} (PMID: ${s.pmid}, ${s.year || 'N/A'}):
${s.summary}`
  ).join('\n\n');
}
