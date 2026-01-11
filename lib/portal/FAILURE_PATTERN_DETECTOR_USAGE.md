# Failure Pattern Detector Usage Guide

## Overview

The Failure Pattern Detector module tracks failure patterns per supplement and generates alerts when repeated failures are detected. This helps identify systematic issues with specific supplements that may require investigation.

## Features

- **Automatic Failure Tracking**: Records failures per supplement with timestamps
- **Time Window Management**: Tracks failures within a 1-minute sliding window
- **Pattern Detection**: Identifies when a supplement exceeds the failure threshold (>5 failures in 1 minute)
- **Automatic Alerting**: Generates structured log alerts when patterns are detected
- **Automatic Cleanup**: Removes old failure records outside the time window

## Configuration

- **Time Window**: 60 seconds (1 minute)
- **Failure Threshold**: 5 failures
- **Alert Level**: Error

## API Reference

### `recordFailure(supplementName: string): void`

Records a failure for a specific supplement. Automatically:
- Adds the failure to the tracking system
- Cleans up old failures outside the time window
- Detects if the supplement has exceeded the failure threshold
- Generates an alert if threshold is exceeded

**Example:**
```typescript
import { recordFailure } from '@/lib/portal/failure-pattern-detector';

// Record a failure when enrichment fails
if (job.status === 'failed') {
  recordFailure(supplementName);
}
```

### `detectFailurePattern(supplementName: string, currentTime?: number): FailurePattern | undefined`

Detects if a failure pattern exists for a specific supplement within the time window.

**Returns:**
- `FailurePattern` object if failures exist
- `undefined` if no failures found

**Example:**
```typescript
import { detectFailurePattern } from '@/lib/portal/failure-pattern-detector';

const pattern = detectFailurePattern('Vitamin D');
if (pattern) {
  console.log(`Found ${pattern.failureCount} failures for ${pattern.supplementName}`);
}
```

### `getFailureCount(supplementName: string, currentTime?: number): number`

Gets the current failure count for a supplement within the time window.

**Example:**
```typescript
import { getFailureCount } from '@/lib/portal/failure-pattern-detector';

const count = getFailureCount('Vitamin D');
console.log(`Current failure count: ${count}`);
```

## Integration

### Enrichment Status Endpoint

The failure pattern detector is integrated into the enrichment status endpoint to automatically track failures:

```typescript
// In app/api/portal/enrichment-status/[id]/route.ts

if (job.status === 'failed') {
  // ... logging ...
  
  // Record failure for pattern detection
  if (supplement) {
    recordFailure(supplement);
  }
  
  // ... return error response ...
}

if (job.status === 'timeout') {
  // ... logging ...
  
  // Record failure for pattern detection
  if (supplement) {
    recordFailure(supplement);
  }
  
  // ... return error response ...
}
```

## Alert Format

When a failure pattern is detected (>5 failures in 1 minute), an alert is logged with the following structure:

```json
{
  "timestamp": "2025-11-25T10:30:00.000Z",
  "level": "error",
  "event": "REPEATED_FAILURE_ALERT",
  "supplementName": "Vitamin D",
  "failureCount": 6,
  "timeWindowSeconds": 60,
  "firstFailureAt": "2025-11-25T10:29:00.000Z",
  "lastFailureAt": "2025-11-25T10:30:00.000Z",
  "threshold": 5,
  "message": "Detected 6 failures for \"Vitamin D\" in 60 seconds (threshold: 5)"
}
```

## Monitoring

### What to Monitor

1. **REPEATED_FAILURE_ALERT events**: Indicates systematic issues with specific supplements
2. **Failure counts per supplement**: Track which supplements fail most frequently
3. **Alert frequency**: High alert frequency may indicate broader system issues

### Recommended Actions

When an alert is triggered:

1. **Investigate the supplement**: Check if there's an issue with the supplement data or normalization
2. **Review recent changes**: Check if recent code changes affected this supplement
3. **Check external dependencies**: Verify PubMed API, LLM services, and other dependencies
4. **Review logs**: Look for patterns in error messages for this supplement

## Testing

The module includes comprehensive property-based tests:

```bash
npm test -- lib/portal/failure-pattern-detector.test.ts
```

Tests verify:
- Alerts are generated when threshold is exceeded
- No alerts when failures are below threshold
- Failures are tracked separately per supplement
- Time window expiration works correctly
- Alert logs include all required fields

## Performance Considerations

- **Memory Usage**: Failure records are stored in-memory and automatically cleaned up
- **Cleanup Frequency**: Cleanup runs on every `recordFailure` call
- **Time Complexity**: O(n) where n is the number of failure records (typically small)
- **Space Complexity**: O(m) where m is the number of unique supplements with recent failures

## Future Enhancements

Potential improvements:

1. **Configurable thresholds**: Allow different thresholds per supplement or category
2. **Persistent storage**: Store failure patterns in database for historical analysis
3. **Notification system**: Send alerts to monitoring services (PagerDuty, Slack, etc.)
4. **Pattern analysis**: Identify time-of-day patterns or correlations between supplements
5. **Automatic remediation**: Trigger automatic retries or fallback strategies

## Related Modules

- **Structured Logger** (`lib/portal/structured-logger.ts`): Used for alert logging
- **Job Store** (`lib/portal/job-store.ts`): Tracks job status
- **Enrichment Status Endpoint** (`app/api/portal/enrichment-status/[id]/route.ts`): Integration point

## Troubleshooting

### Alerts not being generated

1. Verify `recordFailure` is being called for failed jobs
2. Check that supplement name is provided (not undefined)
3. Ensure failures are happening within the 1-minute window
4. Verify threshold is being exceeded (>5 failures)

### Too many alerts

1. Check if there's a systematic issue causing widespread failures
2. Review recent deployments or configuration changes
3. Consider increasing the threshold if current level is too sensitive
4. Investigate if the time window should be adjusted

### Memory concerns

The module automatically cleans up old records, but if you're concerned about memory:

1. Monitor the number of failure records using `getAllFailureRecords().length`
2. Consider implementing a maximum record limit
3. Review cleanup frequency and time window settings
