# LanceDB Deployment Guide

Complete guide for deploying the SuplementIA LanceDB vector search stack.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Python 3.11+
- `jq` installed (for JSON parsing)
- Access to AWS account with permissions for:
  - CloudFormation
  - Lambda
  - EFS
  - DynamoDB
  - VPC
  - IAM

## Quick Start

```bash
# Deploy complete stack
cd infrastructure
./deploy-lancedb-stack.sh production alerts@suplementia.com
```

## Step-by-Step Deployment

### Step 1: Deploy Infrastructure

```bash
cd infrastructure

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation/lancedb-stack.yml \
  --stack-name production-lancedb \
  --parameter-overrides \
    Environment=production \
    AlertEmail=alerts@suplementia.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Wait time**: ~10 minutes

**Resources created**:
- VPC with 2 private subnets
- EFS file system with 2 mount targets
- 2 DynamoDB tables (cache + discovery queue)
- 2 Lambda functions (search-api + discovery-worker)
- Security groups
- IAM roles
- CloudWatch alarms

### Step 2: Download ML Model to EFS

**Option A: Using EC2 Instance**

```bash
# 1. Launch EC2 instance in same VPC
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --subnet-id <SUBNET_ID> \
  --security-group-ids <SECURITY_GROUP_ID>

# 2. SSH into instance
ssh ec2-user@<INSTANCE_IP>

# 3. Install dependencies
sudo yum install -y amazon-efs-utils python3-pip
pip3 install sentence-transformers

# 4. Mount EFS
sudo mkdir -p /mnt/efs
sudo mount -t efs <EFS_ID>:/ /mnt/efs

# 5. Download model
export EFS_PATH=/mnt/efs/models
python3 download-model-to-efs.py

# 6. Verify
ls -lh /mnt/efs/models/all-MiniLM-L6-v2/

# 7. Terminate instance
exit
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
```

**Option B: Using Lambda (One-time)**

Create a temporary Lambda function with EFS access and run the download script.

### Step 3: Migrate Data to LanceDB

```bash
# Run migration script
cd backend/scripts
export LANCEDB_PATH=/mnt/efs/suplementia-lancedb
export MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2
python3 migrate-to-lancedb.py
```

**Expected output**:
```
==========================================
Starting migration of 70 supplements
==========================================

[1/70] Processing: Vitamin D
  ✓ Generated embedding (384 dims)
  ✓ Inserted into LanceDB (ID: 1)
...

==========================================
Migration complete!
  ✓ Migrated: 70
  ✗ Failed: 0
==========================================
```

### Step 4: Deploy Lambda Functions

```bash
# Deploy Search API
cd backend/lambda/search-api-lancedb
./deploy.sh production

# Deploy Discovery Worker
cd ../discovery-worker-lancedb
./deploy.sh production
```

### Step 5: Verify Deployment

```bash
# Test Search API
aws lambda invoke \
  --function-name production-search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  response.json

cat response.json | jq .
```

**Expected response**:
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "supplement": {
      "name": "Vitamin D",
      "scientificName": "Cholecalciferol",
      "similarity": 0.95
    },
    "cacheHit": false,
    "source": "lancedb"
  }
}
```

## Monitoring

### CloudWatch Dashboards

```bash
# View Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=production-search-api-lancedb \
  --start-time 2025-11-26T00:00:00Z \
  --end-time 2025-11-26T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

### Key Metrics to Monitor

- **Lambda Duration**: P50, P95, P99 (target: < 200ms)
- **Lambda Errors**: Count (target: < 1%)
- **DynamoDB Read Capacity**: Units consumed
- **EFS Throughput**: MiB/s
- **Cache Hit Rate**: Percentage (target: ≥ 85%)

### CloudWatch Alarms

Alarms are automatically created for:
- High error rate (> 1%)
- High latency (P95 > 300ms)

Notifications sent to: `alerts@suplementia.com`

## Cost Monitoring

### View Current Costs

```bash
# Get cost for last 30 days
aws ce get-cost-and-usage \
  --time-period Start=2025-10-27,End=2025-11-26 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json
```

**cost-filter.json**:
```json
{
  "Tags": {
    "Key": "Project",
    "Values": ["SuplementIA"]
  }
}
```

### Expected Monthly Costs

| Service | Cost |
|---------|------|
| DynamoDB | $0.39 |
| EFS | $4.00 |
| Lambda | $0.00 (free tier) |
| CloudWatch | $1.20 |
| **Total** | **$5.59** |

## Troubleshooting

### Lambda Function Errors

```bash
# View recent logs
aws logs tail /aws/lambda/production-search-api-lancedb --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/production-search-api-lancedb \
  --filter-pattern "ERROR"
```

### EFS Mount Issues

```bash
# Check EFS mount targets
aws efs describe-mount-targets \
  --file-system-id <EFS_ID>

# Verify security groups allow NFS (port 2049)
aws ec2 describe-security-groups \
  --group-ids <SECURITY_GROUP_ID>
```

### LanceDB Issues

```bash
# Connect to Lambda and check LanceDB
aws lambda invoke \
  --function-name production-search-api-lancedb \
  --payload '{"action":"debug"}' \
  debug.json

# Check EFS contents
# (requires EC2 instance with EFS mounted)
ls -lh /mnt/efs/suplementia-lancedb/
```

## Rollback

### Rollback Lambda Functions

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name production-search-api-lancedb

# Rollback to previous version
aws lambda update-alias \
  --function-name production-search-api-lancedb \
  --name production \
  --function-version <PREVIOUS_VERSION>
```

### Rollback Stack

```bash
# Delete stack
aws cloudformation delete-stack \
  --stack-name production-lancedb

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name production-lancedb
```

## Cleanup

```bash
# Delete all resources
aws cloudformation delete-stack --stack-name production-lancedb

# Verify deletion
aws cloudformation describe-stacks --stack-name production-lancedb
```

## Performance Tuning

### Lambda Memory Optimization

Test different memory configurations:

```bash
# Test with 512MB (current)
aws lambda update-function-configuration \
  --function-name production-search-api-lancedb \
  --memory-size 512

# Test with 1024MB
aws lambda update-function-configuration \
  --function-name production-search-api-lancedb \
  --memory-size 1024
```

### Provisioned Concurrency

Eliminate cold starts:

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name production-search-api-lancedb \
  --provisioned-concurrent-executions 2 \
  --qualifier production
```

**Cost**: ~$10/month for 2 instances

### EFS Throughput Mode

Switch to provisioned throughput if needed:

```bash
aws efs update-file-system \
  --file-system-id <EFS_ID> \
  --throughput-mode provisioned \
  --provisioned-throughput-in-mibps 10
```

## Security Best Practices

- ✅ EFS encrypted at rest
- ✅ Lambda in private subnets
- ✅ Security groups restrict access
- ✅ IAM roles follow least privilege
- ✅ CloudWatch logging enabled
- ✅ DynamoDB encryption enabled

## Support

For issues or questions:
- Check CloudWatch logs
- Review CloudWatch alarms
- Contact DevOps team

---

**Last Updated**: 2025-11-26  
**Version**: 1.0.0  
**Estimated Deployment Time**: 2-3 hours
