/**
 * Study Sentiment Analyzer
 * Uses Claude Haiku to classify studies as positive/negative/neutral
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Study } from './types';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export interface StudySentiment {
  pmid: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Analyze sentiment of a single study
 */
export async function analyzeStudySentiment(
  study: Study,
  supplementName: string
): Promise<StudySentiment> {
  const prompt = buildSentimentPrompt(study, supplementName);

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
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
    const text = responseBody.content[0].text.trim();

    // Parse JSON response
    const result = parseJsonResponse(text);

    console.log(JSON.stringify({
      event: 'SENTIMENT_ANALYZED',
      pmid: study.pmid,
      sentiment: result.sentiment,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    }));

    return {
      pmid: study.pmid,
      ...result,
    };
  } catch (error) {
    console.error(JSON.stringify({
      event: 'SENTIMENT_ANALYSIS_ERROR',
      pmid: study.pmid,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));

    // Fallback: neutral with low confidence
    return {
      pmid: study.pmid,
      sentiment: 'neutral',
      confidence: 0.3,
      reasoning: 'Analysis failed, defaulting to neutral',
    };
  }
}

/**
 * Analyze sentiment for multiple studies in parallel
 */
export async function analyzeBatchSentiment(
  studies: Study[],
  supplementName: string,
  maxConcurrent: number = 5
): Promise<StudySentiment[]> {
  const results: StudySentiment[] = [];

  // Process in batches to avoid overwhelming Bedrock
  for (let i = 0; i < studies.length; i += maxConcurrent) {
    const batch = studies.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(study => analyzeStudySentiment(study, supplementName))
    );
    results.push(...batchResults);

    console.log(JSON.stringify({
      event: 'SENTIMENT_BATCH_COMPLETE',
      processed: results.length,
      total: studies.length,
      timestamp: new Date().toISOString(),
    }));
  }

  return results;
}

/**
 * Build prompt for sentiment analysis
 */
function buildSentimentPrompt(study: Study, supplementName: string): string {
  // Truncate abstract if too long (save tokens)
  const abstract = study.abstract 
    ? study.abstract.substring(0, 800) 
    : 'No abstract available';

  return `Analyze this scientific study about "${supplementName}" and classify its findings.

Title: ${study.title}

Abstract: ${abstract}

Classify as:
- POSITIVE: The supplement showed significant benefits or positive effects
- NEGATIVE: The supplement showed no benefits, was ineffective, or had adverse effects
- NEUTRAL: Mixed results, inconclusive, or methodology-focused (no clear outcome)

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation in 1 sentence"
}`;
}

/**
 * Parse JSON response from Claude
 */
function parseJsonResponse(text: string): {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
} {
  try {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleaned);

    // Validate sentiment
    const sentiment = parsed.sentiment?.toLowerCase();
    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      throw new Error('Invalid sentiment value');
    }

    // Validate confidence
    const confidence = parseFloat(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Invalid confidence value');
    }

    return {
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      confidence,
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('Failed to parse sentiment response:', text);
    // Fallback: try to detect sentiment from text
    const lower = text.toLowerCase();
    if (lower.includes('positive')) {
      return { sentiment: 'positive', confidence: 0.5, reasoning: 'Parsed from text' };
    }
    if (lower.includes('negative')) {
      return { sentiment: 'negative', confidence: 0.5, reasoning: 'Parsed from text' };
    }
    return { sentiment: 'neutral', confidence: 0.3, reasoning: 'Parse failed' };
  }
}

/**
 * Calculate sentiment distribution
 */
export function getSentimentDistribution(sentiments: StudySentiment[]): {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
} {
  const distribution = {
    positive: 0,
    negative: 0,
    neutral: 0,
    total: sentiments.length,
  };

  for (const s of sentiments) {
    distribution[s.sentiment]++;
  }

  return distribution;
}
