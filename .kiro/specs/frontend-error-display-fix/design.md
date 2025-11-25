# Design Document

## Overview

This design addresses a critical frontend issue where the Results Page displays error messages even when the backend API successfully returns valid supplement recommendation data. The root cause is a combination of stale browser cache, incorrect React state management, and improper error handling logic.

The solution involves:
1. Adding comprehensive logging to trace data flow
2. Fixing the conditional rendering logic in the Results Page
3. Improving cache validation and invalidation
4. Ensuring proper state transitions from loading → loaded → rendered

## Architecture

### Current Flow (Broken)
```
User Search → API Call → Response (200 OK with data) → ??? → ErrorState Displayed ❌
```

### Fixed Flow
```
User Search → API Call → Response (200 OK with data) → State Update → Recommendation Displayed ✅
```

### Component Hierarchy
```
ResultsPageContent (app/portal/results/page.tsx)
├── IntelligentLoadingSpinner (while isLoading === true)
├── ErrorState (when error !== null OR recommendation === null)
└── Recommendation Display (when recommendation !== null AND error === null)
    ├── EvidenceAnalysisPanelNew
    ├── ProductRecommendationsGrid
    └── ShareReferralCard
```

## Components and Interfaces

### 1. Results Page State Management

**Current State Variables:**
```typescript
const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**Problem:** The conditional rendering logic shows ErrorState when `error || !recommendation`, but this condition is true even when data is loading or when the state hasn't updated yet.

**Solution:** Add explicit state tracking and ensure proper state transitions:

```typescript
// Add debug logging for state changes
useEffect(() => {
  console.log('[ResultsPage] State changed:', {
    hasRecommendation: !!recommendation,
    isLoading,
    hasError: !!error,
    recommendationId: recommendation?.recommendation_id,
  });
}, [recommendation, isLoading, error]);
```

### 2. API Response Handling

**Current Issue:** The fetch logic sets `setRecommendation(data.recommendation)` but may not be triggering a re-render, or the error state is not being cleared.

**Solution:** Ensure atomic state updates:

```typescript
// When API returns success
if (data.success && data.recommendation) {
  console.log('✅ Setting recommendation state:', {
    id: data.recommendation.recommendation_id,
    category: data.recommendation.category,
  });
  
  // Clear error first, then set recommendation
  setError(null);
  setRecommendation(data.recommendation);
  setIsLoading(false);
}
```

### 3. Cache Validation

**Current Issue:** The cache validation logic checks for "fake data" but may be too aggressive, invalidating valid cached data.

**Solution:** Improve cache validation logic:

```typescript
// Validate cache data
const isValidCache = (cachedRecommendation: any): boolean => {
  if (!cachedRecommendation) return false;
  
  const metadata = cachedRecommendation._enrichment_metadata || {};
  const totalStudies = cachedRecommendation.evidence_summary?.totalStudies || 0;
  const studiesUsed = metadata.studiesUsed || 0;
  
  // Valid if either totalStudies > 0 OR studiesUsed > 0
  const hasRealData = totalStudies > 0 || studiesUsed > 0;
  
  console.log('[Cache Validation]', {
    hasRealData,
    totalStudies,
    studiesUsed,
    category: cachedRecommendation.category,
  });
  
  return hasRealData;
};
```

### 4. Conditional Rendering Logic

**Current Issue:** The render logic shows ErrorState when `error || !recommendation`, which is too broad.

**Solution:** Make the conditional rendering more explicit:

```typescript
// Show loading state
if (isLoading) {
  return <IntelligentLoadingSpinner supplementName={query || undefined} />;
}

// Show error state ONLY if there's an actual error
if (error) {
  return <ErrorState error={error} ... />;
}

// Show error state if no recommendation after loading completes
if (!recommendation) {
  return <ErrorState error="No recommendation data available" ... />;
}

// Show recommendation
return <div>...</div>;
```

## Data Models

### Recommendation Interface
```typescript
interface Recommendation {
  recommendation_id: string;
  quiz_id: string;
  category: string;
  evidence_summary: {
    totalStudies: number;
    totalParticipants: number;
    efficacyPercentage: number;
    researchSpanYears: number;
    ingredients: Array<{
      name: string;
      grade: 'A' | 'B' | 'C';
      studyCount: number;
      rctCount: number;
    }>;
  };
  supplement: {
    name: string;
    description: string;
    dosage: any;
    worksFor: any[];
    doesntWorkFor: any[];
    limitedEvidence: any[];
    sideEffects: any[];
    contraindications: string[];
    interactions: any[];
  };
  products: any[];
  _enrichment_metadata: {
    hasRealData: boolean;
    studiesUsed: number;
    intelligentSystem: boolean;
    fallback: boolean;
    source: string;
    version: string;
    timestamp: string;
  };
}
```

### Cache Data Structure
```typescript
interface CacheData {
  recommendation: Recommendation;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid data displays recommendation
*For any* valid recommendation object returned by the API, the system should render the recommendation display and NOT render the ErrorState component.
**Validates: Requirements 1.1, 1.2, 2.1**

### Property 2: Study data is displayed
*For any* recommendation with study data (totalStudies > 0), the rendered output should contain the study count and participant count.
**Validates: Requirements 1.3**

### Property 3: Complete recommendation sections render
*For any* recommendation with benefits, dosage, and side effects data, all three sections should be present in the rendered output.
**Validates: Requirements 1.4**

### Property 4: Cache retrieval works correctly
*For any* valid cached recommendation that hasn't expired, loading the page should display the cached recommendation without making an API call.
**Validates: Requirements 1.5**

### Property 5: Loading state transitions correctly
*For any* API call, the system should transition from isLoading=true to isLoading=false when the response is received, and the loading spinner should be hidden.
**Validates: Requirements 2.4, 2.5**

### Property 6: State changes trigger re-renders
*For any* state update (recommendation, isLoading, error), React should trigger a re-render of the component with the updated state.
**Validates: Requirements 3.5**

### Property 7: Empty cache triggers API call
*For any* page load with empty localStorage, the system should make an API call to fetch fresh data.
**Validates: Requirements 4.1**

### Property 8: Invalid cache is removed
*For any* cached data that fails validation (expired, malformed, or inconsistent), the system should remove it from localStorage and fetch fresh data.
**Validates: Requirements 4.2, 4.3**

### Property 9: Fresh data is cached
*For any* successful API response with valid data, the system should store the recommendation in localStorage with a timestamp and TTL.
**Validates: Requirements 4.4**

### Property 10: Cache validation runs on load
*For any* page load with cached data, the system should validate the cache before using it.
**Validates: Requirements 4.5**

## Error Handling

### Error Categories

1. **Network Errors**: Connection failures, timeouts
   - Display: "Error de conexión. Por favor, verifica tu internet."
   - Action: Retry button

2. **API Errors**: 404 (insufficient data), 500 (server error)
   - Display: Specific error message from API
   - Action: Retry or new search

3. **State Errors**: Missing data after successful API call
   - Display: "Error inesperado. Por favor, intenta de nuevo."
   - Action: Reload page

4. **Cache Errors**: Invalid or corrupted cache data
   - Action: Clear cache silently and fetch fresh data
   - No user-facing error

### Error Recovery

```typescript
// Automatic retry with exponential backoff
const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      
      // Don't retry on 404 (insufficient data)
      if (response.status === 404) throw new Error('Insufficient data');
      
      // Retry on 5xx errors
      if (response.status >= 500 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};
```

## Testing Strategy

### Unit Tests

1. **State Management Tests**
   - Test that setting recommendation state clears error state
   - Test that setting error state clears recommendation state
   - Test that isLoading transitions correctly

2. **Cache Validation Tests**
   - Test validation with valid cache data
   - Test validation with expired cache data
   - Test validation with malformed cache data
   - Test validation with inconsistent cache data (fake studies)

3. **Conditional Rendering Tests**
   - Test that loading state shows spinner
   - Test that error state shows ErrorState component
   - Test that valid recommendation shows recommendation display
   - Test that no recommendation after loading shows error

### Property-Based Tests

We will use **fast-check** (JavaScript/TypeScript property-based testing library) for property-based testing.

Each property test should:
- Run at least 100 iterations
- Generate random valid and invalid inputs
- Verify the property holds for all inputs
- Be tagged with the property number from this design doc

Example property test structure:
```typescript
import fc from 'fast-check';

// **Feature: frontend-error-display-fix, Property 1: Valid data displays recommendation**
test('Property 1: Valid data displays recommendation', () => {
  fc.assert(
    fc.property(
      recommendationArbitrary, // Generator for valid recommendations
      (recommendation) => {
        // Render component with recommendation
        const { container } = render(<ResultsPage recommendation={recommendation} />);
        
        // Should NOT contain ErrorState
        expect(container.querySelector('[data-testid="error-state"]')).toBeNull();
        
        // Should contain recommendation display
        expect(container.querySelector('[data-testid="recommendation-display"]')).not.toBeNull();
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

1. **End-to-End Flow**
   - Test complete flow from search to recommendation display
   - Test cache hit scenario
   - Test cache miss scenario
   - Test error recovery

2. **API Integration**
   - Test with real API responses (mocked)
   - Test with various response formats
   - Test with error responses

## Implementation Notes

### Debugging Steps

1. Add comprehensive console logging at each state transition
2. Log API responses before setting state
3. Log render conditions (why ErrorState vs Recommendation)
4. Use React DevTools to inspect state in real-time

### Browser Cache Clearing

Users experiencing this issue should:
1. Clear browser cache (Cmd+Shift+Delete on Mac, Ctrl+Shift+Delete on Windows)
2. Clear localStorage for the site
3. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### Deployment Strategy

1. Deploy fix to staging environment
2. Test with various supplements (ashwagandha, omega-3, vitamin d, magnesium)
3. Verify no regressions in error handling
4. Deploy to production
5. Monitor error rates and user feedback

## Performance Considerations

- Cache validation should be fast (<10ms)
- State updates should be batched when possible
- Avoid unnecessary re-renders by using React.memo for child components
- Use useCallback for event handlers to prevent re-renders

## Security Considerations

- Validate all data from localStorage before using it
- Sanitize error messages before displaying to users
- Don't expose internal error details in production
- Rate limit API calls to prevent abuse
