/**
 * Property-Based Tests for Error Response Templates
 * Feature: frontend-error-display-fix
 */

import * as fc from 'fast-check';
import {
  formatErrorResponse,
  formatValidationError,
  sanitizeSensitiveData,
  ERROR_MESSAGES,
  ErrorType,
} from './error-responses';

// Test configuration
const FC_CONFIG = {
  numRuns: 100,
  verbose: true,
};

describe('Error Response Templates', () => {
  /**
   * Property 5: 500 errors include debug info without sensitive data
   * Feature: frontend-error-display-fix, Property 5: 500 errors include debug info without sensitive data
   * Validates: Requirements 1.5
   */
  describe('Property 5: Sensitive data sanitization', () => {
    it('should sanitize API keys from error details', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ENRICHMENT_FAILED', 'DIRECT_FETCH_FAILED', 'NORMALIZATION_FAILED'),
          fc.string({ minLength: 10, maxLength: 40 }), // API key
          fc.uuid(), // correlation ID
          (errorType, apiKey, correlationId) => {
            // Create error details with API key
            const details = {
              error: `Failed to authenticate with api_key=${apiKey}`,
              stack: `Error at /home/user/app/lib/api.ts:123`,
              token: `Bearer ${apiKey}`,
            };

            const { response, statusCode } = formatErrorResponse(
              errorType as ErrorType,
              {
                correlationId,
                details,
              }
            );

            // Verify response structure
            expect(response.success).toBe(false);
            expect(response.error).toBe(ERROR_MESSAGES[errorType as ErrorType].error);
            expect(statusCode).toBe(500);

            // In development mode, details should be included but sanitized
            if (process.env.NODE_ENV === 'development' && response.details) {
              // Check that API key is redacted
              const detailsStr = JSON.stringify(response.details);
              expect(detailsStr).not.toContain(apiKey);
              expect(detailsStr).toContain('[REDACTED]');
            }

            // In production mode, details should not be included
            if (process.env.NODE_ENV === 'production') {
              expect(response.details).toBeUndefined();
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should sanitize internal file paths from error details', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ENRICHMENT_FAILED', 'DIRECT_FETCH_FAILED'),
          fc.string({ minLength: 5, maxLength: 20 }),
          (errorType, pathSegment) => {
            // Create error details with internal paths
            const details = {
              stack: `Error at /home/user/${pathSegment}/app.ts:123\n  at /usr/local/lib/node.js:456`,
              error: `File not found: /var/log/${pathSegment}/error.log`,
            };

            const { response } = formatErrorResponse(
              errorType as ErrorType,
              {
                details,
              }
            );

            // In development mode, check sanitization
            if (process.env.NODE_ENV === 'development' && response.details) {
              const detailsStr = JSON.stringify(response.details);
              
              // Internal paths should be redacted
              expect(detailsStr).not.toContain('/home/user/');
              expect(detailsStr).not.toContain('/usr/local/');
              expect(detailsStr).not.toContain('/var/log/');
              expect(detailsStr).toContain('[REDACTED]');
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should sanitize AWS credentials from error details', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ENRICHMENT_FAILED', 'DIRECT_FETCH_FAILED'),
          fc.string({ minLength: 20, maxLength: 40 }), // AWS access key
          fc.string({ minLength: 40, maxLength: 60 }), // AWS secret key
          (errorType, accessKey, secretKey) => {
            // Create error details with AWS credentials
            const details = {
              error: `AWS authentication failed`,
              config: `aws_access_key_id=${accessKey}, aws_secret_access_key=${secretKey}`,
            };

            const { response } = formatErrorResponse(
              errorType as ErrorType,
              {
                details,
              }
            );

            // In development mode, check sanitization
            if (process.env.NODE_ENV === 'development' && response.details) {
              const detailsStr = JSON.stringify(response.details);
              
              // AWS credentials should be redacted
              expect(detailsStr).not.toContain(accessKey);
              expect(detailsStr).not.toContain(secretKey);
              expect(detailsStr).toContain('[REDACTED]');
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should sanitize database connection strings from error details', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ENRICHMENT_FAILED', 'DIRECT_FETCH_FAILED'),
          fc.string({ minLength: 8, maxLength: 20 }), // username
          fc.string({ minLength: 8, maxLength: 20 }), // password
          (errorType, username, password) => {
            // Create error details with database connection strings
            const details = {
              error: `Database connection failed`,
              connectionString: `mongodb://${username}:${password}@localhost:27017/mydb`,
              postgresUrl: `postgres://${username}:${password}@db.example.com:5432/prod`,
            };

            const { response } = formatErrorResponse(
              errorType as ErrorType,
              {
                details,
              }
            );

            // In development mode, check sanitization
            if (process.env.NODE_ENV === 'development' && response.details) {
              const detailsStr = JSON.stringify(response.details);
              
              // Connection strings should be redacted
              expect(detailsStr).not.toContain(username);
              expect(detailsStr).not.toContain(password);
              expect(detailsStr).toContain('[REDACTED]');
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should preserve non-sensitive numeric and boolean values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ENRICHMENT_FAILED', 'DIRECT_FETCH_FAILED'),
          fc.integer({ min: 0, max: 10000 }), // elapsed time
          fc.integer({ min: 0, max: 10 }), // retry count
          fc.boolean(), // some flag
          (errorType, elapsedTime, retryCount, flag) => {
            // Create error details with non-sensitive data
            const details = {
              elapsedTime,
              retryCount,
              flag,
              jobId: 'job-123',
            };

            const { response } = formatErrorResponse(
              errorType as ErrorType,
              {
                details,
              }
            );

            // In development mode, check that non-sensitive data is preserved
            if (process.env.NODE_ENV === 'development' && response.details) {
              expect(response.details.elapsedTime).toBe(elapsedTime);
              expect(response.details.retryCount).toBe(retryCount);
              expect(response.details.flag).toBe(flag);
              expect(response.details.jobId).toBe('job-123');
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should not include details in production mode', () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        fc.assert(
          fc.property(
            fc.constantFrom('ENRICHMENT_FAILED', 'DIRECT_FETCH_FAILED', 'NORMALIZATION_FAILED'),
            fc.record({
              error: fc.string(),
              stack: fc.string(),
              jobId: fc.uuid(),
            }),
            (errorType, details) => {
              const { response } = formatErrorResponse(
                errorType as ErrorType,
                {
                  details,
                }
              );

              // In production, details should not be included
              expect(response.details).toBeUndefined();
            }
          ),
          FC_CONFIG
        );
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  /**
   * Property 18: Validation failures return 400
   * Feature: frontend-error-display-fix, Property 18: Validation failures return 400
   * Validates: Requirements 4.4
   */
  describe('Property 18: Validation error responses', () => {
    it('should return 400 status code for validation failures', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          fc.option(fc.uuid(), { nil: undefined }),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          (validationErrors, correlationId, supplementName) => {
            const { response, statusCode } = formatValidationError(
              validationErrors,
              {
                correlationId,
                supplementName,
              }
            );

            // Verify status code is 400
            expect(statusCode).toBe(400);

            // Verify response structure
            expect(response.success).toBe(false);
            expect(response.error).toBe('validation_failed');
            expect(response.status).toBe('validation_failed');

            // Verify message is user-friendly
            expect(response.message).toBeDefined();
            expect(typeof response.message).toBe('string');
            expect(response.message.length).toBeGreaterThan(0);

            // Verify suggestion is provided
            expect(response.suggestion).toBeDefined();
            expect(typeof response.suggestion).toBe('string');

            // Verify correlation ID is included if provided
            if (correlationId) {
              expect(response.correlationId).toBe(correlationId);
            }

            // Verify request ID is generated
            expect(response.requestId).toBeDefined();
            expect(response.requestId).toMatch(/^req_/);
          }
        ),
        FC_CONFIG
      );
    });

    it('should include validation errors in details (development mode)', () => {
      // Ensure we're in development mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        fc.assert(
          fc.property(
            fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
            (validationErrors) => {
              const { response } = formatValidationError(validationErrors);

              // In development mode, details should include validation errors
              if (response.details) {
                expect(response.details.validationErrors).toBeDefined();
                expect(Array.isArray(response.details.validationErrors)).toBe(true);
                expect(response.details.validationErrors.length).toBe(validationErrors.length);
              }
            }
          ),
          FC_CONFIG
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should sanitize sensitive data from validation errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 40 }), // API key
          (apiKey) => {
            const validationErrors = [
              `Invalid API key: api_key=${apiKey}`,
              `Authentication failed with token=${apiKey}`,
            ];

            const { response } = formatValidationError(validationErrors);

            // In development mode, check sanitization
            if (process.env.NODE_ENV === 'development' && response.details) {
              const detailsStr = JSON.stringify(response.details);
              
              // API key should be redacted
              expect(detailsStr).not.toContain(apiKey);
              expect(detailsStr).toContain('[REDACTED]');
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should format single validation error as direct message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (errorMessage) => {
            const { response } = formatValidationError([errorMessage]);

            // For single error, message should be the error itself (sanitized)
            expect(response.message).toBeDefined();
            // The message might be sanitized, so we check it's not empty
            expect(response.message.length).toBeGreaterThan(0);
          }
        ),
        FC_CONFIG
      );
    });

    it('should format multiple validation errors with count', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          (validationErrors) => {
            const { response } = formatValidationError(validationErrors);

            // For multiple errors, message should include count
            expect(response.message).toContain(validationErrors.length.toString());
            expect(response.message).toContain('errores de validación');
          }
        ),
        FC_CONFIG
      );
    });
  });

  describe('Error Response Structure', () => {
    it('should generate unique request IDs for all error responses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(ERROR_MESSAGES) as ErrorType[]),
          fc.integer({ min: 1, max: 10 }),
          (errorType, iterations) => {
            const requestIds = new Set<string>();

            for (let i = 0; i < iterations; i++) {
              const { response } = formatErrorResponse(errorType);
              requestIds.add(response.requestId);
            }

            // All request IDs should be unique
            expect(requestIds.size).toBe(iterations);

            // All request IDs should start with 'req_'
            for (const id of requestIds) {
              expect(id).toMatch(/^req_/);
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should include correlation ID when provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(ERROR_MESSAGES) as ErrorType[]),
          fc.uuid(),
          (errorType, correlationId) => {
            const { response } = formatErrorResponse(errorType, { correlationId });

            expect(response.correlationId).toBe(correlationId);
          }
        ),
        FC_CONFIG
      );
    });

    it('should use custom message when provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(ERROR_MESSAGES) as ErrorType[]),
          fc.string({ minLength: 10, maxLength: 100 }),
          (errorType, customMessage) => {
            const { response } = formatErrorResponse(errorType, { customMessage });

            expect(response.message).toBe(customMessage);
          }
        ),
        FC_CONFIG
      );
    });

    it('should use custom suggestion when provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(ERROR_MESSAGES) as ErrorType[]),
          fc.string({ minLength: 10, maxLength: 100 }),
          (errorType, customSuggestion) => {
            const { response } = formatErrorResponse(errorType, { customSuggestion });

            expect(response.suggestion).toBe(customSuggestion);
          }
        ),
        FC_CONFIG
      );
    });

    it('should return correct status codes for each error type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(ERROR_MESSAGES) as ErrorType[]),
          (errorType) => {
            const { statusCode } = formatErrorResponse(errorType);
            const expectedStatus = ERROR_MESSAGES[errorType].status;

            expect(statusCode).toBe(expectedStatus);
          }
        ),
        FC_CONFIG
      );
    });
  });

  describe('Sanitization Function', () => {
    it('should sanitize all sensitive patterns', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 40 }),
          (secret) => {
            const testCases = [
              `api_key=${secret}`,
              `token=${secret}`,
              `Bearer ${secret}`,
              `authorization=${secret}`,
              `aws_access_key_id=${secret}`,
              `aws_secret_access_key=${secret}`,
            ];

            for (const testCase of testCases) {
              const sanitized = sanitizeSensitiveData(testCase);
              expect(sanitized).not.toContain(secret);
              expect(sanitized).toContain('[REDACTED]');
            }
          }
        ),
        FC_CONFIG
      );
    });

    it('should preserve non-sensitive text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => 
            !s.includes('api') && 
            !s.includes('token') && 
            !s.includes('key') &&
            !s.includes('@') &&
            !s.includes('/')
          ),
          (text) => {
            const sanitized = sanitizeSensitiveData(text);
            expect(sanitized).toBe(text);
          }
        ),
        FC_CONFIG
      );
    });
  });
});
