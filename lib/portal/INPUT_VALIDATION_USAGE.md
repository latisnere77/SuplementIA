# Input Validation and Sanitization Usage Guide

This document describes how to use the input validation functions implemented for the frontend-error-display-fix spec.

## Overview

The `input-validation.ts` module provides comprehensive validation and sanitization for supplement queries, implementing Requirements 4.1-4.5 from the spec.

## Functions

### 1. `validateSupplementName(name: string): ValidationResult`

Validates that a supplement name is not empty or whitespace-only.

**Validates: Requirement 4.1**

```typescript
import { validateSupplementName } from '@/lib/portal/input-validation';

const result = validateSupplementName('magnesium');
if (!result.valid) {
  console.error(result.error);
  console.log(result.suggestion);
}
```

**Returns:**
- `valid: boolean` - Whether the name is valid
- `error?: string` - Error message if invalid
- `suggestion?: string` - Suggestion for fixing the error

**Validation Rules:**
- Name must not be null, undefined, or non-string
- Name must not be empty or only whitespace
- Name must be at least 2 characters long

### 2. `sanitizeQuery(query: string): string`

Sanitizes a query by removing dangerous characters and normalizing whitespace.

**Validates: Requirement 4.3**

```typescript
import { sanitizeQuery } from '@/lib/portal/input-validation';

const sanitized = sanitizeQuery('  <script>magnesium</script>  ');
// Returns: "magnesium"
```

**Sanitization Rules:**
- Removes `<` and `>` characters
- Removes control characters (ASCII 0-31, 127)
- Normalizes multiple spaces to single space
- Trims leading and trailing whitespace
- Limits length to 100 characters

### 3. `verifyNormalization(normalized: NormalizedQuery): ValidationResult`

Verifies that query normalization was successful.

**Validates: Requirement 4.2**

```typescript
import { verifyNormalization } from '@/lib/portal/input-validation';
import { normalizeQuery } from '@/lib/portal/query-normalization';

const normalized = normalizeQuery('magnesio');
const result = verifyNormalization(normalized);
if (!result.valid) {
  console.error(result.error);
}
```

**Validation Rules:**
- Normalized name must not be empty
- Confidence must be >= 0.3 (or exactly 0 for unknown supplements)
- Normalization result must be valid

### 4. `detectProblematicQuery(query: string)`

Detects potentially problematic queries that might cause issues.

**Validates: Requirement 4.5**

```typescript
import { detectProblematicQuery } from '@/lib/portal/input-validation';

const result = detectProblematicQuery('SELECT * FROM users');
if (result.isProblematic) {
  console.warn(`Problematic query: ${result.reason} (severity: ${result.severity})`);
}
```

**Returns:**
- `isProblematic: boolean` - Whether the query is problematic
- `reason?: string` - Reason why it's problematic
- `severity: 'low' | 'medium' | 'high'` - Severity level

**Detection Rules:**
- Queries exceeding 100 characters (medium)
- SQL injection patterns (high)
- Script injection patterns (high)
- Excessive special characters (>30% ratio) (high)
- Only numbers (medium)
- Repeated characters (6+ times) (high)
- Unusual characters (low)

### 5. `validateAndSanitizeQuery(query: string)` (Comprehensive)

Combines all validation and sanitization steps into one function.

**Validates: Requirements 4.1-4.5**

```typescript
import { validateAndSanitizeQuery } from '@/lib/portal/input-validation';

const result = validateAndSanitizeQuery('  magnesium  ');
if (!result.valid) {
  return NextResponse.json(
    {
      success: false,
      error: result.error,
      suggestion: result.suggestion,
    },
    { status: result.statusCode } // 400 for validation failures
  );
}

// Use result.sanitized and result.normalized
const sanitized = result.sanitized;
const normalized = result.normalized;
```

**Returns:**
- `valid: boolean` - Whether the query is valid
- `sanitized?: string` - Sanitized query
- `normalized?: NormalizedQuery` - Normalized query
- `error?: string` - Error message if invalid
- `suggestion?: string` - Suggestion for fixing
- `statusCode?: number` - HTTP status code (400 for validation failures)
- `problematic?: object` - Information about problematic patterns

## Integration Example

Here's how to integrate these functions into an API endpoint:

```typescript
import { validateAndSanitizeQuery } from '@/lib/portal/input-validation';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { category } = body;

  // Validate and sanitize
  const validation = validateAndSanitizeQuery(category);
  
  if (!validation.valid) {
    // Log warning if problematic
    if (validation.problematic?.isProblematic) {
      console.warn(
        JSON.stringify({
          event: 'PROBLEMATIC_QUERY',
          query: category,
          reason: validation.problematic.reason,
          severity: validation.problematic.severity,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: validation.error,
        suggestion: validation.suggestion,
      },
      { status: validation.statusCode }
    );
  }

  // Use sanitized and normalized values
  const sanitized = validation.sanitized!;
  const normalized = validation.normalized!;

  // Continue with enrichment...
}
```

## Property-Based Tests

All validation functions are tested with property-based tests using fast-check:

- **Property 15**: Empty supplement names are rejected (100 iterations)
- **Property 16**: Normalization success is verified (100 iterations)
- **Property 17**: Special characters are sanitized (100 iterations)
- **Property 18**: Validation failures return 400 (100 iterations)
- **Property 19**: Problematic queries log warnings (100 iterations)

Run tests with:
```bash
npm test -- lib/portal/input-validation.test.ts
```

## Error Messages

All error messages are in Spanish and user-friendly:

- Empty name: "El nombre del suplemento no puede estar vacío"
- Invalid characters: "El nombre del suplemento contiene solo caracteres inválidos"
- Normalization failed: "No pudimos identificar el suplemento con certeza"
- Too long: "El nombre del suplemento es demasiado largo"

## Logging

When problematic queries are detected, log them with structured format:

```typescript
if (validation.problematic?.isProblematic) {
  console.warn(
    JSON.stringify({
      event: 'PROBLEMATIC_QUERY_DETECTED',
      query: category,
      reason: validation.problematic.reason,
      severity: validation.problematic.severity,
      timestamp: new Date().toISOString(),
    })
  );
}
```

## Next Steps

To complete the integration:

1. Update `/api/portal/recommend/route.ts` to use `validateAndSanitizeQuery`
2. Update `/api/portal/enrichment-status/[id]/route.ts` to use validation
3. Add logging for problematic queries
4. Monitor validation failures in production
