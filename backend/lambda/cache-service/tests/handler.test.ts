/**
 * Tests for Cache Service handler
 */

import { Context } from 'aws-lambda';
import { handler } from '../src/index';
import * as dynamodb from '../src/dynamodb';
import { CacheItem, EnrichedContent } from '../src/types';

// Mock DynamoDB operations
jest.mock('../src/dynamodb');

describe('Cache Service Handler', () => {
  const mockContext: Context = {
    requestId: 'test-request-id',
    functionName: 'cache-service',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:cache-service',
    memoryLimitInMB: '512',
    awsRequestId: 'test-aws-request-id',
    logGroupName: '/aws/lambda/cache-service',
    logStreamName: '2024/11/19/[$LATEST]test',
    getRemainingTimeInMillis: () => 3000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
    callbackWaitsForEmptyEventLoop: true,
  };

  const mockEnrichedContent: EnrichedContent = {
    whatIsIt: 'Test supplement',
    primaryUses: ['Test use 1', 'Test use 2'],
    mechanisms: [
      {
        name: 'Test mechanism',
        description: 'Test description',
        evidenceLevel: 'strong',
        studyCount: 10,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /cache/:supplementId', () => {
    it('should return 404 when cache item not found', async () => {
      // Mock DynamoDB to return null
      (dynamodb.getCacheItem as jest.Mock).mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        pathParameters: { supplementId: 'nonexistent' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        success: false,
        error: 'Not found',
      });
    });

    it('should return 200 with cache data when found', async () => {
      const mockCacheItem: CacheItem = {
        PK: 'SUPPLEMENT#ashwagandha',
        SK: 'ENRICHED_CONTENT#v1',
        data: mockEnrichedContent,
        ttl: Math.floor(Date.now() / 1000) + 3600, // Not stale
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
      };

      (dynamodb.getCacheItem as jest.Mock).mockResolvedValue(mockCacheItem);
      (dynamodb.isCacheStale as jest.Mock).mockReturnValue(false);

      const event = {
        httpMethod: 'GET',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockEnrichedContent);
      expect(body.metadata.isStale).toBe(false);
    });

    it('should detect stale cache', async () => {
      const mockCacheItem: CacheItem = {
        PK: 'SUPPLEMENT#ashwagandha',
        SK: 'ENRICHED_CONTENT#v1',
        data: mockEnrichedContent,
        ttl: Math.floor(Date.now() / 1000) - 3600, // Stale (expired 1 hour ago)
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
      };

      (dynamodb.getCacheItem as jest.Mock).mockResolvedValue(mockCacheItem);
      (dynamodb.isCacheStale as jest.Mock).mockReturnValue(true);

      const event = {
        httpMethod: 'GET',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.metadata.isStale).toBe(true);
    });

    it('should return 400 when supplementId missing', async () => {
      const event = {
        httpMethod: 'GET',
        pathParameters: {},
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toMatchObject({
        success: false,
        error: 'supplementId is required',
      });
    });
  });

  describe('PUT /cache/:supplementId', () => {
    it('should store cache data successfully', async () => {
      (dynamodb.putCacheItem as jest.Mock).mockResolvedValue(undefined);

      const event = {
        httpMethod: 'PUT',
        pathParameters: { supplementId: 'ashwagandha' },
        body: JSON.stringify(mockEnrichedContent),
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({
        success: true,
        message: 'Cache updated successfully',
      });
      expect(dynamodb.putCacheItem).toHaveBeenCalledWith(
        'ashwagandha',
        mockEnrichedContent
      );
    });

    it('should return 400 when body is missing', async () => {
      const event = {
        httpMethod: 'PUT',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toMatchObject({
        success: false,
        error: 'Request body is required',
      });
    });

    it('should return 400 when body is invalid JSON', async () => {
      const event = {
        httpMethod: 'PUT',
        pathParameters: { supplementId: 'ashwagandha' },
        body: 'invalid json {',
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toMatchObject({
        success: false,
        error: 'Invalid JSON in request body',
      });
    });
  });

  describe('DELETE /cache/:supplementId', () => {
    it('should delete cache successfully', async () => {
      (dynamodb.deleteCacheItem as jest.Mock).mockResolvedValue(undefined);

      const event = {
        httpMethod: 'DELETE',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({
        success: true,
        message: 'Cache invalidated successfully',
      });
      expect(dynamodb.deleteCacheItem).toHaveBeenCalledWith('ashwagandha');
    });
  });

  describe('OPTIONS /cache/:supplementId', () => {
    it('should handle OPTIONS request (CORS preflight)', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
    });
  });

  describe('Error handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event = {
        httpMethod: 'PATCH',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body)).toMatchObject({
        success: false,
        error: 'Method not allowed',
      });
    });

    it('should return 500 when DynamoDB throws error', async () => {
      (dynamodb.getCacheItem as jest.Mock).mockRejectedValue(
        new Error('DynamoDB connection error')
      );

      const event = {
        httpMethod: 'GET',
        pathParameters: { supplementId: 'ashwagandha' },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in all responses', async () => {
      (dynamodb.getCacheItem as jest.Mock).mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        pathParameters: { supplementId: 'test' },
      };

      const response = await handler(event, mockContext);

      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });
});
