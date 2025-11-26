# Implementation Plan

- [x] 1. Setup RDS Postgres with pgvector
  - Deploy RDS instance via CloudFormation
  - Install pgvector extension
  - Create supplements table with vector column
  - Create HNSW index for similarity search
  - Configure Multi-AZ for high availability
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 1.1 Write property test for vector search accuracy
  - **Property 1: Vector search finds semantically similar supplements**
  - **Validates: Requirements 1.3, 5.2**

- [x] 1.2 Write property test for search latency
  - **Property 6: Search latency bounds (DAX < 1ms, Redis < 5ms, Postgres < 50ms)**
  - **Validates: Requirements 1.4, 6.1, 6.2, 6.3**

- [x] 1.3 Write property test for HNSW performance
  - **Property 9: HNSW index performance with 1000+ supplements**
  - **Validates: Requirements 1.4, 10.1**

- [x] 1.4 Write property test for Multi-AZ failover
  - **Property 10: Multi-AZ availability and failover**
  - **Validates: Requirements 1.5**

- [ ] 2. Implement Embedding Generator Lambda
  - Create Lambda function with Python runtime
  - Add Sentence Transformers dependency
  - Mount EFS for model caching
  - Implement model loading with caching
  - Add embedding generation endpoint
  - Configure memory (1024 MB) and timeout (30s)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.1 Write property test for embedding consistency
  - **Property 2: Embedding generation produces identical vectors**
  - **Validates: Requirements 3.4**

- [ ] 2.2 Write property test for embedding dimensions
  - **Property 7: Generated embeddings have exactly 384 dimensions**
  - **Validates: Requirements 3.4**

- [ ] 3. Create initial knowledge base population script
  - Export existing 70+ supplements from supplement-mappings.ts
  - Transform to new schema format
  - Generate embeddings for all supplements
  - Bulk insert into RDS Postgres
  - Verify HNSW index creation
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Implement Discovery Worker Lambda
  - Create Lambda function triggered by DynamoDB Stream
  - Implement discovery queue processing logic
  - Add PubMed validation
  - Generate embeddings for new supplements
  - Insert validated supplements into RDS
  - Implement cache invalidation
  - Add error handling and retry logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4.1 Write property test for discovery queue priority
  - **Property 4: Discovery queue processes high-priority items first**
  - **Validates: Requirements 7.2, 7.3**

- [ ] 4.2 Write property test for discovery queue addition
  - **Property 8: Unknown queries are added to discovery queue**
  - **Validates: Requirements 4.1, 7.1**

- [ ] 4.3 Write property test for cache invalidation
  - **Property 5: Cache invalidation across all tiers**
  - **Validates: Requirements 4.5**

- [ ] 5. Implement Search API Lambda with vector search
  - Create Lambda function for search orchestration
  - Implement embedding generation for queries
  - Add DAX cache lookup logic
  - Add Redis cache lookup logic
  - Add Postgres pgvector query logic
  - Implement cache tier fallback
  - Add result ranking by similarity
  - Configure environment variables for cache endpoints
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.1 Write property test for cache tier ordering
  - **Property 3: Cache tiers checked in correct order (DAX → Redis → Postgres)**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 6. Setup multi-tier cache system
  - Deploy DynamoDB table for L1 cache
  - Deploy DAX cluster (dax.t3.small)
  - Deploy Redis cluster (cache.t3.micro)
  - Configure cache TTLs (24 hours)
  - Configure LRU eviction policy
  - Implement cache key generation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Implement auto-learning system
  - Add search frequency tracking
  - Implement priority calculation algorithm
  - Add analytics logging for search patterns
  - Create CloudWatch dashboard for insights
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Setup monitoring and alerting
  - Configure CloudWatch Logs for all Lambdas
  - Add X-Ray tracing
  - Create CloudWatch metrics (latency, cache hit rate, queue length)
  - Setup CloudWatch alarms (high latency, low cache hit, queue backlog)
  - Configure SNS topics for notifications
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9. Write integration tests
  - Test end-to-end search flow (DAX → Redis → Postgres)
  - Test discovery worker processing
  - Test cache invalidation
  - Test embedding generation
  - Test error handling and fallbacks
  - _Requirements: 1.1, 4.1, 5.1, 6.1_

- [ ] 9.1 Write performance tests
  - Benchmark search latency (P50, P95, P99)
  - Test with 100, 1000, 10000 supplements
  - Measure cache hit rates
  - Test concurrent load (100 req/s)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Deploy to staging environment
  - Deploy CloudFormation stack
  - Deploy all Lambda functions
  - Run data migration script
  - Verify all components are working
  - Run smoke tests
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Gradual rollout to production
  - Route 10% traffic to new system
  - Monitor metrics (latency, errors, cache hits)
  - Increase to 50% if stable
  - Increase to 100% if stable
  - Keep old system as fallback
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 13. Update frontend integration
  - Update search API endpoint to use new Search API Lambda
  - Add fallback logic to old system
  - Update error handling
  - Add loading states for discovery queue
  - _Requirements: 5.1, 5.5_

- [ ] 14. Documentation and cleanup
  - Update README with new architecture
  - Document deployment process
  - Document monitoring and alerting
  - Add runbook for common issues
  - Remove deprecated code
  - _Requirements: 8.1_

- [ ] 15. Final checkpoint - Verify production stability
  - Ensure all tests pass, ask the user if questions arise.
  - Verify search latency P95 < 50ms
  - Verify cache hit rate >= 85%
  - Verify discovery queue is processing
  - Verify costs are within budget ($100/month)
