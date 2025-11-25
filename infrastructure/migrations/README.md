# Supplement Migration Guide

This directory contains the exported supplement data and migration scripts for transitioning from the legacy hardcoded system to the new RDS Postgres + pgvector architecture.

## Quick Start

### 1. Export Legacy Supplements
```bash
npx tsx scripts/migrate-supplements.ts
```

This creates:
- `supplements-export.json` - All supplement data in new schema format
- `migration-stats.json` - Migration statistics

### 2. Setup Local Database (for testing)
```bash
./scripts/setup-local-postgres.sh
```

This starts a Docker container with Postgres + pgvector extension.

### 3. Import to RDS
```bash
RDS_HOST=localhost \
RDS_PORT=5432 \
RDS_DATABASE=supplements \
RDS_USER=postgres \
RDS_PASSWORD=postgres \
npx tsx scripts/import-to-rds.ts
```

### 4. Pre-populate Caches
```bash
RDS_HOST=localhost \
RDS_PORT=5432 \
RDS_DATABASE=supplements \
RDS_USER=postgres \
RDS_PASSWORD=postgres \
REDIS_URL=redis://localhost:6379 \
npx tsx scripts/prepopulate-caches.ts
```

### 5. Validate Migration
```bash
RDS_HOST=localhost \
RDS_PORT=5432 \
RDS_DATABASE=supplements \
RDS_USER=postgres \
RDS_PASSWORD=postgres \
npx tsx scripts/validate-migration.ts
```

## Production Deployment

### Environment Variables

**RDS Postgres:**
- `RDS_HOST` - RDS endpoint
- `RDS_PORT` - Port (default: 5432)
- `RDS_DATABASE` - Database name
- `RDS_USER` - Database user
- `RDS_PASSWORD` - Database password
- `RDS_SSL` - Enable SSL (set to 'true' for production)

**DynamoDB:**
- `DYNAMODB_TABLE` - Cache table name
- `DYNAMODB_ENDPOINT` - Optional: for local testing
- `DAX_ENDPOINT` - DAX cluster endpoint
- `AWS_REGION` - AWS region

**Redis:**
- `REDIS_URL` - Redis connection URL

**Embedding Service:**
- `EMBEDDING_SERVICE_URL` - Lambda endpoint for embedding generation

### Production Migration Steps

1. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   ./setup-infrastructure.sh
   ```

2. **Run Migration**
   ```bash
   # Export
   npx tsx scripts/migrate-supplements.ts
   
   # Import to production RDS
   RDS_HOST=your-rds-endpoint.rds.amazonaws.com \
   RDS_SSL=true \
   npx tsx scripts/import-to-rds.ts
   ```

3. **Pre-populate Caches**
   ```bash
   DYNAMODB_TABLE=supplement-cache \
   REDIS_URL=redis://your-elasticache-endpoint:6379 \
   npx tsx scripts/prepopulate-caches.ts
   ```

4. **Validate**
   ```bash
   RDS_HOST=your-rds-endpoint.rds.amazonaws.com \
   RDS_SSL=true \
   npx tsx scripts/validate-migration.ts
   ```

## Migration Data

### supplements-export.json

Contains all 39 supplements in the new schema format:

```json
{
  "name": "Ganoderma lucidum",
  "scientific_name": "Ganoderma lucidum",
  "common_names": ["Reishi", "Lingzhi", "Hongo Reishi"],
  "embedding": null,
  "metadata": {
    "category": "mushroom",
    "popularity": "high",
    "pubmedQuery": "...",
    "pubmedFilters": {...}
  },
  "search_count": 0,
  "last_searched_at": null,
  "created_at": "2025-11-25T...",
  "updated_at": "2025-11-25T..."
}
```

### migration-stats.json

Statistics about the migration:

```json
{
  "total": 39,
  "withEmbeddings": 0,
  "withoutEmbeddings": 39,
  "byCategory": {
    "mushroom": 7,
    "vitamin": 9,
    "mineral": 6,
    "amino-acid": 7,
    "fatty-acid": 1,
    "herb": 4,
    "other": 5
  },
  "byPopularity": {
    "high": 31,
    "medium": 8
  }
}
```

## Troubleshooting

### pgvector Extension Not Found
```bash
# Connect to Postgres
psql -h localhost -U postgres -d supplements

# Install extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Redis Connection Failed
```bash
# Check Redis is running
docker ps | grep redis

# Start Redis if needed
docker run -d --name supplements-redis -p 6379:6379 redis:7-alpine
```

### Embedding Generation Failed
The migration scripts use placeholder embeddings (zero vectors) if the embedding service is not available. Real embeddings will be generated on first search in production.

## Cleanup

```bash
# Stop and remove Docker containers
docker stop supplements-postgres supplements-redis
docker rm supplements-postgres supplements-redis
```

## Files

- `supplements-export.json` - Exported supplement data (39 supplements)
- `migration-stats.json` - Migration statistics
- `README.md` - This file

## Related Scripts

- `scripts/migrate-supplements.ts` - Export from legacy system
- `scripts/import-to-rds.ts` - Import to RDS Postgres
- `scripts/prepopulate-caches.ts` - Pre-populate caches
- `scripts/validate-migration.ts` - Validate migration
- `scripts/setup-local-postgres.sh` - Setup local Postgres

## Next Steps

After successful migration:

1. Deploy CloudFront + Lambda@Edge (Task 4)
2. Implement discovery queue (Task 6)
3. Deploy monitoring (Task 8)
4. Implement compatibility layer (Task 9)
5. Gradual rollout to production (Tasks 14-15)
