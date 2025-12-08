import { NextRequest, NextResponse } from 'next/server';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';

// The new, secure API Gateway endpoint for vector search
const VECTOR_SEARCH_API_URL = 'https://wn3ub0r41e.execute-api.us-east-1.amazonaws.com/search';
const REGION = process.env.APP_REGION || 'us-east-1';

export interface StudySearchRequest {
  supplementName: string;
  maxResults?: number;
}

// Utility function to sign and fetch
async function signAndFetch(url: string, body: object) {
  const sigv4 = new SignatureV4({
    credentials: defaultProvider(),
    region: REGION,
    service: 'execute-api',
    sha256: Sha256,
  });

  const urlObject = new URL(url);

  const request = new HttpRequest({
    hostname: urlObject.hostname,
    path: urlObject.pathname,
    method: 'POST',
    protocol: 'https',
    headers: {
      'Content-Type': 'application/json',
      host: urlObject.hostname,
    },
    body: JSON.stringify(body),
  });

  const signedRequest = await sigv4.sign(request);

  // Use the signed request headers and body for the fetch call
  return fetch(url, {
    method: signedRequest.method,
    headers: signedRequest.headers,
    body: signedRequest.body,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: StudySearchRequest = await request.json();

    if (!body.supplementName) {
      return NextResponse.json({ success: false, error: 'supplementName is required' }, { status: 400 });
    }
    
    // Use the new vector search API
    const response = await signAndFetch(VECTOR_SEARCH_API_URL, {
        query: body.supplementName, // The new API expects a 'query' field
        top_k: body.maxResults || 10,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vector Search API error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch studies from vector search' }, { status: response.status });
    }

    const data = await response.json();
    // Adapt the response if necessary to match the old format expected by the frontend
    return NextResponse.json({ success: true, studies: data.results });

  } catch (error: any) {
    console.error('Studies route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supplementName = searchParams.get('supplementName');

  if (!supplementName) {
    return NextResponse.json({ success: false, error: 'supplementName is required' }, { status: 400 });
  }

  const maxResults = parseInt(searchParams.get('maxResults') || '10');

  try {
    // Use the new vector search API
    const response = await signAndFetch(VECTOR_SEARCH_API_URL, {
        query: supplementName,
        top_k: maxResults,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vector Search API error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch studies from vector search' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, studies: data.results });

  } catch (error: any) {
    console.error('Studies route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
