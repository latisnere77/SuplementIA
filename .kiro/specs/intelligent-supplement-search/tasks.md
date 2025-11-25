# Implementation Plan

- [x] 1. Setup infrastructure and database schema
  - Create RDS Postgres database with pgvector extension
  - Setup DynamoDB table for supplement cache
  - Setup DynamoDB DAX cluster for L1 cache (microsecond latency)
  - Setup ElastiCache Redis cluster for L2 cache
  - Configure CloudFront distribution
  - Setup Lambda@Edge for edge computing
  - Setup EFS for ML model storage
  - Create DynamoDB table for discovery queue
  - _Requirements: 4.1, 5.1_

- [x] 2. Implement vector search core
- [x] 2.1 Create RDS Postgres schema with pgvector
  - Write migration for supplements table with vector column
  - Create HNSW index for fast similarity search
  - Add indexes for search_count and timestamps
  - Configure Multi-AZ for high availability
  - _Requirements: 4.1_

- [x] 2.2 Write property test for vector search similarity
  - **Property 1: Vector search finds semantically similar supplements**
  - **Validates: Requirements 1.1, 1.2**

- [x] 2.3 Implement embedding generation service in Lambda
  - Setup Lambda with Sentence Transformers (all-MiniLM-L6-v2)
  - Mount EFS for model caching
  - Create embedding generation endpoint
  - Implement model loading from EFS
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 2.4 Write property test for embedding dimensions
  - **Property 12: Embedding generation produces correct dimensions**
  - **Validates: Requirements 6.2**

- [x] 2.5 Write property test for embedding performance
  - **Property 13: Embedding generation performance**
  - **Validates: Requirements 6.3**

- [x] 2.6 Write property test for model caching
  - **Property 14: Model caching for reuse**
  - **Validates: Requirements 6.5**

- [x] 3. Implement smart cache system (AWS native)
- [x] 3.1 Setup DynamoDB cache table
  - Create table schema for supplement cache
  - Configure TTL (7 days)
  - Add GSI for query patterns
  - _Requirements: 2.1, 5.1_

- [x] 3.2 Setup DynamoDB DAX cluster
  - Create DAX cluster (t3.small)
  - Configure endpoint
  - Implement DAX client in Lambda
  - _Requirements: 2.4, 5.1_

- [x] 3.3 Setup ElastiCache Redis cluster
  - Create Redis cluster (cache.t3.micro)
  - Enable cluster mode
  - Configure security groups
  - Implement Redis client
  - Configure LRU eviction policy
  - _Requirements: 2.5, 5.2, 5.3, 5.4_

- [x] 3.4 Write property test for cache tier ordering
  - **Property 15: Cache tier ordering (DAX → Redis → RDS)**
  - **Validates: Requirements 5.1**

- [x] 3.5 Write property test for DAX latency
  - **Property 4: DAX cache hit latency < 1ms**
  - **Validates: Requirements 2.4**

- [x] 3.6 Write property test for Redis latency
  - **Property 5: Redis cache hit latency < 5ms**
  - **Validates: Requirements 2.5**

- [x] 3.7 Write property test for cache hit rate
  - **Property 16: Cache hit rate threshold >= 85%**
  - **Validates: Requirements 5.2**

- [x] 3.8 Write property test for cache TTL
  - **Property 17: Cache TTL configuration (7 days)**
  - **Validates: Requirements 5.3**

- [x] 3.9 Write property test for LRU eviction
  - **Property 18: LRU cache eviction**
  - **Validates: Requirements 5.4**

- [x] 4. Implement CloudFront + Lambda@Edge
- [x] 4.1 Create CloudFront distribution
  - Configure origin (API Gateway)
  - Setup SSL certificate
  - Configure caching behaviors
  - _Requirements: 2.1, 2.3_

- [x] 4.2 Create Lambda@Edge function for viewer request
  - Implement request validation and sanitization
  - Add DAX cache lookup logic
  - Implement fallback to origin
  - Add response formatting
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 4.3 Write property test for typo tolerance
  - **Property 2: Typo tolerance through semantic similarity**
  - **Validates: Requirements 1.4**

- [x] 4.4 Write property test for error rate
  - **Property 3: Error rate below threshold < 1%**
  - **Validates: Requirements 1.5**

- [x] 4.5 Write property test for edge latency
  - **Property 4: CloudFront edge latency < 50ms**
  - **Validates: Requirements 2.1**

- [x] 4.6 Write property test for cache miss latency
  - **Property 6: Cache miss latency bound < 200ms**
  - **Validates: Requirements 2.2**

- [x] 4.7 Write property test for RDS performance
  - **Property 7: RDS Postgres pgvector query performance < 50ms**
  - **Validates: Requirements 2.6**

- [x] 5. Implement multilingual support
- [x] 5.1 Add multilingual embedding support
  - Verify Sentence Transformers model supports 100+ languages
  - Test Spanish, English, Portuguese queries
  - Add language detection (optional)
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.2 Write property test for Spanish search
  - **Property 8: Multilingual search (Spanish to English)**
  - **Validates: Requirements 3.1**

- [x] 5.3 Write property test for English search
  - **Property 9: Multilingual search (English)**
  - **Validates: Requirements 3.2**

- [x] 5.4 Write property test for scientific name mapping
  - **Property 10: Scientific name to common name mapping**
  - **Validates: Requirements 3.4**

- [x] 5.5 Write property test for common name mapping
  - **Property 11: Common name to scientific name mapping**
  - **Validates: Requirements 3.5**

- [x] 6. Implement auto-discovery system
- [x] 6.1 Create discovery queue in DynamoDB
  - Design queue schema (id, query, priority, status)
  - Implement queue operations (enqueue, dequeue, update)
  - Add priority scoring based on search frequency
  - Enable DynamoDB Streams
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6.2 Implement background worker Lambda for discovery
  - Create Lambda function triggered by DynamoDB Stream
  - Add PubMed validation logic
  - Implement automatic supplement insertion to RDS
  - Add error handling and retry logic
  - Implement cache invalidation via EventBridge
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 6.3 Write property test for search prioritization
  - **Property 23: Search prioritization**
  - **Validates: Requirements 7.1**

- [x] 6.4 Write property test for auto-discovery
  - **Property 25: Auto-discovery insertion**
  - **Validates: Requirements 7.3**

- [x] 6.5 Write property test for PubMed validation
  - **Property 26: PubMed validation**
  - **Validates: Requirements 7.4**

- [x] 6.6 Write property test for low evidence classification
  - **Property 27: Low evidence classification**
  - **Validates: Requirements 7.5**

- [x] 7. Implement CRUD operations
- [x] 7.1 Create supplement insertion endpoint
  - Implement POST /api/supplements
  - Add automatic embedding generation
  - Validate supplement data
  - Insert into RDS Postgres
  - _Requirements: 4.1, 4.2_

- [x] 7.2 Create supplement update endpoint
  - Implement PUT /api/supplements/:id
  - Add cache invalidation (DynamoDB + Redis)
  - Regenerate embedding if name changes
  - _Requirements: 4.5_

- [x] 7.3 Write property test for auto-embedding
  - **Property 22: Auto-embedding generation on insert**
  - **Validates: Requirements 4.2**

- [x] 7.4 Write property test for insert-to-search latency
  - **Property 20: Insert-to-search latency < 1s**
  - **Validates: Requirements 4.3**

- [x] 7.5 Write property test for scalability
  - **Property 21: Scalability with large dataset (1000+ supplements)**
  - **Validates: Requirements 4.4**

- [x] 7.6 Write property test for cache invalidation
  - **Property 19: Cache invalidation on update (DynamoDB + Redis)**
  - **Validates: Requirements 4.5, 5.5**

- [x] 8. Implement monitoring and analytics
- [x] 8.1 Setup logging infrastructure
  - Configure CloudWatch Logs
  - Add request ID tracking (X-Ray)
  - Implement structured logging (JSON format)
  - Setup log aggregation
  - _Requirements: 8.1, 8.2_

- [x] 8.2 Implement metrics collection
  - Track latency (P50, P95, P99) in CloudWatch
  - Track cache hit rate (DAX + Redis)
  - Track error rate
  - Track search patterns
  - Setup X-Ray tracing
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 8.3 Setup alerting system with CloudWatch Alarms
  - Configure alerts for high error rate (> 1%)
  - Configure alerts for low cache hit rate (< 80%)
  - Configure alerts for high latency (P95 > 300ms)
  - Configure alerts for discovery queue backlog (> 100)
  - Setup SNS topics for notifications
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 8.4 Write property test for analytics logging
  - **Property 24: Analytics logging**
  - **Validates: Requirements 7.2, 8.1**

- [x] 8.5 Write property test for error logging
  - **Property 28: Error logging with context**
  - **Validates: Requirements 8.2**

- [x] 8.6 Write property test for cache hit rate alerting
  - **Property 29: Cache hit rate alerting**
  - **Validates: Requirements 8.3**

- [x] 8.7 Write property test for latency alerting
  - **Property 30: Latency alerting**
  - **Validates: Requirements 8.4**

- [x] 8.8 Write property test for anomaly detection
  - **Property 31: Anomaly detection logging**
  - **Validates: Requirements 8.5**

- [x] 9. Implement backward compatibility
- [x] 9.1 Create compatibility layer
  - Maintain same API interface as legacy system
  - Add response format transformation
  - Implement fallback to legacy system on error
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 9.2 Write property test for fallback logic
  - **Property 32: Fallback to legacy system**
  - **Validates: Requirements 9.2**

- [x] 9.3 Write property test for response compatibility
  - **Property 33: Response format compatibility**
  - **Validates: Requirements 9.5**

- [x] 10. Implement rate limiting and security
- [x] 10.1 Add rate limiting with API Gateway
  - Implement per-IP rate limits (100 req/min)
  - Implement per-user rate limits (1000 req/day)
  - Add exponential backoff for PubMed API
  - Configure WAF rules
  - _Requirements: 10.5_

- [x] 10.2 Add input validation and sanitization
  - Validate query length (max 200 chars)
  - Sanitize SQL injection attempts
  - Add CORS configuration
  - Implement request signing
  - _Requirements: 1.1_

- [x] 10.3 Write property test for rate limit handling
  - **Property 34: Rate limit handling**
  - **Validates: Requirements 10.5**

- [x] 11. Data migration from legacy system
- [x] 11.1 Export existing supplements
  - Extract 70 supplements from supplement-mappings.ts
  - Transform to new schema format
  - Generate embeddings for all supplements
  - _Requirements: 9.1_

- [x] 11.2 Import into RDS Postgres
  - Bulk insert supplements with embeddings
  - Verify vector index creation
  - Test search accuracy
  - _Requirements: 4.1_

- [x] 11.3 Pre-populate caches
  - Load popular supplements into DynamoDB
  - Warm up ElastiCache Redis
  - Verify DAX is caching
  - _Requirements: 5.1, 5.2_

- [x] 11.4 Validate migration
  - Compare search results (legacy vs new)
  - Verify all 70 supplements are searchable
  - Test multilingual queries
  - _Requirements: 9.1, 9.5_

- [x] 12. Integration testing
- [x] 12.1 Write end-to-end integration tests
  - Test complete search flow (CloudFront → DAX → Redis → RDS)
  - Test cache tier fallback
  - Test discovery queue processing
  - Test error handling and fallback
  - _Requirements: 1.1, 2.1, 5.1, 9.2_

- [x] 12.2 Write performance tests
  - Benchmark latency (P50, P95, P99)
  - Test throughput (queries/second)
  - Measure cache hit rate (DAX + Redis)
  - Test scalability (1K, 10K, 100K supplements)
  - _Requirements: 2.1, 2.2, 4.4, 5.2_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Deploy to staging
- [x] 14.1 Deploy infrastructure with CloudFormation
  - Deploy RDS Postgres
  - Deploy DynamoDB tables + DAX
  - Deploy ElastiCache Redis
  - Deploy EFS
  - Deploy Lambda functions
  - Deploy CloudFront + Lambda@Edge
  - _Requirements: 4.1, 5.1_

- [x] 14.2 Deploy application code
  - Deploy search API
  - Deploy discovery worker
  - Deploy monitoring
  - _Requirements: 1.1, 7.3, 8.1_

- [x] 14.3 Run smoke tests
  - Test basic search functionality
  - Verify cache is working (DAX + Redis)
  - Check CloudWatch dashboards
  - Verify X-Ray traces
  - _Requirements: 1.1, 5.1, 8.1_

- [x] 15. Gradual rollout to production
- [x] 15.1 Deploy with 10% traffic
  - Route 10% of traffic to new system via CloudFront
  - Monitor error rate, latency, cache hit rate
  - Compare with legacy system metrics
  - _Requirements: 9.2_

- [x] 15.2 Increase to 50% traffic
  - Route 50% of traffic to new system
  - Continue monitoring
  - Verify no regressions
  - _Requirements: 9.2_

- [x] 15.3 Increase to 100% traffic
  - Route 100% of traffic to new system
  - Keep legacy system as fallback
  - Monitor for 48 hours
  - _Requirements: 9.2_

- [x] 16. Cleanup legacy code
- [x] 16.1 Remove legacy files
  - Delete lib/portal/supplement-mappings.ts
  - Delete lib/portal/query-normalization.ts
  - Remove legacy search logic
  - _Requirements: 9.1_

- [x] 16.2 Update documentation
  - Update README with new AWS architecture
  - Document API endpoints
  - Add deployment guide
  - Document cost optimization strategies
  - _Requirements: 9.1_

- [x] 17. Final checkpoint - Verify production stability
  - Ensure all tests pass, ask the user if questions arise.
  - Verify error rate < 1%
  - Verify latency P95 < 200ms
  - Verify cache hit rate >= 85%
  - Verify AWS costs within budget ($25/month)
