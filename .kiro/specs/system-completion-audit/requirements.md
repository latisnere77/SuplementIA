# Requirements Document - System Completion Audit

## Introduction

Este documento identifica los componentes faltantes y problemas que impiden que SuplementIA funcione correctamente en producción. El sistema tiene una arquitectura serverless AWS bien diseñada pero incompleta, con varios componentes críticos sin implementar o parcialmente configurados.

## Glossary

- **System**: SuplementIA - plataforma de recomendación de suplementos basada en evidencia científica
- **LanceDB**: Base de datos vectorial serverless montada en EFS para búsqueda semántica
- **Vector Search**: Búsqueda por similitud semántica usando embeddings de 384 dimensiones
- **Discovery Worker**: Lambda que procesa automáticamente suplementos desconocidos
- **Cache Layer**: Sistema de caché multi-nivel (DynamoDB)
- **ML Model**: Sentence Transformers (all-MiniLM-L6-v2) para generar embeddings
- **EFS**: Elastic File System - almacenamiento compartido para Lambda
- **Frontend**: Aplicación Next.js 14 con App Router
- **Backend**: Conjunto de funciones Lambda en Python 3.11 ARM64

## Requirements

### Requirement 1: Infrastructure Deployment

**User Story:** As a DevOps engineer, I want the AWS infrastructure fully deployed and configured, so that the application can run in production.

#### Acceptance Criteria - Infrastructure Deployment

1. WHEN deploying infrastructure THEN the System SHALL create all required AWS resources (EFS, DynamoDB, Lambda, VPC, Security Groups)
2. WHEN EFS is mounted THEN the System SHALL have directories `/mnt/efs/suplementia-lancedb/` and `/mnt/efs/models/` accessible to Lambda functions
3. WHEN Lambda functions are deployed THEN the System SHALL have all three functions (search-api, discovery-worker, embedding-generator) running on ARM64 architecture
4. WHEN DynamoDB tables are created THEN the System SHALL have `supplement-cache` and `discovery-queue` tables with correct schemas
5. WHEN VPC is configured THEN the System SHALL allow Lambda functions to access EFS via NFS (port 2049)

### Requirement 2: Database Initialization

**User Story:** As a data engineer, I want LanceDB initialized with supplement data, so that vector search can return results.

#### Acceptance Criteria - Database Initialization

1. WHEN LanceDB is initialized THEN the System SHALL create a `supplements` table in `/mnt/efs/suplementia-lancedb/`
2. WHEN supplements are inserted THEN the System SHALL store vectors with exactly 384 dimensions
3. WHEN the database is queried THEN the System SHALL have at least 70 supplements from the legacy system migrated
4. WHEN ANN index is created THEN the System SHALL use HNSW or IVF_PQ for fast similarity search
5. WHEN a supplement is searched THEN the System SHALL return results in less than 10ms from LanceDB

### Requirement 3: ML Model Deployment

**User Story:** As a ML engineer, I want the Sentence Transformers model deployed to EFS, so that Lambda can generate embeddings without cold start delays.

#### Acceptance Criteria - ML Model Deployment

1. WHEN the model is uploaded THEN the System SHALL store `all-MiniLM-L6-v2` in `/mnt/efs/models/`
2. WHEN Lambda loads the model THEN the System SHALL load from EFS cache instead of downloading
3. WHEN embeddings are generated THEN the System SHALL produce 384-dimensional vectors
4. WHEN multiple requests arrive THEN the System SHALL reuse the loaded model (no reload per request)
5. WHEN model size is checked THEN the System SHALL be approximately 80MB

### Requirement 4: Frontend Integration

**User Story:** As a frontend developer, I want the Next.js application properly integrated with the backend, so that users can search supplements.

#### Acceptance Criteria - Frontend Integration

1. WHEN a user searches THEN the Frontend SHALL call the correct Lambda API endpoint
2. WHEN API responds THEN the Frontend SHALL display results in Spanish with proper formatting
3. WHEN an error occurs THEN the Frontend SHALL show user-friendly error messages using ErrorMessage component
4. WHEN search is loading THEN the Frontend SHALL show loading states with proper UX
5. WHEN no results are found THEN the Frontend SHALL inform the user that the supplement was added to discovery queue

### Requirement 5: Environment Configuration

**User Story:** As a developer, I want all environment variables properly configured, so that the application can connect to AWS services.

#### Acceptance Criteria - Environment Configuration

1. WHEN deploying to production THEN the System SHALL have all required environment variables set in `.env.production`
2. WHEN Lambda functions run THEN the System SHALL have access to `LANCEDB_PATH`, `MODEL_PATH`, `DYNAMODB_CACHE_TABLE`
3. WHEN frontend runs THEN the System SHALL have `NEXT_PUBLIC_SEARCH_API_URL` pointing to the correct API Gateway
4. WHEN secrets are needed THEN the System SHALL retrieve them from AWS Secrets Manager or Parameter Store
5. WHEN feature flags are checked THEN the System SHALL have `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true`

### Requirement 6: API Gateway Configuration

**User Story:** As a backend engineer, I want API Gateway properly configured, so that HTTP requests reach Lambda functions.

#### Acceptance Criteria - API Gateway Configuration

1. WHEN API Gateway is deployed THEN the System SHALL expose a public HTTPS endpoint
2. WHEN a search request arrives THEN the System SHALL route to `search-api-lancedb` Lambda
3. WHEN CORS is configured THEN the System SHALL allow requests from the frontend domain
4. WHEN rate limiting is applied THEN the System SHALL enforce 100 requests/minute per IP
5. WHEN authentication is required THEN the System SHALL validate API keys or JWT tokens

### Requirement 7: Discovery Queue Processing

**User Story:** As a product manager, I want unknown supplements automatically discovered, so that the database grows organically.

#### Acceptance Criteria - Discovery Queue Processing

1. WHEN a supplement is not found THEN the System SHALL add it to the discovery queue in DynamoDB
2. WHEN a discovery item is added THEN the System SHALL trigger the discovery-worker Lambda via DynamoDB Streams
3. WHEN discovery-worker runs THEN the System SHALL query PubMed for scientific validation
4. WHEN validation passes THEN the System SHALL insert the supplement into LanceDB with generated embedding
5. WHEN insertion completes THEN the System SHALL invalidate the cache for that supplement

### Requirement 8: Cache Implementation

**User Story:** As a performance engineer, I want DynamoDB cache working correctly, so that repeated searches are fast.

#### Acceptance Criteria - Cache Implementation

1. WHEN a search is performed THEN the System SHALL check DynamoDB cache first
2. WHEN cache hit occurs THEN the System SHALL return results in less than 10ms
3. WHEN cache miss occurs THEN the System SHALL perform vector search and store result in cache
4. WHEN cache entries are created THEN the System SHALL set TTL to 7 days
5. WHEN cache hit rate is measured THEN the System SHALL achieve at least 85% hit rate

### Requirement 9: Monitoring and Observability

**User Story:** As a DevOps engineer, I want comprehensive monitoring, so that I can detect and fix issues quickly.

#### Acceptance Criteria - Monitoring and Observability

1. WHEN Lambda functions run THEN the System SHALL log structured JSON to CloudWatch
2. WHEN errors occur THEN the System SHALL log complete context including stack traces
3. WHEN latency exceeds thresholds THEN the System SHALL trigger CloudWatch alarms
4. WHEN cache hit rate drops THEN the System SHALL send alerts via SNS
5. WHEN X-Ray tracing is enabled THEN the System SHALL trace requests end-to-end

### Requirement 10: Data Migration

**User Story:** As a data engineer, I want legacy supplement data migrated, so that the new system has initial data.

#### Acceptance Criteria - Data Migration

1. WHEN migration runs THEN the System SHALL export all 70 supplements from `supplement-mappings.ts`
2. WHEN embeddings are generated THEN the System SHALL create 384-dim vectors for each supplement
3. WHEN data is inserted THEN the System SHALL populate LanceDB with all migrated supplements
4. WHEN migration completes THEN the System SHALL verify all supplements are searchable
5. WHEN search accuracy is tested THEN the System SHALL return correct supplements for known queries

### Requirement 11: Testing Infrastructure

**User Story:** As a QA engineer, I want comprehensive tests, so that I can verify system correctness.

#### Acceptance Criteria - Testing Infrastructure

1. WHEN unit tests run THEN the System SHALL have tests for all core functions
2. WHEN property-based tests run THEN the System SHALL use fast-check with minimum 100 iterations
3. WHEN integration tests run THEN the System SHALL test end-to-end search flow
4. WHEN performance tests run THEN the System SHALL verify latency targets (< 200ms)
5. WHEN all tests pass THEN the System SHALL have at least 80% code coverage

### Requirement 12: Documentation Completion

**User Story:** As a new developer, I want complete documentation, so that I can understand and maintain the system.

#### Acceptance Criteria - Documentation Completion

1. WHEN reading README THEN the System SHALL have accurate deployment instructions
2. WHEN following QUICK-START THEN the System SHALL successfully deploy to staging
3. WHEN troubleshooting THEN the System SHALL have documented common issues and solutions
4. WHEN reviewing architecture THEN the System SHALL have up-to-date diagrams
5. WHEN checking API docs THEN the System SHALL have complete endpoint documentation

### Requirement 13: Security Configuration

**User Story:** As a security engineer, I want proper security controls, so that the system is protected.

#### Acceptance Criteria - Security Configuration

1. WHEN storing secrets THEN the System SHALL use AWS Secrets Manager or Parameter Store
2. WHEN Lambda accesses resources THEN the System SHALL use IAM roles with least privilege
3. WHEN API receives requests THEN the System SHALL validate and sanitize all inputs
4. WHEN data is transmitted THEN the System SHALL use TLS 1.3 encryption
5. WHEN VPC is configured THEN the System SHALL use private subnets for Lambda and RDS

### Requirement 14: Cost Optimization

**User Story:** As a finance manager, I want costs optimized, so that the system is economically viable.

#### Acceptance Criteria - Cost Optimization

1. WHEN running in production THEN the System SHALL cost approximately $5.59/month for 10K searches/day
2. WHEN Lambda runs THEN the System SHALL use ARM64 architecture (20% cheaper than x86)
3. WHEN DynamoDB is used THEN the System SHALL use on-demand pricing (pay per request)
4. WHEN cache hit rate is high THEN the System SHALL minimize expensive vector searches
5. WHEN monitoring costs THEN the System SHALL have CloudWatch dashboards showing cost breakdown

### Requirement 15: Deployment Pipeline

**User Story:** As a DevOps engineer, I want automated deployment, so that releases are consistent and safe.

#### Acceptance Criteria - Deployment Pipeline

1. WHEN deploying to staging THEN the System SHALL use `deploy-staging.sh` script
2. WHEN deploying to production THEN the System SHALL support gradual rollout (10%, 50%, 100%)
3. WHEN deployment fails THEN the System SHALL automatically rollback
4. WHEN smoke tests run THEN the System SHALL verify all components before promoting
5. WHEN deployment completes THEN the System SHALL update CloudFormation stacks
