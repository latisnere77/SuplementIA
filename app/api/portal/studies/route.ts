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

// Utility function to sign and fetch with POST method and query parameters
async function signAndFetchPost(url: string) {
  // Manually construct and SANITIZE credentials to fix Vercel environment variable issues.
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.replace(/\s/g, '') || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.replace(/\s/g, '') || '',
    sessionToken: process.env.AWS_SESSION_TOKEN?.replace(/\s/g, ''),
  };

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

  // Convert URLSearchParams to a plain object for the query property
  const query: Record<string, string> = {};
  urlObject.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const request = new HttpRequest({
    hostname: urlObject.hostname,
    path: urlObject.pathname,
    query: query,
    method: 'POST',
    protocol: 'https',
    headers: {
      host: urlObject.hostname,
    },
    body: '', // Explicit empty body for POST
  });

  const signedRequest = await sigv4.sign(request);

  console.log('DEBUG: POST request to:', url);
  console.log('DEBUG: Query Params:', JSON.stringify(query));

  // Construct the Headers object for fetch
  const headers = new Headers();
  for (const [key, value] of Object.entries(signedRequest.headers)) {
    if (value) {
      headers.append(key, value.toString());
    }
  }

  return fetch(url, {
    method: 'POST',
    headers: headers,
    body: '', // Ensure fetch also sends empty body if implicit
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: StudySearchRequest = await request.json();

    if (!body.supplementName) {
      return NextResponse.json({ success: false, error: 'supplementName is required' }, { status: 400 });
    }

    // Build URL with query parameters - the Lambda expects ?q=supplement_name in a POST request
    const searchUrl = `${VECTOR_SEARCH_API_URL}?q=${encodeURIComponent(body.supplementName)}&top_k=${body.maxResults || 10}`;

    // Use POST method with query parameters (API Gateway route is POST /search)
    const response = await signAndFetchPost(searchUrl);

    if (!response.ok) {
      const error = await response.text();
      console.error('Vector Search API error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch studies from vector search' }, { status: response.status });
    }

    const data = await response.json();

    // Determine where the array of studies is located locally
    let studiesList = [];
    if (Array.isArray(data)) {
      studiesList = data;
    } else if (Array.isArray(data.results)) {
      studiesList = data.results;
    } else if (Array.isArray(data.data)) {
      studiesList = data.data;
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
      console.error('Unexpected Lambda response format:', JSON.stringify(data));
      return NextResponse.json({
        success: false,
        error: `Unexpected Lambda response format. Received keys: ${Object.keys(data).join(', ')}`
      }, { status: 502 });
    }

    // Adapt the response if necessary to match the old format expected by the frontend
    return NextResponse.json({ success: true, studies: studiesList });

  } catch (error: any) {
    console.error('Studies route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
