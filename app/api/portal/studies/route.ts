/**
 * Studies API Route - Uses the configured studies service for vector search
 * Account: 643942183354 (SuplementAI)
 *
 * This endpoint searches for supplement studies using LanceDB vector search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type StudiesFallbackFailureKind =
  | 'access_denied'
  | 'credentials_unavailable'
  | 'function_not_found'
  | 'timeout'
  | 'lambda_response_error'
  | 'unknown';

// Prefer the studies service config used by enrichment. SEARCH_API_URL is retained
// only as a legacy fallback for older environments.
function getStudiesApiUrl(): string {
  return process.env.NEXT_PUBLIC_STUDIES_API_URL ||
    process.env.STUDIES_API_URL ||
    process.env.SEARCH_API_URL ||
    'https://ogmnjgz664uws4h4t522agsmj40gbpyr.lambda-url.us-east-1.on.aws/';
}

function getStudiesFetcherFunctionName(): string {
  return process.env.STUDIES_FETCHER_LAMBDA || 'suplementia-studies-fetcher-prod';
}

function classifyStudiesFallbackError(error: any): StudiesFallbackFailureKind {
  const name = String(error?.name || '');
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const combined = `${name} ${code} ${message}`.toLowerCase();

  if (combined.includes('accessdenied') || combined.includes('not authorized') || combined.includes('is not authorized')) {
    return 'access_denied';
  }

  if (
    combined.includes('credential') ||
    combined.includes('could not load') ||
    combined.includes('missing credentials') ||
    combined.includes('security token')
  ) {
    return 'credentials_unavailable';
  }

  if (combined.includes('resource not found') || combined.includes('function not found') || combined.includes('resourcenotfound')) {
    return 'function_not_found';
  }

  if (combined.includes('abort') || combined.includes('timeout') || combined.includes('timed out')) {
    return 'timeout';
  }

  if (combined.includes('lambda response')) {
    return 'lambda_response_error';
  }

  return 'unknown';
}

function logStudiesFallbackFailure(params: {
  requestId: string;
  supplementName: string;
  functionName: string;
  error: any;
}) {
  const kind = classifyStudiesFallbackError(params.error);
  console.error('[Studies API] IAM fallback failed', {
    requestId: params.requestId,
    supplementName: params.supplementName,
    functionName: params.functionName,
    failureKind: kind,
    errorName: params.error?.name || 'unknown',
  });
}

export interface StudySearchRequest {
  supplementName: string;
  maxResults?: number;
  filters?: {
    rctOnly?: boolean;
    yearFrom?: number;
    yearTo?: number;
    humanStudiesOnly?: boolean;
    studyTypes?: string[];
  };
}

function buildStudiesPayload(body: StudySearchRequest) {
  return {
    supplementName: body.supplementName,
    maxResults: body.maxResults || 10,
    rctOnly: body.filters?.rctOnly || false,
    ...(body.filters?.yearFrom && { yearFrom: body.filters.yearFrom }),
    ...(body.filters?.yearTo && { yearTo: body.filters.yearTo }),
    humanStudiesOnly: body.filters?.humanStudiesOnly ?? true,
    filters: {
      rctOnly: body.filters?.rctOnly || false,
      humanStudiesOnly: body.filters?.humanStudiesOnly ?? true,
      ...(body.filters?.yearFrom && { yearFrom: body.filters.yearFrom }),
      ...(body.filters?.yearTo && { yearTo: body.filters.yearTo }),
      ...(body.filters?.studyTypes && { studyTypes: body.filters.studyTypes }),
    },
  };
}

async function fetchStudiesFromConfiguredService(body: StudySearchRequest, requestId: string): Promise<Response> {
  return fetch(getStudiesApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
    body: JSON.stringify(buildStudiesPayload(body)),
    signal: AbortSignal.timeout(30000),
  });
}

async function invokeStudiesFetcherLambda(body: StudySearchRequest, requestId: string): Promise<any> {
  const functionName = getStudiesFetcherFunctionName();
  const lambdaResponse = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify({
        httpMethod: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        body: JSON.stringify(buildStudiesPayload(body)),
      })),
    })
  );

  const rawPayload = Buffer.from(lambdaResponse.Payload || []).toString();
  const lambdaEnvelope = rawPayload ? JSON.parse(rawPayload) : {};
  const responseBody = typeof lambdaEnvelope.body === 'string'
    ? JSON.parse(lambdaEnvelope.body || '{}')
    : lambdaEnvelope.body || lambdaEnvelope;

  const statusCode = Number(lambdaEnvelope.statusCode || lambdaResponse.StatusCode || 500);
  if (statusCode < 200 || statusCode >= 300 || responseBody?.success === false) {
    throw new Error(`Studies Lambda response error: status ${statusCode}`);
  }

  return responseBody;
}

function extractRankedStudies(ranked: any): any[] | null {
  if (!ranked || typeof ranked !== 'object') return null;
  const studies = ['positive', 'negative', 'mixed']
    .flatMap((key) => Array.isArray(ranked[key]) ? ranked[key] : []);

  return studies.length > 0 ? studies : null;
}

function extractStudiesList(data: any) {
  let studiesList = [];
  const rankedStudies = extractRankedStudies(data?.ranked) || extractRankedStudies(data?.data?.ranked);

  if (Array.isArray(data)) {
    studiesList = data;
  } else if (Array.isArray(data.results)) {
    studiesList = data.results;
  } else if (Array.isArray(data.data)) {
    studiesList = data.data;
  } else if (Array.isArray(data.data?.studies)) {
    studiesList = data.data.studies;
  } else if (rankedStudies) {
    studiesList = rankedStudies;
  } else if (Array.isArray(data.studies)) {
    studiesList = data.studies;
  } else if (data.supplement) {
    // Check if studies are nested inside the supplement object
    if (Array.isArray(data.supplement.studies)) {
      studiesList = data.supplement.studies;
    } else if (Array.isArray(data.supplement.evidence)) {
      studiesList = data.supplement.evidence;
    } else if (Array.isArray(data.supplement.relatedStudies)) {
      studiesList = data.supplement.relatedStudies;
    } else if (Array.isArray(data.supplement.references)) {
      studiesList = data.supplement.references;
    } else {
      // No studies array found, but we have supplement data
      // Return the supplement info so frontend can show it
      const supplement = data.supplement;
      const pubmedQuery = supplement.metadata?.pubmed_query || supplement.name;
      const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(pubmedQuery)}`;

      // Create a synthetic study entry with PubMed link
      studiesList = [{
        title: `${supplement.name} - Evidence Grade: ${supplement.metadata?.evidence_grade || 'N/A'}`,
        summary: `Scientific Name: ${supplement.scientificName || 'N/A'}. Common Names: ${(supplement.commonNames || []).join(', ')}. Approximately ${supplement.metadata?.study_count || 'many'} studies available on PubMed.`,
        url: pubmedUrl
      }];
    }
  } else {
    throw new Error(`Unexpected studies response format. Received keys: ${Object.keys(data || {}).join(', ')}`);
  }

  return studiesList;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || randomUUID();

  try {
    const body: StudySearchRequest = await request.json();

    if (!body.supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }

    console.log(`[Studies API] Searching for: ${body.supplementName}`);

    let data: any;
    let response: Response | null = null;
    try {
      response = await fetchStudiesFromConfiguredService(body, requestId);
    } catch (error: any) {
      console.warn('[Studies API] Configured studies endpoint unavailable; retrying via IAM Lambda invoke', {
        reason: error?.message || 'unknown',
      });
      try {
        data = await invokeStudiesFetcherLambda(body, requestId);
      } catch (lambdaError: any) {
        logStudiesFallbackFailure({
          requestId,
          supplementName: body.supplementName,
          functionName: getStudiesFetcherFunctionName(),
          error: lambdaError,
        });
        throw lambdaError;
      }
    }

    if (response?.ok) {
      data = await response.json();
    } else if (response && [401, 403].includes(response.status)) {
      console.warn(`[Studies API] Configured studies endpoint returned ${response.status}; retrying via IAM Lambda invoke`);
      try {
        data = await invokeStudiesFetcherLambda(body, requestId);
      } catch (lambdaError: any) {
        logStudiesFallbackFailure({
          requestId,
          supplementName: body.supplementName,
          functionName: getStudiesFetcherFunctionName(),
          error: lambdaError,
        });
        throw lambdaError;
      }
    } else if (response) {
      const error = await response.text();
      console.error('Studies service unavailable:', {
        status: response.status,
        bodyPreview: error.slice(0, 120),
      });
      return NextResponse.json(
        { success: false, error: 'Studies service temporarily unavailable' },
        { status: 503 }
      );
    }

    const studiesList = extractStudiesList(data);

    // Adapt the response to match the format expected by the frontend
    return NextResponse.json({ success: true, studies: studiesList });

  } catch (error: any) {
    console.error('Studies route error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Studies service temporarily unavailable' },
      { status: 503 }
    );
  }
}
