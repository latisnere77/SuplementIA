/**
 * Unit tests for Studies Fetcher Lambda
 */

import { handler } from '../src/index';
import * as pubmed from '../src/pubmed';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock PubMed module
jest.mock('../src/pubmed');

// Mock X-Ray
jest.mock('aws-xray-sdk-core', () => ({
  captureHTTPsGlobal: jest.fn(),
  getSegment: jest.fn(() => ({
    addNewSubsegment: jest.fn(() => ({
      addAnnotation: jest.fn(),
      addMetadata: jest.fn(),
      addError: jest.fn(),
      close: jest.fn(),
      addNewSubsegment: jest.fn(() => ({
        addAnnotation: jest.fn(),
        addError: jest.fn(),
        close: jest.fn(),
      })),
    })),
  })),
}));

// Mock fetch for cache
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
  } as Response)
);

describe('Studies Fetcher Lambda Handler', () => {
  const mockContext: Context = {
    functionName: 'studies-fetcher',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:studies-fetcher',
    memoryLimitInMB: '512',
    awsRequestId: 'test-aws-request-id',
    logGroupName: '/aws/lambda/studies-fetcher',
    logStreamName: '2024/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
    callbackWaitsForEmptyEventLoop: true,
  };

  const mockStudies = [
    {
      pmid: '12345678',
      title: 'Vitamin D and Bone Health: A Meta-Analysis',
      abstract: 'This meta-analysis examined the effects of vitamin D supplementation...',
      authors: ['Smith J', 'Jones A', 'Brown B'],
      year: 2023,
      journal: 'Journal of Clinical Nutrition',
      studyType: 'meta-analysis' as const,
      participants: 5000,
      doi: '10.1234/jcn.2023.12345',
      pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
    },
    {
      pmid: '87654321',
      title: 'Randomized Trial of Vitamin D in Elderly Adults',
      abstract: 'We conducted an RCT with 500 participants...',
      authors: ['Garcia M', 'Lee K'],
      year: 2022,
      journal: 'New England Journal of Medicine',
      studyType: 'randomized controlled trial' as const,
      participants: 500,
      pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/87654321/',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CACHE_SERVICE_URL;
  });

  describe('Successful requests', () => {
    it('should fetch studies from PubMed successfully', async () => {
      (pubmed.searchPubMed as jest.Mock).mockResolvedValue(mockStudies);

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          supplementName: 'Vitamin D',
          maxResults: 10,
        }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(pubmed.searchPubMed).toHaveBeenCalledWith({
        supplementName: 'Vitamin D',
        maxResults: 10,
        filters: {},
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.studies).toEqual(mockStudies);
      expect(body.data.totalFound).toBe(2);
      expect(body.metadata.supplementName).toBe('Vitamin D');
      expect(body.metadata.source).toBe('pubmed');
    });

    it('should use default maxResults if not provided', async () => {
      (pubmed.searchPubMed as jest.Mock).mockResolvedValue([]);

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          supplementName: 'Creatine',
        }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      await handler(event, mockContext);

      expect(pubmed.searchPubMed).toHaveBeenCalledWith({
        supplementName: 'Creatine',
        maxResults: 10, // default
        filters: {},
      });
    });

    it('should pass filters to PubMed search', async () => {
      (pubmed.searchPubMed as jest.Mock).mockResolvedValue(mockStudies);

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          supplementName: 'Omega-3',
          maxResults: 5,
          filters: {
            rctOnly: true,
            yearFrom: 2020,
            humanStudiesOnly: true,
          },
        }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      await handler(event, mockContext);

      expect(pubmed.searchPubMed).toHaveBeenCalledWith({
        supplementName: 'Omega-3',
        maxResults: 5,
        filters: {
          rctOnly: true,
          yearFrom: 2020,
          humanStudiesOnly: true,
        },
      });
    });

    it('should handle OPTIONS request (CORS)', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'OPTIONS',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(pubmed.searchPubMed).not.toHaveBeenCalled();
    });
  });

  describe('Request validation', () => {
    it('should reject requests without body', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Request body is required');
    });

    it('should reject invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: 'not valid json{',
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid JSON');
    });

    it('should reject missing supplementName', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({ maxResults: 5 }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('supplementName is required');
    });

    it('should reject empty supplementName', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({ supplementName: '   ' }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('cannot be empty');
    });

    it('should reject supplementName longer than 200 characters', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          supplementName: 'a'.repeat(201),
        }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('200 characters or less');
    });

    it('should reject invalid maxResults', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          supplementName: 'Magnesium',
          maxResults: 150, // > 100
        }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('between 1 and 100');
    });

    it('should reject non-POST methods', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Method not allowed');
    });
  });

  describe('Error handling', () => {
    it('should handle PubMed search errors gracefully', async () => {
      (pubmed.searchPubMed as jest.Mock).mockRejectedValue(
        new Error('PubMed API is down')
      );

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({ supplementName: 'Zinc' }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('PubMed API is down');
    });
  });

  describe('Cache integration', () => {
    it('should save studies to cache if URL is configured', async () => {
      process.env.CACHE_SERVICE_URL = 'https://cache.example.com';
      (pubmed.searchPubMed as jest.Mock).mockResolvedValue(mockStudies);

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({ supplementName: 'Vitamin C' }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);

      // Wait for async cache save
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have attempted cache save
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('studies-vitamin-c'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should continue if cache save fails', async () => {
      process.env.CACHE_SERVICE_URL = 'https://cache.example.com';
      (pubmed.searchPubMed as jest.Mock).mockResolvedValue(mockStudies);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Cache unavailable'));

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({ supplementName: 'Iron' }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/studies/search',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const response = await handler(event, mockContext);

      // Should still succeed even if cache fails
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});
