/**
 * Tests for Intelligent Search API Route
 */

import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = jest.fn();

describe('Intelligent Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Input Validation', () => {
    it('should return 400 if query parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/portal/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should return 400 if query is too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/portal/search?q=a');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('too short');
    });

    it('should return 400 if query is too long', async () => {
      const longQuery = 'a'.repeat(201);
      const request = new NextRequest(`http://localhost:3000/api/portal/search?q=${longQuery}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('too long');
    });
  });

  describe('Successful Search', () => {
    it('should return supplement when found by Lambda', async () => {
      const mockSupplement = {
        id: '123',
        name: 'Echinacea',
        scientificName: 'Echinacea purpurea',
        similarity: 0.95,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          supplement: mockSupplement,
          similarity: 0.95,
          source: 'postgres',
          cacheHit: false,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=equinacea');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.supplement.name).toBe('Echinacea');
      expect(data.similarity).toBe(0.95);
      expect(data.source).toBe('postgres');
    });

    it('should return cached result from DynamoDB', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          supplement: { name: 'Vitamin D' },
          source: 'dynamodb',
          cacheHit: true,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=vitamin+d');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cacheHit).toBe(true);
      expect(data.source).toBe('dynamodb');
    });
  });

  describe('Not Found', () => {
    it('should return 404 when supplement not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          message: 'Supplement not found. Added to discovery queue.',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=unknown');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.addedToDiscovery).toBe(true);
    });
  });

  describe('Fallback to Legacy Normalizer', () => {
    it('should fallback when Lambda fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Lambda timeout'));

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=magnesium');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.source).toBe('fallback');
      expect(data.warning).toContain('legacy');
    });

    it('should return 503 when fallback is disabled and Lambda fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Lambda error'));

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=test&fallback=false');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain('unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should handle Lambda timeout gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 6000)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      // Should fallback
      expect(response.status).toBe(200);
      expect(data.source).toBe('fallback');
    });

    it('should handle unexpected errors', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      // Should fallback or return error
      expect([200, 500, 503]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should include latency in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          supplement: { name: 'Test' },
          latency: 45,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/portal/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(data.latency).toBeDefined();
      expect(typeof data.latency).toBe('number');
    });
  });
});
