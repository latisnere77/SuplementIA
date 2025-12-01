# Implementation Plan - System Completion Audit

## Overview

Este plan de implementación convierte el diseño en tareas ejecutables para completar el sistema SuplementIA. Cada tarea está diseñada para ser incremental, construyendo sobre las tareas anteriores.

---

## Phase 1: Infrastructure Setup

- [x] 1. Deploy AWS infrastructure to staging
  - Deploy CloudFormation stack for staging environment
  - Create VPC, subnets, security groups, NAT Gateway
  - Create EFS file system with mount targets
  - Create DynamoDB tables (supplement-cache, discovery-queue)
  - Deploy Lambda functions with VPC configuration
  - Configure API Gateway with CORS and rate limiting
  - Set up CloudWatch log groups and alarms
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Write integration test for infrastructure deployment
  - Test that all CloudFormation resources are created
  - Verify VPC and security group configuration
  - Validate DynamoDB table schemas

- [x] 2. Configure EFS mount for Lambda functions
  - Verify EFS mount points are accessible from Lambda
  - Create directories `/mnt/efs/suplementia-lancedb/` and `/mnt/efs/models/`
  - Test read/write permissions from Lambda
  - Configure security groups for NFS (port 2049)
  - _Requirements: 1.2, 1.5_

---

## Phase 2: ML Model Deployment

- [x] 3. Upload Sentence Transformers model to EFS
  - Download all-MiniLM-L6-v2 model (~80MB)
  - Upload model files to `/mnt/efs/models/all-MiniLM-L6-v2/`
  - Verify model size and file integrity
  - Test model loading from Lambda
  - _Requirements: 3.1, 3.5_

- [x] 3.1 Implement lazy model loading in Lambda
  - Update search-api-lancedb to load model from EFS
  - Implement global variable caching for model reuse
  - Add structured logging for model load events
  - Test cold start vs warm start performance
  - _Requirements: 3.2, 3.4_

- [x] 3.2 Write property test for embedding generation
  - **Property 3: Embedding Generation Consistency**
  - Generate random text inputs
  - Verify all outputs are 384-dimensional vectors
  - **Validates: Requirements 3.3**

- [x] 3.3 Write property test for model reuse
  - **Property 4: Model Reuse Across Invocations**
  - Make multiple Lambda invocations in same container
  - Verify model is loaded only once
  - **Validates: Requirements 3.4**

---

## Phase 3: LanceDB Initialization

- [x] 4. Initialize LanceDB database
  - Create LanceDB connection to `/mnt/efs/suplementia-lancedb/`
  - Create `supplements` table with schema
  - Configure vector column (384 dimensions)
  - Add metadata columns
  - _Requirements: 2.1, 2.2_

- [x] 4.1 Create HNSW index for fast similarity search
  - Configure HNSW index with cosine metric
  - Set num_partitions=256, num_sub_vectors=96
  - Test index creation and query performance
  - Benchmark search latency (target < 10ms)
  - _Requirements: 2.4, 2.5_

- [x] 4.2 Write property test for vector dimension consistency
  - **Property 1: Vector Dimension Consistency**
  - Generate random supplements with embeddings
  - Insert into LanceDB
  - Verify all vectors have exactly 384 dimensions
  - **Validates: Requirements 2.2**

- [x] 4.3 Write property test for query performance
  - **Property 2: LanceDB Query Performance**
  - Generate random search queries
  - Measure query latency for each
  - Verify all queries complete in < 10ms
  - **Validates: Requirements 2.5**

---

## Phase 4: Data Migration

- [x] 5. Export legacy supplement data
  - Identify source of 70 legacy supplements
  - Export supplement data
  - Validate data completeness and format
  - Create migration script
  - _Requirements: 10.1_

- [x] 5.1 Generate embeddings for legacy supplements
  - Use embedding-generator Lambda to create vectors
  - Verify all embeddings are 384-dimensional
  - Store embeddings with supplement data
  - _Requirements: 10.2_

- [x] 5.2 Write property test for migration vector dimensions
  - **Property 19: Migration Vector Dimensions**
  - For each migrated supplement, verify embedding is 384-dim
  - **Validates: Requirements 10.2**

- [x] 5.3 Insert legacy supplements into LanceDB
  - Batch insert supplements with embeddings
  - Verify all 70 supplements are inserted
  - Test data integrity after insertion
  - _Requirements: 10.3_

- [x] 5.4 Write property test for migrated supplement searchability
  - **Property 20: Migrated Supplement Searchability**
  - For each migrated supplement, search by name
  - Verify supplement is returned in results
  - **Validates: Requirements 10.4**

- [x] 6. Checkpoint - Verify data migration
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Cache Implementation

- [x] 7. Implement DynamoDB cache operations
  - Update search-api-lancedb to check cache before vector search
  - Implement cache_check() function
  - Implement store_cache() function with 7-day TTL
  - Add cache hit/miss metrics to CloudWatch
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 7.1 Write property test for cache-first strategy
  - **Property 13: Cache-First Search Strategy**
  - Generate random search queries
  - Verify cache is checked before vector search
  - **Validates: Requirements 8.1**

- [x] 7.2 Write property test for cache TTL
  - **Property 16: Cache TTL Configuration**
  - Create cache entries with random queries
  - Verify TTL is set to exactly 7 days
  - **Validates: Requirements 8.4**

- [x] 7.3 Write property test for cache hit performance
  - **Property 14: Cache Hit Performance**
  - Generate queries with known cache entries
  - Measure latency for cache hits
  - Verify all cache hits complete in < 10ms
  - **Validates: Requirements 8.2**

- [x] 7.4 Write property test for cache population on miss
  - **Property 15: Cache Population on Miss**
  - Generate unique queries (cache misses)
  - Verify vector search is performed
  - Verify result is stored in cache
  - **Validates: Requirements 8.3**

---

## Phase 6: Discovery Queue Implementation

- [x] 8. Implement discovery queue insertion
  - Update search-api-lancedb to add unknown supplements to queue
  - Implement add_to_discovery_queue() function
  - Add structured logging for queue operations
  - _Requirements: 7.1_

- [x] 8.1 Write property test for discovery queue insertion
  - **Property 8: Discovery Queue Insertion**
  - Generate random unknown supplement queries
  - Verify each is added to discovery-queue table
  - **Validates: Requirements 7.1**

- [x] 8.2 Configure DynamoDB Streams trigger
  - Enable DynamoDB Streams on discovery-queue table
  - Create event source mapping to discovery-worker Lambda
  - Configure batch size and retry policy
  - _Requirements: 7.2_

- [x] 8.3 Write property test for discovery worker trigger
  - **Property 9: Discovery Worker Trigger**
  - Add items to discovery queue
  - Verify discovery-worker Lambda is triggered
  - **Validates: Requirements 7.2**

- [x] 8.4 Implement discovery-worker Lambda
  - Query PubMed API for supplement validation
  - Generate embedding for validated supplement
  - Insert supplement into LanceDB
  - Invalidate related cache entries
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 8.5 Write property test for PubMed validation
  - **Property 10: PubMed Validation**
  - Generate random discovery jobs
  - Verify PubMed API is queried for each
  - **Validates: Requirements 7.3**

- [x] 8.6 Write property test for validated supplement insertion
  - **Property 11: Validated Supplement Insertion**
  - Create supplements that pass validation
  - Verify each is inserted into LanceDB
  - **Validates: Requirements 7.4**

- [x] 8.7 Write property test for cache invalidation
  - **Property 12: Cache Invalidation on Insert**
  - Insert supplements into LanceDB
  - Verify related cache entries are invalidated
  - **Validates: Requirements 7.5**

- [x] 9. Checkpoint - Verify discovery queue
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Frontend Integration

- [x] 10. Configure environment variables
  - Set NEXT_PUBLIC_SEARCH_API_URL to API Gateway endpoint
  - Set NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true
  - Configure Lambda environment variables
  - Store secrets in AWS Secrets Manager
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.1 Write property test for secrets management
  - **Property 21: Secrets Management**
  - Scan codebase for hardcoded secrets
  - Verify all secrets are from Secrets Manager
  - **Validates: Requirements 13.1**

- [x] 10.2 Update frontend search integration
  - Update useIntelligentSearch hook to call new API
  - Implement error handling with ErrorMessage component
  - Add loading states and retry logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10.3 Write property test for error message display
  - **Property 5: Error Message Display**
  - Generate various error responses
  - Verify ErrorMessage component is used
  - **Validates: Requirements 4.3**

- [x] 10.4 Write integration test for search flow
  - Test complete user journey
  - Verify loading states appear
  - Test error handling and retry logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

---

## Phase 8: API Gateway Configuration

- [x] 11. Configure API Gateway
  - Create REST API with /search endpoint
  - Configure CORS for frontend domain
  - Set up rate limiting (100 req/min per IP)
  - Add API key validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11.1 Write property test for rate limiting
  - **Property 6: Rate Limiting Enforcement**
  - Generate rapid requests from same IP
  - Verify HTTP 429 is returned after limit
  - **Validates: Requirements 6.4**

- [x] 11.2 Write property test for authentication validation
  - **Property 7: Authentication Validation**
  - Generate requests with valid/invalid tokens
  - Verify invalid tokens return HTTP 401
  - **Validates: Requirements 6.5**

- [x] 11.3 Write property test for input validation
  - **Property 22: Input Validation and Sanitization**
  - Generate malicious inputs
  - Verify all are rejected with HTTP 400
  - **Validates: Requirements 13.3**

---

## Phase 9: Monitoring and Observability

- [x] 12. Set up CloudWatch monitoring
  - Create custom metrics
  - Configure alarms
  - Create dashboards
  - Set up SNS topics for alerts
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12.1 Write property test for structured logging
  - **Property 17: Structured Logging Format**
  - Invoke Lambda functions
  - Verify all logs are structured JSON
  - **Validates: Requirements 9.1**

- [x] 12.2 Write property test for error logging
  - **Property 18: Error Logging Completeness**
  - Trigger various errors
  - Verify complete error context is logged
  - **Validates: Requirements 9.2**

- [x] 12.3 Enable X-Ray tracing
  - Enable X-Ray on Lambda and API Gateway
  - Configure trace sampling rules
  - Test end-to-end tracing
  - _Requirements: 9.5_

---

## Phase 10: Security Hardening

- [x] 13. Implement security controls
  - Configure IAM roles with least privilege
  - Enable encryption at rest
  - Enforce TLS 1.3
  - Configure VPC with private subnets
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 13.1 Write security audit tests
  - Verify no secrets in code
  - Check IAM role permissions
  - Test TLS version enforcement
  - _Requirements: 13.1, 13.2, 13.4, 13.5_

---

## Phase 11: Performance Testing

- [x] 14. Run performance tests
  - Benchmark search latency
  - Test cache hit latency
  - Test vector search latency
  - Load test with 100 req/sec
  - _Requirements: 11.4_

- [x] 14.1 Write performance test suite
  - Cache hit scenario
  - Cache miss scenario
  - Discovery queue scenario
  - _Requirements: 11.4_

---

## Phase 12: Documentation

- [x] 15. Update documentation
  - Update README.md
  - Update QUICK-START.md
  - Create TROUBLESHOOTING.md
  - Update architecture diagrams
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

---

## Phase 13: Staging Validation

- [x] 16. Run smoke tests in staging
  - Verify all Lambda functions deployed
  - Test EFS mount
  - Verify DynamoDB tables
  - Test model loading
  - Verify vector search
  - Test cache operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 6.1, 6.3_

- [x] 16.1 Write comprehensive integration test suite
  - Test end-to-end search flow
  - Test discovery queue flow
  - Test cache invalidation flow
  - _Requirements: 11.3_

- [x] 17. Checkpoint - Staging validation complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 14: Production Deployment

- [x] 18. Deploy to production (10% traffic)
  - Deploy CloudFormation stack
  - Configure CloudFront with Lambda@Edge
  - Set traffic percentage to 10%
  - Monitor metrics
  - _Requirements: 15.1, 15.2_

- [x] 18.1 Monitor 10% traffic for 24 hours
  - Check error rate
  - Monitor latency
  - Verify cache hit rate
  - _Requirements: 9.3, 9.4, 9.5_

- [x] 19. Increase to 50% traffic
  - Update CloudFront traffic to 50%
  - Monitor metrics for 24 hours
  - _Requirements: 15.2_

- [x] 20. Increase to 100% traffic
  - Update CloudFront traffic to 100%
  - Monitor for 1 week
  - Decommission legacy system
  - _Requirements: 15.2_

- [x] 20.1 Implement rollback capability
  - Test rollback to legacy system
  - Document rollback procedures
  - _Requirements: 15.3_

- [x] 21. Final checkpoint - Production complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 15: Post-Deployment

- [x] 22. Decommission legacy system
  - Remove legacy code
  - Update DNS records
  - Archive documentation
  - _Requirements: 15.5_

- [x] 23. Set up ongoing maintenance
  - Schedule weekly reviews
  - Configure monthly cost analysis
  - Plan quarterly testing
  - _Requirements: 9.1, 9.2, 14.5_
