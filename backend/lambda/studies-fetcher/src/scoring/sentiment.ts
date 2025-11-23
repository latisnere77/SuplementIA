/**
 * Sentiment Analysis Module
 * Uses Claude Haiku to classify study outcomes
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Study } from '../types';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export interface StudySentiment {
  pmid: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
}

/**
 * Analyze sentiment of a single study
 */
export async function analyzeSentiment(
  study: Study,
  supplementName: string
): Promise<StudySentiment> {
  try {
    const prompt = buildPrompt(study, supplementName);
    const response = await invokeHaiku(prompt);
    const parsed = parseResponse(response);

    console.log(JSON.stringify({
      event: 'SENTIMENT_ANALYZED',
      pmid: study.pmid,
      sentiment: parsed.sentiment,
      confidence: parsed.confidence,
      timestamp: new Date().toISOString(),
    }));

    return {
      pmid: study.pmid,
      ...parsed,
    };
  } catch (error) {
    console.error(JSON.stringify({
      event: 'SENTIMENT_ERROR',
      pmid: study.pmid,
      error: error instanceof Error ? error.message : 'Unknown',
      timestamp: new Date().toISOString(),
    }));

    return {
      pmid: study.pmid,
      sentiment: 'neutral',
      confidence: 0.3,
      reasoning: 'Analysis failed',
    };
  }
}

/**
 * Analyze batch of studies with concurrency control
 */
export async function analyzeBatch(
  studies: Study[],
  supplementName: string,
  maxConcurrent: number = 5
): Promise<StudySentiment[]> {
  const results: StudySentiment[] = [];

  for (let i = 0; i < studies.length; i += maxConcurrent) {
    const batch = studies.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(study => analyzeSentiment(study, supplementName))
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
 * Build prompt for Claude
 */
function buildPrompt(study: Study, supplementName: string): string {
  const abstract = study.abstract
    ? study.abstract.substring(0, 800)
    : 'No abstract available';

  return `Analyze this study about "${supplementName}":

Title: ${study.title}
Abstract: ${abstract}

Classify as:
- POSITIVE: Shows significant benefits or positive effects
- NEGATIVE: Shows no benefits, ineffective, or adverse effects
- NEUTRAL: Mixed/inconclusive results or methodology-focused

Respond with valid JSON only:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
}

/**
 * Invoke Claude Haiku
 */
async function invokeHaiku(prompt: string): Promise<string> {
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 200,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await bedrockClient.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text.trim();
}

/**
 * Parse Claude response
 */
function parseResponse(text: string): {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
} {
  try {
    // Remove markdown if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleaned);
    const sentiment = parsed.sentiment?.toLowerCase();

    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      throw new Error('Invalid sentiment');
    }

    const confidence = parseFloat(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Invalid confidence');
    }

    return {
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      confidence,
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    // Fallback: detect from text
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
 * Get sentiment distribution
 */
export function getSentimentDistribution(sentiments: StudySentiment[]): {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
} {
  return {
    positive: sentiments.filter(s => s.sentiment === 'positive').length,
    negative: sentiments.filter(s => s.sentiment === 'negative').length,
    neutral: sentiments.filter(s => s.sentiment === 'neutral').length,
    total: sentiments.length,
  };
}
