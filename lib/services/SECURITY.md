# Security Implementation

This document describes the security measures implemented for the Intelligent Supplement Search system.

## Overview

The system implements multiple layers of security:

1. **API Gateway Rate Limiting** - AWS-managed rate limiting at the edge
2. **WAF Protection** - Web Application Firewall rules for common attacks
3. **Application-Level Rate Limiting** - Redis-backed distributed rate limiting
4. **Input Validation** - Comprehensive input sanitization and validation
5. **CORS Configuration** - Proper cross-origin resource sharing setup
6. **Request Signing** - Optional HMAC-based request authentication

## Rate Limiting

### API Gateway Level

Configured in `infrastructure/api-gateway-config.yml`:

- **Per-IP Limit**: 100 requests per minute
- **Burst Limit**: 200 requests
- **Daily Quota**: 86,400 requests per day

### Application Level

Implemented in `lib/services/rate-limiter.ts`:

```typescript
// Per-IP rate limiting
const rateLimit = await rateLimiter.checkIPRateLimit(ip);

// Per-user rate limiting
const userLimit = await rateLimiter.checkUserRateLimit(userId);

// PubMed API rate limiting with exponential backoff
await rateLimiter.withBackoff(async () => {
  return await fetchFromPubMed(query);
}, 'PubMed API call');
```

**Configuration**:
- Per-IP: 100 requests/minute
- Per-User: 1000 requests/day
- PubMed: 3 requests/second with exponential backoff

## WAF Rules

Configured in `infrastructure/api-gateway-config.yml`:

### 1. Rate Limiting
- Blocks IPs exceeding 100 requests/minute
- Returns 429 status code

### 2. SQL Injection Protection
- Detects common SQL injection patterns
- Blocks requests with SQL keywords in query strings
- Returns 403 status code

### 3. XSS Protection
- Detects cross-site scripting attempts
- Blocks requests with script tags or event handlers
- Returns 403 status code

### 4. Size Constraint
- Limits request body to 10KB
- Returns 413 status code for oversized requests

### 5. Geographic Blocking
- Tracks requests from different countries
- Can be configured to block specific regions

## Input Validation

Implemented in `lib/services/input-validator.ts`:

### Query Validation

```typescript
const validator = createInputValidator();
const result = validator.validateQuery(userInput);

if (!result.valid) {
  throw new ValidationError('Invalid query', result.errors);
}

const sanitizedQuery = result.sanitized;
```

**Rules**:
- Minimum length: 1 character
- Maximum length: 200 characters
- Allowed characters: letters, numbers, spaces, hyphens, parentheses
- Blocked patterns:
  - SQL keywords (SELECT, INSERT, UPDATE, DELETE, etc.)
  - SQL special characters (quotes, semicolons, comments)
  - XSS patterns (script tags, event handlers)
  - Path traversal (../)
  - Command injection characters

### Language Validation

```typescript
const languageResult = validator.validateLanguage(language);
// Allowed: 'en', 'es', 'pt'
// Default: 'en'
```

### IP Validation

```typescript
const isValid = validator.validateIP(ipAddress);
// Validates IPv4 and IPv6 formats
```

## CORS Configuration

Implemented in `lib/services/input-validator.ts`:

```typescript
const corsHeaders = validator.getCORSHeaders(origin, allowedOrigins);
// Returns appropriate CORS headers based on origin
```

**Configuration**:
- Allowed Methods: GET, POST, OPTIONS
- Allowed Headers: Content-Type, Authorization, X-API-Key
- Max Age: 24 hours
- Credentials: Configurable based on origin

## Request Signing

Optional HMAC-SHA256 based request authentication:

```typescript
// Generate signature
const signature = validator.generateSignature(payload, secret);

// Verify signature
const isValid = validator.validateSignature(payload, signature, secret);
```

**Usage**:
1. Client generates HMAC-SHA256 signature of request payload
2. Client sends signature in `X-Signature` header
3. Server verifies signature using shared secret
4. Prevents request tampering and replay attacks

## Security Middleware

Integrated middleware for Next.js API routes:

```typescript
import { withSecurity } from '@/lib/services/security-middleware';
import { createRedisClient } from '@/lib/cache/redis-cache';

const redis = createRedisClient();

export const POST = withSecurity(
  async (request) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  },
  redis,
  {
    rateLimiting: { enabled: true },
    validation: { enabled: true },
    cors: { enabled: true, allowedOrigins: ['*'] },
  }
);
```

## Deployment

### Deploy API Gateway with WAF

```bash
cd infrastructure
./deploy-api-gateway.sh production
```

This will:
1. Create API Gateway with rate limiting
2. Configure WAF rules
3. Set up CloudWatch alarms
4. Generate API key for authenticated access

### Environment Variables

Required environment variables:

```bash
# Redis for rate limiting
REDIS_URL=redis://localhost:6379

# API Gateway
API_GATEWAY_URL=https://api.example.com

# Request signing (optional)
REQUEST_SIGNING_SECRET=your-secret-key
```

## Monitoring

### CloudWatch Metrics

- `RateLimitPerIP` - Rate limit violations per IP
- `SQLInjectionProtection` - SQL injection attempts blocked
- `XSSProtection` - XSS attempts blocked
- `SizeConstraint` - Oversized requests blocked

### CloudWatch Alarms

Configured in `infrastructure/api-gateway-config.yml`:

- **Rate Limit Violations**: Alert when > 10 violations in 5 minutes
- **WAF Blocks**: Alert on unusual blocking patterns

### Logs

- API Gateway logs: `/aws/apigateway/{environment}-supplement-search`
- Application logs: Include rate limit status and validation errors

## Testing

### Test Rate Limiting

```bash
# Test per-IP rate limit
for i in {1..150}; do
  curl -X POST https://api.example.com/search \
    -H 'Content-Type: application/json' \
    -d '{"query": "vitamin d"}'
done
```

Expected: First 100 requests succeed, remaining return 429

### Test Input Validation

```bash
# Test SQL injection protection
curl -X POST https://api.example.com/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "vitamin d; DROP TABLE supplements;"}'
```

Expected: 400 Bad Request with validation error

### Test WAF Rules

```bash
# Test XSS protection
curl -X POST https://api.example.com/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "<script>alert(1)</script>"}'
```

Expected: 403 Forbidden from WAF

## Best Practices

1. **Always validate input** - Never trust user input
2. **Use parameterized queries** - Prevent SQL injection
3. **Sanitize output** - Prevent XSS attacks
4. **Rate limit aggressively** - Protect against abuse
5. **Monitor continuously** - Watch for unusual patterns
6. **Update regularly** - Keep WAF rules current
7. **Test thoroughly** - Verify security measures work

## Security Checklist

- [x] API Gateway rate limiting configured
- [x] WAF rules deployed
- [x] Application-level rate limiting implemented
- [x] Input validation and sanitization
- [x] SQL injection protection
- [x] XSS protection
- [x] CORS configuration
- [x] Request signing (optional)
- [x] CloudWatch monitoring
- [x] Security logging
- [x] Error handling without information leakage

## Incident Response

If a security incident is detected:

1. **Identify** - Check CloudWatch logs and metrics
2. **Contain** - Block offending IPs via WAF
3. **Investigate** - Review logs for attack patterns
4. **Remediate** - Update WAF rules if needed
5. **Document** - Record incident details
6. **Review** - Update security measures

## Contact

For security concerns or to report vulnerabilities, contact the security team.
