# Staging Deployment Guide - Intelligent Supplement Search

This guide walks through deploying the complete intelligent supplement search system to the staging environment.

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure
   ```

2. **PostgreSQL client** (psql) installed
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

3. **AWS Credentials** with permissions for:
   - CloudFormation
   - RDS
   - DynamoDB
   - ElastiCache
   - EFS
   - Lambda
   - CloudWatch
   - IAM

## Architecture Overview

The staging environment includes:

- **RDS Postgres** (db.t3.micro) with pgvector extension
- **DynamoDB** tables for cache and discovery queue
- **ElastiCache Redis** (cache.t3.micro) for L2 cache
- **EFS** for ML model storage
- **VPC** with public and private subnets
- **Security Groups** for network isolation
- **IAM Roles** for Lambda execution
- **CloudWatch** logs and alarms

## Deployment Steps

### Step 1: Deploy Infrastructure with CloudFormation

```bash
cd infrastructure
./deploy-staging.sh
```

This script will:
1. Validate the CloudFormation template
2. Prompt for RDS master password
3. Deploy the complete infrastructure stack
4. Display stack outputs

**Expected Duration:** 15-20 minutes

**What gets created:**
- VPC with 2 public and 2 private subnets
- RDS Postgres instance
- DynamoDB tables (supplement-cache, discovery-queue)
- ElastiCache Redis cluster
- EFS file system with access point
- Security groups and IAM roles
- CloudWatch log groups and alarms

### Step 2: Initialize RDS with pgvector

After the CloudFormation stack is deployed, initialize the database:

```bash
./init-rds-pgvector.sh staging
```

This script will:
1. Fetch RDS endpoint from CloudFormation outputs
2. Prompt for database credentials
3. Connect to RDS and execute initialization SQL
4. Enable pgvector extension
5. Create supplements table with vector column
6. Create HNSW index for fast similarity search
7. Create additional indexes for performance

**Expected Duration:** 1-2 minutes

**What gets created:**
- pgvector extension
- supplements table with 384-dim vector column
- HNSW index for vector similarity search
- Indexes on search_count and name
- Trigger for auto-updating updated_at timestamp

### Step 3: Verify Infrastructure

Check that all resources are created:

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name staging-intelligent-search \
  --query 'Stacks[0].StackStatus'

# Check RDS instance
aws rds describe-db-instances \
  --db-instance-identifier staging-supplements-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Check DynamoDB tables
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `staging`)]'

# Check ElastiCache cluster
aws elasticache describe-cache-clusters \
  --cache-cluster-id staging-supplements-redis \
  --query 'CacheClusters[0].CacheClusterStatus'

# Check EFS file system
aws efs describe-file-systems \
  --query 'FileSystems[?Tags[?Key==`Environment` && Value==`staging`]]'
```

All resources should show status as "available" or "active".

## Stack Outputs

After deployment, the following outputs are available:

| Output | Description | Usage |
|--------|-------------|-------|
| VPCId | VPC ID | For Lambda VPC configuration |
| PrivateSubnet1Id | Private Subnet 1 | For Lambda VPC configuration |
| PrivateSubnet2Id | Private Subnet 2 | For Lambda VPC configuration |
| LambdaSecurityGroupId | Lambda Security Group | For Lambda VPC configuration |
| RDSEndpoint | RDS Postgres endpoint | For database connections |
| RDSPort | RDS Postgres port | For database connections |
| RedisEndpoint | ElastiCache Redis endpoint | For cache connections |
| RedisPort | ElastiCache Redis port | For cache connections |
| SupplementCacheTableName | DynamoDB cache table | For cache operations |
| DiscoveryQueueTableName | DynamoDB queue table | For discovery operations |
| EFSFileSystemId | EFS file system ID | For Lambda EFS mount |
| EFSAccessPointId | EFS access point ID | For Lambda EFS mount |
| LambdaExecutionRoleArn | Lambda execution role | For Lambda functions |

## Next Steps

After infrastructure deployment:

1. **Deploy Lambda Functions** (Task 14.2)
   - Search API
   - Embedding generator
   - Discovery worker

2. **Upload ML Model to EFS**
   - Download Sentence Transformers model
   - Upload to EFS via Lambda or EC2

3. **Run Smoke Tests** (Task 14.3)
   - Test basic search functionality
   - Verify cache is working
   - Check CloudWatch dashboards
   - Verify X-Ray traces

## Cost Estimate

Staging environment monthly costs:

```
RDS Postgres (db.t3.micro):     $0 (free tier) or $15/month
DynamoDB (on-demand):           $1-5/month
ElastiCache Redis (t3.micro):   $12/month
EFS (1GB):                      $0 (free tier) or $0.30/month
Lambda:                         $0 (free tier)
CloudWatch Logs:                $1/month
VPC/Networking:                 $0
────────────────────────────────────────────
Total:                          $14-33/month
```

## Troubleshooting

### CloudFormation Stack Fails

Check stack events:
```bash
aws cloudformation describe-stack-events \
  --stack-name staging-intelligent-search \
  --max-items 20
```

### Cannot Connect to RDS

1. Check security group allows connections from your IP
2. Verify RDS is in "available" state
3. Check VPC and subnet configuration
4. Ensure password is correct

### pgvector Extension Not Available

RDS Postgres 15.4+ includes pgvector by default. If not available:
1. Check Postgres version: `SELECT version();`
2. Upgrade to Postgres 15.4 or later
3. Contact AWS support

### EFS Mount Issues

1. Check EFS is in "available" state
2. Verify mount targets are created in both AZs
3. Check security group allows NFS (port 2049)
4. Verify Lambda is in same VPC as EFS

## Cleanup

To delete the staging environment:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name staging-intelligent-search

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name staging-intelligent-search
```

**Warning:** This will delete all data in RDS, DynamoDB, and EFS. Make sure to backup any important data first.

## Security Notes

1. **RDS Password**: Store securely in AWS Secrets Manager or Parameter Store
2. **VPC**: RDS and Redis are in private subnets, not publicly accessible
3. **Security Groups**: Restrict access to only necessary ports and sources
4. **IAM Roles**: Follow principle of least privilege
5. **Encryption**: RDS and EFS use encryption at rest

## Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Review CloudFormation events
3. Consult AWS documentation
4. Contact team lead or DevOps
