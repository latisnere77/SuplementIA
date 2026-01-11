# Database Migrations

This directory contains SQL migrations for the RDS Postgres knowledge base.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **PostgreSQL client** (`psql`) installed
3. **CloudFormation stack deployed** (staging or production)

## Quick Start

### 1. Check if CloudFormation stack is deployed

```bash
cd infrastructure
./check-stack-status.sh staging
```

If the stack is not deployed, deploy it first:

```bash
cd infrastructure
./deploy-staging.sh
```

### 2. Run the pgvector setup migration

```bash
cd infrastructure/migrations

# Set your database password
export DB_PASSWORD='your-secure-password'

# Run migration
./run-migration.sh staging 001_setup_pgvector.sql
```

### 3. Verify installation

The migration script automatically verifies:
- ✅ pgvector extension is installed
- ✅ supplements table is created with vector(384) column
- ✅ HNSW index is created for fast similarity search
- ✅ Helper functions are created

## Migrations

### 001_setup_pgvector.sql

**Purpose**: Initial setup of pgvector extension and supplements table

**What it does**:
- Installs pgvector extension
- Creates `supplements` table with:
  - `id` (primary key)
  - `name` (supplement name)
  - `scientific_name` (optional)
  - `common_names` (array of alternative names)
  - `embedding` (384-dimensional vector)
  - `metadata` (JSONB for flexible data)
  - `search_count` (popularity tracking)
  - `last_searched_at` (timestamp)
- Creates HNSW index for fast vector similarity search
- Creates helper functions:
  - `search_supplements()` - Vector similarity search
  - `increment_search_count()` - Track search popularity
  - `update_updated_at_column()` - Auto-update timestamps

**Index Configuration**:
- **HNSW** (Hierarchical Navigable Small World)
- **m = 16**: Connections per layer (balance speed/recall)
- **ef_construction = 64**: Build quality (higher = better recall)
- **Distance metric**: Cosine similarity

## Manual Migration

If you prefer to run migrations manually:

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name staging-intelligent-search \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

# Connect to database
PGPASSWORD='your-password' psql \
  -h $RDS_ENDPOINT \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f 001_setup_pgvector.sql
```

## Troubleshooting

### Error: "pgvector extension not found"

The RDS instance needs to have pgvector installed. For RDS Postgres 15.4+, pgvector is available by default. If not:

1. Check RDS engine version: `aws rds describe-db-instances --db-instance-identifier staging-supplements-db`
2. Upgrade to Postgres 15.4+ if needed
3. Enable pgvector in parameter group

### Error: "Could not connect to database"

1. Check security group allows your IP:
   ```bash
   aws ec2 describe-security-groups --group-ids <rds-security-group-id>
   ```

2. Temporarily allow your IP (for migration only):
   ```bash
   aws ec2 authorize-security-group-ingress \
     --group-id <rds-security-group-id> \
     --protocol tcp \
     --port 5432 \
     --cidr $(curl -s ifconfig.me)/32
   ```

3. **Remember to revoke after migration**:
   ```bash
   aws ec2 revoke-security-group-ingress \
     --group-id <rds-security-group-id> \
     --protocol tcp \
     --port 5432 \
     --cidr $(curl -s ifconfig.me)/32
   ```

### Error: "Stack not found"

Deploy the CloudFormation stack first:

```bash
cd infrastructure
./deploy-staging.sh
```

## Next Steps

After running migrations:

1. **Populate knowledge base**: Run `scripts/populate-knowledge-base.ts`
2. **Deploy Lambdas**: Deploy Embedding Generator and Search API
3. **Test vector search**: Run integration tests
4. **Monitor performance**: Check CloudWatch metrics

## Security Notes

- ⚠️ **Never commit database passwords** to git
- ⚠️ **Use AWS Secrets Manager** for production passwords
- ⚠️ **Restrict RDS security group** to Lambda security group only
- ⚠️ **Enable encryption at rest** (already configured in CloudFormation)
- ⚠️ **Enable automated backups** (7-day retention configured)

## Performance Tuning

### HNSW Index Parameters

Current settings (m=16, ef_construction=64) are optimized for:
- **Dataset size**: 100-10,000 supplements
- **Query latency**: < 50ms
- **Recall**: > 95%

For larger datasets (10K+), consider:
```sql
CREATE INDEX idx_supplements_embedding 
ON supplements 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 32, ef_construction = 128);
```

### Query Performance

Monitor query performance:
```sql
EXPLAIN ANALYZE 
SELECT * FROM search_supplements(
  '[0.1, 0.2, ...]'::vector(384),
  0.7,
  10
);
```

Target: < 50ms for 1000+ supplements

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
- [RDS Postgres Extensions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html#PostgreSQL.Concepts.General.Extensions)
