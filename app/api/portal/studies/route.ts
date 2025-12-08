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
  // Manually construct and SANITIZE credentials to fix Vercel environment variable issues.
  // Vercel can inject various whitespace characters into env vars, which corrupts the AWS signature.
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.replace(/\s/g, '') || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.replace(/\s/g, '') || '',
    sessionToken: process.env.AWS_SESSION_TOKEN?.replace(/\s/g, ''),
  };

  // If any essential credential is missing, throw a clear error.
  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    throw new Error('AWS credentials are not properly configured in the environment.');
  }

  const sigv4 = new SignatureV4({
    credentials,
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

  // **DEBUGGING ADICIONAL:** Log the full Authorization header before making the fetch call.
  console.log('DEBUG: AWS Signed Headers (before fetch):', JSON.stringify(signedRequest.headers, null, 2));
  console.log('DEBUG: Sanitized Access Key ID (first 5 chars): ', credentials.accessKeyId.substring(0, 5));
  
  // Correctly construct the Headers object for fetch
  const headers = new Headers();
  for (const [key, value] of Object.entries(signedRequest.headers)) {
    if (value) {
      headers.append(key, value.toString());
    }
  }

  // Use the signed request headers and body for the fetch call
  return fetch(url, {
    method: signedRequest.method,
    headers: headers,
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
