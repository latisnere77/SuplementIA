/**
 * Security Middleware
 * 
 * Combines rate limiting, input validation, and CORS handling
 * for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, RateLimitError } from './rate-limiter';
import { InputValidator, ValidationError } from './input-validator';
import Redis from 'ioredis';

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    perIPLimit: number;
    perUserLimit: number;
  };
  validation: {
    enabled: boolean;
    maxQueryLength: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
  };
  requestSigning: {
    enabled: boolean;
    secret?: string;
  };
}

const DEFAULT_CONFIG: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    perIPLimit: 100,
    perUserLimit: 1000,
  },
  validation: {
    enabled: true,
    maxQueryLength: 200,
  },
  cors: {
    enabled: true,
    allowedOrigins: ['*'], // Configure based on environment
  },
  requestSigning: {
    enabled: false,
  },
};

export class SecurityMiddleware {
  private rateLimiter: RateLimiter | null = null;
  private validator: InputValidator;
  private config: SecurityConfig;

  constructor(
    redis: Redis | null,
    config: Partial<SecurityConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (redis && this.config.rateLimiting.enabled) {
      this.rateLimiter = new RateLimiter(redis, {
        perIPLimit: this.config.rateLimiting.perIPLimit,
        perUserLimit: this.config.rateLimiting.perUserLimit,
      });
    }

    this.validator = new InputValidator({
      maxLength: this.config.validation.maxQueryLength,
    });
  }

  /**
   * Apply security middleware to request
   */
  async applyMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return this.handleCORS(request);
      }

      // Extract IP address
      const ip = this.extractIP(request);
      if (!ip) {
        return NextResponse.json(
          { error: 'Unable to determine client IP' },
          { status: 400 }
        );
      }

      // Check rate limit
      if (this.rateLimiter && this.config.rateLimiting.enabled) {
        const rateLimit = await this.rateLimiter.checkIPRateLimit(ip);
        
        if (!rateLimit.allowed) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateLimit.retryAfter,
              resetAt: rateLimit.resetAt,
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': this.config.rateLimiting.perIPLimit.toString(),
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
                'Retry-After': (rateLimit.retryAfter || 60).toString(),
              },
            }
          );
        }

        // Add rate limit headers to response
        const response = await handler(request);
        response.headers.set('X-RateLimit-Limit', this.config.rateLimiting.perIPLimit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

        // Add CORS headers
        if (this.config.cors.enabled) {
          const corsHeaders = this.validator.getCORSHeaders(
            request.headers.get('origin') || undefined,
            this.config.cors.allowedOrigins
          );
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }

        return response;
      }

      // Execute handler
      const response = await handler(request);

      // Add CORS headers
      if (this.config.cors.enabled) {
        const corsHeaders = this.validator.getCORSHeaders(
          request.headers.get('origin') || undefined,
          this.config.cors.allowedOrigins
        );
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      return response;
    } catch (error) {
      console.error('Security middleware error:', error);

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
          { status: 400 }
        );
      }

      if (error instanceof RateLimitError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: error.retryAfter,
            resetAt: error.resetAt,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  }

  /**
   * Validate search request
   */
  validateSearchRequest(body: any): { query: string; language: string } {
    if (!this.config.validation.enabled) {
      return {
        query: body.query || '',
        language: body.language || 'en',
      };
    }

    // Validate query
    const queryResult = this.validator.validateQuery(body.query);
    if (!queryResult.valid) {
      throw new ValidationError(
        'Invalid query parameter',
        queryResult.errors
      );
    }

    // Validate language
    const languageResult = this.validator.validateLanguage(body.language);
    if (!languageResult.valid) {
      throw new ValidationError(
        'Invalid language parameter',
        languageResult.errors
      );
    }

    return {
      query: queryResult.sanitized!,
      language: languageResult.sanitized!,
    };
  }

  /**
   * Handle CORS preflight request
   */
  private handleCORS(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const corsHeaders = this.validator.getCORSHeaders(
      origin || undefined,
      this.config.cors.allowedOrigins
    );

    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  /**
   * Extract IP address from request
   */
  private extractIP(request: NextRequest): string | null {
    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return this.validator.extractIP(headers);
  }

  /**
   * Verify request signature
   */
  verifySignature(request: NextRequest, payload: string): boolean {
    if (!this.config.requestSigning.enabled || !this.config.requestSigning.secret) {
      return true; // Skip if not enabled
    }

    const signature = request.headers.get('x-signature');
    if (!signature) {
      return false;
    }

    return this.validator.validateSignature(
      payload,
      signature,
      this.config.requestSigning.secret
    );
  }
}

/**
 * Create security middleware instance
 */
export function createSecurityMiddleware(
  redis: Redis | null,
  config?: Partial<SecurityConfig>
): SecurityMiddleware {
  return new SecurityMiddleware(redis, config);
}

/**
 * Helper to apply security to API route
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  redis: Redis | null,
  config?: Partial<SecurityConfig>
) {
  const middleware = createSecurityMiddleware(redis, config);
  
  return async (request: NextRequest) => {
    return middleware.applyMiddleware(request, handler);
  };
}
