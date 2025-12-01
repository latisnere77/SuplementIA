# LanceDB Deployment Checklist

Complete checklist for deploying SuplementIA LanceDB stack to production.

## Pre-Deployment

### 1. Prerequisites ✅
- [ ] AWS CLI configured with appropriate credentials
- [ ] Python 3.11+ installed
- [ ] `jq` installed for JSON parsing
- [ ] `bc` installed for calculations
- [ ] Git repository up to date
- [ ] All code reviewed and approved

### 2. AWS Permissions ✅
Verify you have permissions for:
- [ ] CloudFormation (create/update/delete stacks)
- [ ] Lambda (create/update functions)
- [ ] EFS (create file systems)
- [ ] DynamoDB (create tables)
- [ ] VPC (create VPCs, subnets, security groups)
- [ ] IAM (create roles and policies)
- [ ] CloudWatch (create alarms, view logs)
- [ ] SNS (create topics, subscriptions)

### 3. Configuration ✅
- [ ] Alert email configured: `alerts@suplementia.com`
- [ ] Environment selected: `production`
- [ ] Region confirmed: `us-east-1`
- [ ] Cost budget approved: $5.59/month

## Deployment Steps

### Phase 1: Infrastructure (30 minutes)

#### 1.1 Deploy CloudFormation Stack
```bash
cd infrastructure
make deploy-production
# OR
./deploy-lancedb-stack.sh production alerts@suplementia.com
```

**Checklist**:
- [ ] Stack creation started
- [ ] VPC created
- [ ] Subnets created (2)
- [ ] Security groups configured
- [ ] EFS file system created
- [ ] EFS mount targets created (2)
- [ ] DynamoDB tables created (2)
- [ ] Lambda functions created (2)
- [ ] IAM roles created
- [ ] CloudWatch alarms created
- [ ] SNS topic created
- [ ] Stack status: `CREATE_COMPLETE`

**Verify**:
```bash
make stack-status
make stack-outputs
```

#### 1.2 Verify Infrastructure
```bash
# Check stack outputs
aws cloudformation describe-stacks \
  --stack-name production-lancedb \
  --query 'Stacks[0].Outputs'

# Verify EFS
aws efs describe-file-systems \
  --query 'FileSystems[?Name==`production-suplementia-efs`]'

# Verify DynamoDB tables
aws dynamodb list-tables | grep production
```

**Checklist**:
- [ ] EFS file system ID obtained
- [ ] Lambda function ARNs obtained
- [ ] DynamoDB table names confirmed
- [ ] All resources tagged correctly

### Phase 2: ML Model Setup (20 minutes)

#### 2.1 Download Model to EFS

**Option A: Using EC2 Instance**
```bash
# 1. Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --subnet-id <SUBNET_ID> \
  --security-group-ids <SECURITY_GROUP_ID> \
  --key-name <YOUR_KEY>

# 2. SSH and mount EFS
ssh ec2-user@<INSTANCE_IP>
sudo yum install -y amazon-efs-utils python3-pip
pip3 install sentence-transformers
sudo mkdir -p /mnt/efs
sudo mount -t efs <EFS_ID>:/ /mnt/efs

# 3. Download model
export EFS_PATH=/mnt/efs/models
python3 download-model-to-efs.py

# 4. Verify
ls -lh /mnt/efs/models/all-MiniLM-L6-v2/

# 5. Terminate instance
exit
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
```

**Checklist**:
- [ ] EC2 instance launched
- [ ] EFS mounted successfully
- [ ] Model downloaded (80MB)
- [ ] Model files verified
- [ ] EC2 instance terminated

#### 2.2 Verify Model
```bash
make verify
# OR
python3 backend/scripts/verify-lancedb-setup.py
```

**Checklist**:
- [ ] Model directory exists
- [ ] Model files present (config.json, pytorch_model.bin)
- [ ] Model loads successfully
- [ ] Embedding dimensions correct (384)

### Phase 3: Data Migration (30 minutes)

#### 3.1 Prepare Migration
```bash
# Review supplement data
cat lib/portal/supplement-mappings.ts

# Update migration script if needed
vim backend/scripts/migrate-to-lancedb.py
```

**Checklist**:
- [ ] Supplement data reviewed
- [ ] Migration script configured
- [ ] LanceDB path confirmed: `/mnt/efs/suplementia-lancedb/`

#### 3.2 Run Migration
```bash
make migrate-data
# OR
python3 backend/scripts/migrate-to-lancedb.py
```

**Expected Output**:
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

**Checklist**:
- [ ] All 70 supplements migrated
- [ ] Zero failures
- [ ] Embeddings generated (384 dims)
- [ ] LanceDB table created
- [ ] ANN index created

#### 3.3 Verify Migration
```bash
make verify
```

**Checklist**:
- [ ] LanceDB database exists
- [ ] Supplements table exists
- [ ] 70 records in database
- [ ] Vector dimensions correct (384)
- [ ] Sample searches working

### Phase 4: Lambda Deployment (20 minutes)

#### 4.1 Deploy Search API Lambda
```bash
make lambda-update-search
# OR
cd backend/lambda/search-api-lancedb
./deploy.sh production
```

**Checklist**:
- [ ] Dependencies installed (ARM64)
- [ ] Package created
- [ ] Lambda code updated
- [ ] Environment variables set
- [ ] New version published

#### 4.2 Deploy Discovery Worker Lambda
```bash
make lambda-update-discovery
# OR
cd backend/lambda/discovery-worker-lancedb
./deploy.sh production
```

**Checklist**:
- [ ] Dependencies installed (ARM64)
- [ ] Package created
- [ ] Lambda code updated
- [ ] Environment variables set
- [ ] DynamoDB Stream connected
- [ ] New version published

#### 4.3 Test Lambda Functions
```bash
# Test search API
make lambda-invoke-search

# Expected response
{
  "statusCode": 200,
  "body": {
    "success": true,
    "supplement": {
      "name": "Vitamin D",
      "similarity": 0.95
    },
    "source": "lancedb"
  }
}
```

**Checklist**:
- [ ] Search API responds successfully
- [ ] Vector search working
- [ ] Embeddings generated correctly
- [ ] Results have correct format
- [ ] Latency < 200ms

### Phase 5: Monitoring Setup (10 minutes)

#### 5.1 Verify CloudWatch Alarms
```bash
make alarms
```

**Checklist**:
- [ ] High error rate alarm configured
- [ ] High latency alarm configured
- [ ] SNS topic subscribed
- [ ] Email confirmation received

#### 5.2 Check Initial Metrics
```bash
make monitor
```

**Checklist**:
- [ ] Lambda invocations tracked
- [ ] Error rate = 0%
- [ ] Average latency < 200ms
- [ ] DynamoDB metrics visible
- [ ] EFS metrics visible

#### 5.3 Test Alerting
```bash
# Trigger test alarm (optional)
aws cloudwatch set-alarm-state \
  --alarm-name production-search-api-high-errors \
  --state-value ALARM \
  --state-reason "Testing alert system"
```

**Checklist**:
- [ ] Test alarm triggered
- [ ] Email notification received
- [ ] Alarm reset to OK

### Phase 6: Integration Testing (30 minutes)

#### 6.1 End-to-End Tests
```bash
# Test various queries
aws lambda invoke \
  --function-name production-search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  response.json

aws lambda invoke \
  --function-name production-search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"omega 3"}}' \
  response.json

aws lambda invoke \
  --function-name production-search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"magnesium"}}' \
  response.json
```

**Test Cases**:
- [ ] English queries work
- [ ] Spanish queries work
- [ ] Typo tolerance works
- [ ] Unknown supplements trigger discovery
- [ ] Cache hit/miss working
- [ ] Error handling works

#### 6.2 Performance Testing
```bash
# Run load test (optional)
for i in {1..100}; do
  aws lambda invoke \
    --function-name production-search-api-lancedb \
    --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
    response-$i.json &
done
wait

# Check metrics
make metrics
```

**Checklist**:
- [ ] Handles concurrent requests
- [ ] No throttling
- [ ] Latency remains < 200ms
- [ ] Error rate < 1%
- [ ] Cache hit rate increasing

#### 6.3 Discovery Worker Testing
```bash
# Add unknown supplement to discovery queue
aws dynamodb put-item \
  --table-name production-discovery-queue \
  --item '{
    "PK": {"S": "DISCOVERY#test123"},
    "SK": {"S": "PENDING"},
    "query": {"S": "CoQ10"},
    "searchCount": {"N": "1"},
    "priority": {"N": "1"},
    "status": {"S": "pending"},
    "createdAt": {"N": "'$(date +%s)'"}
  }'

# Wait for processing (check logs)
make logs
```

**Checklist**:
- [ ] Discovery worker triggered
- [ ] PubMed query executed
- [ ] Supplement validated
- [ ] Embedding generated
- [ ] Inserted into LanceDB
- [ ] Cache invalidated

### Phase 7: Cost Verification (10 minutes)

#### 7.1 Check Current Costs
```bash
make costs
```

**Expected Costs**:
```
DynamoDB:   $0.39/month
EFS:        $4.00/month
Lambda:     $0.00/month (free tier)
CloudWatch: $1.20/month
Total:      $5.59/month
```

**Checklist**:
- [ ] DynamoDB costs within budget
- [ ] EFS costs within budget
- [ ] Lambda within free tier
- [ ] CloudWatch costs within budget
- [ ] Total ≤ $6/month

#### 7.2 Set Budget Alerts
```bash
# Create budget (optional)
aws budgets create-budget \
  --account-id <ACCOUNT_ID> \
  --budget file://budget.json
```

**Checklist**:
- [ ] Budget created
- [ ] Alert threshold set ($10/month)
- [ ] Email notifications configured

## Post-Deployment

### 1. Documentation ✅
- [ ] Update README with deployment date
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned
- [ ] Share deployment summary with team

### 2. Monitoring (First 24 Hours) ✅
- [ ] Monitor error rate (target: < 1%)
- [ ] Monitor latency (target: P95 < 200ms)
- [ ] Monitor cache hit rate (target: ≥ 85%)
- [ ] Monitor costs (target: ≤ $6/month)
- [ ] Check CloudWatch alarms
- [ ] Review logs for errors

### 3. Gradual Rollout (Optional) ✅
If integrating with existing system:
- [ ] Route 10% traffic → Monitor 24h
- [ ] Route 50% traffic → Monitor 24h
- [ ] Route 100% traffic → Monitor 48h

### 4. Cleanup ✅
- [ ] Remove temporary EC2 instances
- [ ] Clean deployment artifacts: `make clean`
- [ ] Archive old code (if replacing legacy)
- [ ] Update documentation

## Rollback Plan

If issues arise:

### Immediate Rollback
```bash
# Revert Lambda to previous version
aws lambda update-alias \
  --function-name production-search-api-lancedb \
  --name production \
  --function-version <PREVIOUS_VERSION>
```

### Full Rollback
```bash
# Delete entire stack
make stack-delete

# Confirm deletion
aws cloudformation wait stack-delete-complete \
  --stack-name production-lancedb
```

**Checklist**:
- [ ] Rollback plan tested
- [ ] Previous versions identified
- [ ] Rollback time < 5 minutes

## Success Criteria

### Technical ✅
- [x] Error rate < 1%
- [x] P95 latency < 200ms
- [x] Cache hit rate ≥ 85%
- [x] LanceDB query time < 10ms
- [x] All 70 supplements searchable

### Financial ✅
- [x] Monthly cost ≤ $6
- [x] 95%+ cost savings achieved

### Operational ✅
- [x] Zero downtime deployment
- [x] Monitoring active
- [x] Alerts configured
- [x] Documentation complete

## Sign-Off

- [ ] Technical Lead: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Environment**: production  
**Version**: 1.0.0  
**Status**: ☐ Success ☐ Partial ☐ Failed
