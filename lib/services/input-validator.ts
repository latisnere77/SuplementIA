/**
 * Input Validation and Sanitization Service
 * 
 * Implements security measures:
 * - Query length validation (max 200 chars)
 * - SQL injection prevention
 * - XSS prevention
 * - Input sanitization
 */

export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  errors: string[];
}

export interface ValidationConfig {
  maxLength: number;
  minLength: number;
  allowedCharacters: RegExp;
  blockedPatterns: RegExp[];
}

const DEFAULT_CONFIG: ValidationConfig = {
  maxLength: 200,
  minLength: 1,
  // Allow letters, numbers, spaces, hyphens, parentheses, and common punctuation
  allowedCharacters: /^[a-zA-Z0-9\s\-().,áéíóúñÁÉÍÓÚÑ]+$/,
  blockedPatterns: [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(-{2}|\/\*|\*\/|;|'|"|`)/g, // SQL comment and quote characters
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    
    // Path traversal
    /\.\.[\/\\]/g,
    
    // Command injection
    /[;&|`$(){}[\]]/g,
  ],
};

export class InputValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate and sanitize search query
   */
  validateQuery(query: string): ValidationResult {
    const errors: string[] = [];

    // Check if query exists
    if (!query || typeof query !== 'string') {
      return {
        valid: false,
        errors: ['Query is required and must be a string'],
      };
    }

    // Trim whitespace
    let sanitized = query.trim();

    // Check length
    if (sanitized.length < this.config.minLength) {
      errors.push(`Query must be at least ${this.config.minLength} character(s)`);
    }

    if (sanitized.length > this.config.maxLength) {
      errors.push(`Query must not exceed ${this.config.maxLength} characters`);
      sanitized = sanitized.substring(0, this.config.maxLength);
    }

    // Check for blocked patterns (SQL injection, XSS, etc.)
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Query contains invalid or potentially dangerous characters');
        // Remove the dangerous pattern
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Check if anything remains after sanitization
    if (sanitized.length === 0) {
      errors.push('Query is empty after sanitization');
    }

    return {
      valid: errors.length === 0,
      sanitized: errors.length === 0 ? sanitized : undefined,
      errors,
    };
  }

  /**
   * Sanitize string for safe output
   */
  sanitizeOutput(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate language parameter
   */
  validateLanguage(language?: string): ValidationResult {
    const allowedLanguages = ['en', 'es', 'pt'];
    
    if (!language) {
      return {
        valid: true,
        sanitized: 'en', // Default to English
        errors: [],
      };
    }

    if (typeof language !== 'string') {
      return {
        valid: false,
        errors: ['Language must be a string'],
      };
    }

    const sanitized = language.toLowerCase().trim();

    if (!allowedLanguages.includes(sanitized)) {
      return {
        valid: false,
        errors: [`Language must be one of: ${allowedLanguages.join(', ')}`],
      };
    }

    return {
      valid: true,
      sanitized,
      errors: [],
    };
  }

  /**
   * Validate IP address format
   */
  validateIP(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    if (ipv4Pattern.test(ip)) {
      // Validate each octet is 0-255
      const octets = ip.split('.');
      return octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    return ipv6Pattern.test(ip);
  }

  /**
   * Extract and validate IP from request headers
   */
  extractIP(headers: Record<string, string | string[] | undefined>): string | null {
    // Check common headers for client IP
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'x-client-ip',
      'x-cluster-client-ip',
    ];

    for (const header of ipHeaders) {
      const value = headers[header];
      if (value) {
        const ip = Array.isArray(value) ? value[0] : value;
        // x-forwarded-for can contain multiple IPs, take the first one
        const firstIP = ip.split(',')[0].trim();
        if (this.validateIP(firstIP)) {
          return firstIP;
        }
      }
    }

    return null;
  }

  /**
   * Validate request origin for CORS
   */
  validateOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
    if (!origin) {
      return false;
    }

    // Allow exact matches
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Allow wildcard patterns
    for (const allowed of allowedOrigins) {
      if (allowed === '*') {
        return true;
      }

      // Convert wildcard pattern to regex
      if (allowed.includes('*')) {
        const pattern = new RegExp(
          '^' + allowed.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
        );
        if (pattern.test(origin)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate CORS headers
   */
  getCORSHeaders(origin: string | undefined, allowedOrigins: string[]): Record<string, string> {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400', // 24 hours
    };

    if (this.validateOrigin(origin, allowedOrigins)) {
      headers['Access-Control-Allow-Origin'] = origin || '*';
      headers['Access-Control-Allow-Credentials'] = 'true';
    } else {
      // Fallback to wildcard for public API
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Credentials'] = 'false';
    }

    return headers;
  }

  /**
   * Validate request signature (for authenticated requests)
   */
  validateSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    if (!payload || !signature || !secret) {
      return false;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Generate request signature
   */
  generateSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Create input validator instance
 */
export function createInputValidator(
  config?: Partial<ValidationConfig>
): InputValidator {
  return new InputValidator(config);
}

/**
 * Middleware-style validator for Next.js API routes
 */
export function validateRequest(
  query: string,
  language?: string
): { query: string; language: string } {
  const validator = createInputValidator();

  // Validate query
  const queryResult = validator.validateQuery(query);
  if (!queryResult.valid) {
    throw new ValidationError(
      'Invalid query parameter',
      queryResult.errors
    );
  }

  // Validate language
  const languageResult = validator.validateLanguage(language);
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
