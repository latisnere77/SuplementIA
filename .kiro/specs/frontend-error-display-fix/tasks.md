# Implementation Plan: Frontend Error Display Fix

- [x] 1. Enhance Job Store with Lifecycle Management
  - Update Job interface to include expiration timestamps, lastAccessedAt, and retryCount
  - Implement expiration time calculation based on job status (processing: 2min, completed: 5min, failed: 2min)
  - Add isExpired() method to check if a job has exceeded its expiration time
  - Add getJobAge() method to calculate time since job creation
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 1.1 Write property test for job timestamp assignment
  - **Property 20: Jobs have creation and expiration timestamps**
  - **Validates: Requirements 6.1**

- [x] 1.2 Write property test for completed job retention
  - **Property 21: Completed jobs retained for 5 minutes**
  - **Validates: Requirements 6.2**

- [x] 1.3 Write property test for failed job retention
  - **Property 22: Failed jobs retained for 2 minutes**
  - **Validates: Requirements 6.3**

- [x] 2. Implement Store Size Management and LRU Eviction
  - Add MAX_STORE_SIZE constant (1000 jobs)
  - Update lastAccessedAt on every getJob() call
  - Implement enforceSizeLimit() method that removes oldest jobs when size > MAX_STORE_SIZE
  - Implement getOldestJob() method to find least recently accessed job
  - _Requirements: 6.5_

- [x] 2.1 Write property test for LRU eviction
  - **Property 24: Store evicts oldest jobs when full**
  - **Validates: Requirements 6.5**

- [x] 3. Improve Cleanup Logic
  - Update cleanupExpired() to remove all jobs where isExpired() returns true
  - Return count of removed jobs for metrics
  - Call cleanupExpired() before enforceSizeLimit() to prioritize expired jobs
  - _Requirements: 6.4_

- [x] 3.1 Write property test for cleanup
  - **Property 23: Cleanup removes expired jobs**
  - **Validates: Requirements 6.4**

- [x] 4. Add Error Response Templates
  - Create ERROR_MESSAGES constant with templates for all error types
  - Implement formatErrorResponse() function that takes error type and returns structured response
  - Include user-friendly messages in Spanish
  - Add actionable suggestions for each error type
  - Sanitize sensitive data from error responses (API keys, internal paths)
  - _Requirements: 1.2, 1.3, 1.5, 4.4, 5.1, 5.2_

- [x] 4.1 Write property test for sensitive data sanitization
  - **Property 5: 500 errors include debug info without sensitive data**
  - **Validates: Requirements 1.5**

- [x] 4.2 Write property test for validation error responses
  - **Property 18: Validation failures return 400**
  - **Validates: Requirements 4.4**

- [x] 5. Update Enrichment Status Endpoint with Proper Status Codes
  - Add correlation ID extraction from X-Correlation-ID header
  - Check if job is expired using isExpired() and return 410 Gone with appropriate message
  - Distinguish between job never existed (404) vs expired (410)
  - Remove direct fetch fallback (will be handled by frontend retry)
  - Return 202 Accepted for processing jobs with elapsedTime
  - Return 200 OK for completed jobs with processingTime
  - Return 500 for failed jobs with formatted error response
  - Add structured logging for all error cases
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 3.1, 3.2, 3.4_

- [x] 5.1 Write property test for expired job responses
  - **Property 2: Expired jobs return 410 Gone**
  - **Validates: Requirements 1.2**

- [x] 5.2 Write property test for error logging
  - **Property 10: Error logging includes required fields**
  - **Validates: Requirements 3.1**

- [x] 5.3 Write property test for missing job time logging
  - **Property 11: Missing job logs time delta**
  - **Validates: Requirements 3.2**

- [x] 5.4 Write property test for correlation ID presence
  - **Property 13: Polling requests include correlation ID**
  - **Validates: Requirements 3.4**

- [x] 6. Add Timeout Handling to Recommend Endpoint
  - Update async job creation to set status='timeout' after 2 minutes
  - Implement markTimeout() method in job store
  - Clean up timed-out jobs from store
  - Return 408 Request Timeout with retry suggestion
  - Log timeout events with job details
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 6.1 Write property test for async timeout
  - **Property 7: Async jobs timeout at 2 minutes**
  - **Validates: Requirements 2.3**

- [x] 6.2 Write property test for timeout cleanup
  - **Property 8: Timeout triggers cleanup**
  - **Validates: Requirements 2.4**

- [x] 7. Implement Input Validation and Sanitization
  - Add validateSupplementName() function to check for empty/whitespace-only names
  - Update sanitizeQuery() to handle special characters correctly
  - Add verifyNormalization() function to check normalization success
  - Add detectProblematicQuery() function to identify edge cases
  - Return 400 Bad Request for validation failures with descriptive messages
  - Log warnings for problematic queries
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.1 Write property test for empty name validation
  - **Property 15: Empty supplement names are rejected**
  - **Validates: Requirements 4.1**

- [x] 7.2 Write property test for special character sanitization
  - **Property 17: Special characters are sanitized**
  - **Validates: Requirements 4.3**

- [x] 7.3 Write property test for normalization verification
  - **Property 16: Normalization success is verified**
  - **Validates: Requirements 4.2**

- [x] 7.4 Write property test for problematic query warnings
  - **Property 19: Problematic queries log warnings**
  - **Validates: Requirements 4.5**

- [x] 8. Add Frontend Polling Limits and Exponential Backoff
  - Add MAX_RETRY_ATTEMPTS constant (3 attempts)
  - Track retry count in component state
  - Stop polling after 3 consecutive failures
  - Implement exponential backoff (2s, 4s, 8s)
  - Generate and include X-Correlation-ID header in all polling requests
  - Display appropriate error messages based on status code
  - Show retry button for 408 Timeout errors
  - Show "contact support" message after 3 failures
  - _Requirements: 1.4, 2.2, 3.4, 5.3, 5.4_

- [x] 8.1 Write property test for polling stop after failures
  - **Property 4: Polling stops after 3 failures**
  - **Validates: Requirements 1.4**

- [x] 9. Implement Retry Logic with New Job IDs
  - Update retry handler to generate new job ID for each retry attempt
  - Clear previous job state before retry
  - Track retry count in job metadata
  - Return 429 Too Many Requests if retry count > 5
  - _Requirements: 2.5_

- [x] 9.1 Write property test for retry job ID generation
  - **Property 9: Retry creates new job ID**
  - **Validates: Requirements 2.5**

- [x] 10. Add Structured Logging with Correlation IDs
  - Create structured log format with timestamp, level, event, jobId, correlationId, requestId
  - Update all console.log calls to use structured format
  - Add log levels (error, warn, info, debug)
  - Implement logEnrichmentError() function with all required fields
  - Implement logDirectFetchFailure() function with complete response
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10.1 Write property test for direct fetch failure logging
  - **Property 12: Direct fetch failure logs complete response**
  - **Validates: Requirements 3.3**

- [x] 11. Implement Failure Pattern Detection and Alerting
  - Track failure count per supplement in a time window (1 minute)
  - Detect patterns of repeated failures (>5 in 1 minute)
  - Generate alert when pattern is detected
  - Log alert with supplement name, failure count, and time window
  - Reset failure count after time window expires
  - _Requirements: 3.5_

- [x] 11.1 Write property test for repeated failure alerts
  - **Property 14: Repeated failures trigger alerts**
  - **Validates: Requirements 3.5**

- [x] 12. Add Metrics Collection
  - Implement metrics tracking for jobs created, completed, failed, timed out
  - Track store size, cleanup operations, evictions
  - Track error rates by status code
  - Track endpoint latency (p50, p95, p99)
  - Export metrics in structured format for monitoring dashboard
  - _Requirements: Non-functional (Observability)_

- [x] 13. Update Frontend Error Display Components
  - Create ErrorMessage component with different styles for 4xx vs 5xx errors
  - Display user-friendly messages from error responses
  - Show actionable suggestions
  - Add retry button for 408 Timeout errors
  - Add "contact support" link for repeated failures
  - Clear error messages on successful retry
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integration Testing
  - Write end-to-end test for successful polling flow (create → poll → complete)
  - Write end-to-end test for timeout flow (create → poll → timeout → verify 408)
  - Write end-to-end test for expiration flow (create → wait → poll → verify 410)
  - Write end-to-end test for retry flow (timeout → retry with new ID → success)
  - Write test for concurrent job processing
  - Write test for store cleanup during active polling
  - _Requirements: All_

- [x] 16. Performance Testing
  - Load test with 100 concurrent jobs
  - Verify endpoint latency < 100ms (p95)
  - Verify cleanup duration < 10ms
  - Verify eviction duration < 5ms
  - Verify memory usage < 2MB for job store
  - _Requirements: Non-functional (Performance)_

- [x] 17. Documentation and Deployment
  - Update API documentation with new status codes and error responses
  - Create runbook for monitoring and troubleshooting
  - Configure alerts in monitoring system
  - Deploy to staging environment
  - Run smoke tests in staging
  - Monitor for issues
  - Gradual rollout to production (10% → 50% → 100%)
  - _Requirements: All_
