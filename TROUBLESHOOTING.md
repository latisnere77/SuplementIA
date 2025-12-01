# SuplementIA Troubleshooting Guide

This guide covers common issues and solutions for the LanceDB-based intelligent supplement search system.

## Table of Contents

- [Infrastructure Issues](#infrastructure-issues)
- [Lambda Function Issues](#lambda-function-issues)
- [EFS and Storage Issues](#efs-and-storage-issues)
- [LanceDB Issues](#lancedb-issues)
- [Cache Issues](#cache-issues)
- [Discovery Queue Issues](#discovery-queue-issues)
- [Performance Issues](#performance-issues)
- [Frontend Issues](#frontend-issues)
- [Monitoring and Debugging](#monitoring-and-debugging)

---

## Infrastructure Issues

### CloudFormation Stack Creation Fails

**Symptoms:**
- Stack status shows `CREATE_FAILED` or `ROLLBACK_COMPLETE`
- Resources not created

**Diagnosis:**
```bash
aws cloudformation describe-stack-events \
  --stack-name staging-lancedb-search \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

**Common Causes:**

1. **Insufficient IAM Permissions**
   - **Solution:** Ensure your AWS user/role has permissions for CloudFormation, Lambda, EFS, DynamoDB, VPC, IAM

2. **VPC Limit Reached**
   - **Solution:** Delete unused VPCs or request limit increase

3. **EFS Mount Target Limit**
   - **Solution:** Delete unused mount targets or request limit increase

4. **Invalid Parameter Values**
   - **Solution:** Check CloudFormation template parameters match requirements

**Resolution:**
```bash
# Delete failed stack
aws cloudformation delete-stack --stack-name staging-lancedb-search

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name staging-lancedb-search

# Redeploy with correct parameters
cd infrastructure
./deploy-lancedb-stack.sh staging your-email@example.com
```

---

## Lambda Function Issues

### Lambda Function Timeout

**Symptoms:**
- Lambda execution exceeds timeout (30s default)
- Error: "Task timed out after 30.00 seconds"

**Diagnosis:**
```bash
aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep "Task timed out"
```

**Common Causes:**

1. **Cold Start with Model Loading**
   - **Solution:** Model should be cached after first invocation. If persistent, increase memory/timeout:
   ```bash
   aws lambda update-function-configuration \
     --function-name staging-search-api-lancedb \
     --timeout 60 \
     --memory-size 2048
   ```

2. **EFS Mount Delay**
   - **Solution:** Ensure Lambda is in VPC with EFS mount targets. Check security groups allow NFS (port 2049)

3. **DynamoDB Throttling**
   - **Solution:** Tables use on-demand pricing. Check CloudWatch metrics for throttling

**Resolution:**
- Increase Lambda timeout and memory
- Use provisioned concurrency for critical functions
- Optimize code to reduce execution time

### Lambda Cannot Access EFS

**Symptoms:**
- Error: "No such file or directory: /mnt/efs/..."
- Model loading fails

**Diagnosis:**
```bash
# Check Lambda VPC configuration
aws lambda get-function-configuration \
  --function-name staging-search-api-lancedb \
  --query 'VpcConfig'

# Check EFS mount
aws lambda get-function-configuration \
  --function-name staging-search-api-lancedb \
  --query 'FileSystemConfigs'
```

**Common Causes:**

1. **Lambda Not in VPC**
   - **Solution:** Lambda must be in same VPC as EFS mount targets

2. **Security Group Rules**
   - **Solution:** Lambda security group must allow outbound to EFS security group on port 2049

3. **EFS Not Mounted**
   - **Solution:** Check FileSystemConfigs in Lambda configuration

**Resolution:**
```bash
# Verify EFS mount
cd infrastructure
./verify-efs-directories.sh staging

# Reconfigure if needed
./configure-efs-mount.sh staging
```

### Lambda Out of Memory

**Symptoms:**
- Error: "Runtime exited with error: signal: killed"
- Lambda execution stops abruptly

**Diagnosis:**
```bash
aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep "Memory"
```

**Solution:**
```bash
# Increase memory allocation
aws lambda update-function-configuration \
  --function-name staging-search-api-lancedb \
  --memory-size 2048
```

**Note:** Model loading requires ~500MB. Recommend 1024MB minimum, 2048MB for production.

---

## EFS and Storage Issues

### EFS Mount Fails

**Symptoms:**
- Lambda cannot access `/mnt/efs/`
- Error: "Transport endpoint is not connected"

**Diagnosis:**
```bash
# Check EFS file system
aws efs describe-file-systems --query 'FileSystems[?Name==`suplementia-lancedb`]'

# Check mount targets
aws efs describe-mount-targets --file-system-id fs-xxx
```

**Common Causes:**

1. **Mount Targets Not in Lambda Subnets**
   - **Solution:** Create mount targets in same subnets as Lambda

2. **Security Group Misconfiguration**
   - **Solution:** EFS security group must allow inbound from Lambda security group on port 2049

3. **EFS Not Available**
   - **Solution:** Check EFS lifecycle state is "available"

**Resolution:**
```bash
# Verify mount targets
aws efs describe-mount-targets --file-system-id fs-xxx

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Reconfigure EFS mount
cd infrastructure
./configure-efs-mount.sh staging
```

### Model Files Not Found

**Symptoms:**
- Error: "Model not found at /mnt/efs/models/all-MiniLM-L6-v2/"
- Embedding generation fails

**Diagnosis:**
```bash
# List EFS contents (requires EC2 instance with EFS mounted)
# Or check Lambda logs for file listing
aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep "model"
```

**Solution:**
```bash
# Re-upload model
cd backend/lambda
python3 download-model-to-efs.py

# Verify upload
python3 test-model-loading.py
```

### EFS Performance Issues

**Symptoms:**
- Slow model loading (> 5 seconds)
- High latency on first request

**Diagnosis:**
```bash
# Check EFS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EFS \
  --metric-name TotalIOBytes \
  --dimensions Name=FileSystemId,Value=fs-xxx \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**Solution:**
- EFS uses bursting throughput mode by default
- For consistent performance, consider provisioned throughput
- Model should be cached in Lambda memory after first load

---

## LanceDB Issues

### LanceDB Database Not Found

**Symptoms:**
- Error: "Database not found at /mnt/efs/suplementia-lancedb/"
- Vector search fails

**Diagnosis:**
```bash
# Check if database exists
aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep "lancedb"
```

**Solution:**
```bash
# Initialize LanceDB
cd backend/lambda
python3 initialize-lancedb.py

# Verify initialization
python3 test_lancedb_properties.py
```

### Vector Search Returns No Results

**Symptoms:**
- All searches return empty results
- Similarity scores are very low (< 0.5)

**Diagnosis:**
```bash
# Check if supplements are in database
# Run test query
cd backend/lambda
python3 -c "
import lancedb
db = lancedb.connect('/mnt/efs/suplementia-lancedb')
table = db.open_table('supplements')
print(f'Total supplements: {len(table.to_pandas())}')
"
```

**Common Causes:**

1. **Database Empty**
   - **Solution:** Run migration script to populate data
   ```bash
   cd backend/scripts
   python3 migrate-to-lancedb.py
   ```

2. **Embeddings Not Generated**
   - **Solution:** Verify embeddings are 384-dimensional
   ```bash
   python3 validate-migration-data.py
   ```

3. **Index Not Created**
   - **Solution:** Create HNSW index
   ```bash
   cd backend/lambda
   python3 create-lancedb-index.py
   ```

### Vector Dimension Mismatch

**Symptoms:**
- Error: "Expected 384 dimensions, got X"
- Search fails with dimension error

**Diagnosis:**
```bash
# Check embedding dimensions
cd backend/lambda
python3 test_embedding_properties.py
```

**Solution:**
- Ensure using all-MiniLM-L6-v2 model (384 dimensions)
- Regenerate embeddings if using wrong model
- Verify model files are complete

---

## Cache Issues

### Cache Always Misses

**Symptoms:**
- Cache hit rate < 10%
- All searches go to LanceDB

**Diagnosis:**
```bash
# Check DynamoDB table
aws dynamodb scan --table-name supplement-cache --limit 10

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=supplement-cache \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Common Causes:**

1. **Cache Not Being Written**
   - **Solution:** Check Lambda logs for cache write errors
   ```bash
   aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep "cache"
   ```

2. **TTL Expiring Too Quickly**
   - **Solution:** Verify TTL is set to 7 days (604800 seconds)
   ```bash
   cd backend/lambda
   python3 test_cache_properties.py
   ```

3. **Query Normalization Issues**
   - **Solution:** Ensure queries are normalized consistently (lowercase, trimmed)

**Resolution:**
```bash
# Test cache operations
cd backend/lambda
python3 test_cache_properties.py

# Check cache hit rate
python3 test_performance.py
```

### DynamoDB Throttling

**Symptoms:**
- Error: "ProvisionedThroughputExceededException"
- Slow cache operations

**Diagnosis:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=supplement-cache \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Solution:**
- Tables use on-demand pricing (should auto-scale)
- If persistent, check for hot partitions
- Consider using DAX for read-heavy workloads

---

## Discovery Queue Issues

### Discovery Worker Not Triggered

**Symptoms:**
- Unknown supplements not being processed
- Discovery queue growing but no processing

**Diagnosis:**
```bash
# Check DynamoDB Streams
aws dynamodb describe-table \
  --table-name discovery-queue \
  --query 'Table.StreamSpecification'

# Check Lambda event source mapping
aws lambda list-event-source-mappings \
  --function-name staging-discovery-worker-lancedb
```

**Common Causes:**

1. **DynamoDB Streams Not Enabled**
   - **Solution:** Enable streams on discovery-queue table
   ```bash
   aws dynamodb update-table \
     --table-name discovery-queue \
     --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
   ```

2. **Event Source Mapping Not Created**
   - **Solution:** Create mapping between Streams and Lambda
   ```bash
   aws lambda create-event-source-mapping \
     --function-name staging-discovery-worker-lancedb \
     --event-source-arn arn:aws:dynamodb:us-east-1:xxx:table/discovery-queue/stream/xxx \
     --starting-position LATEST
   ```

3. **Lambda Execution Role Missing Permissions**
   - **Solution:** Add DynamoDB Streams permissions to Lambda role

**Resolution:**
```bash
# Test discovery queue
cd backend/lambda
python3 test_discovery_queue_properties.py

# Check worker logs
aws logs tail /aws/lambda/staging-discovery-worker-lancedb --follow
```

### PubMed Validation Fails

**Symptoms:**
- Discovery worker processes items but doesn't insert supplements
- Error: "PubMed API error"

**Diagnosis:**
```bash
aws logs tail /aws/lambda/staging-discovery-worker-lancedb --since 1h | grep "pubmed"
```

**Common Causes:**

1. **PubMed API Rate Limiting**
   - **Solution:** Implement exponential backoff and retry logic

2. **Invalid Query Format**
   - **Solution:** Check query formatting for PubMed API

3. **Network Issues**
   - **Solution:** Ensure Lambda has internet access (NAT Gateway or VPC endpoints)

**Resolution:**
- Add retry logic with exponential backoff
- Implement circuit breaker pattern
- Monitor PubMed API status

---

## Performance Issues

### High Latency (> 200ms)

**Symptoms:**
- Search responses take > 200ms
- P95 latency exceeds target

**Diagnosis:**
```bash
# Run performance tests
cd scripts
./run-performance-tests.sh

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=staging-search-api-lancedb \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,p95
```

**Common Causes:**

1. **Cold Starts**
   - **Solution:** Use provisioned concurrency for critical functions
   ```bash
   aws lambda put-provisioned-concurrency-config \
     --function-name staging-search-api-lancedb \
     --provisioned-concurrent-executions 2
   ```

2. **Cache Misses**
   - **Solution:** Improve cache hit rate (target >= 85%)
   - Pre-populate cache for common queries

3. **Slow Vector Search**
   - **Solution:** Verify HNSW index is created
   - Optimize index parameters (num_partitions, num_sub_vectors)

4. **Model Loading Delay**
   - **Solution:** Model should be cached after first load
   - Increase Lambda memory for faster loading

**Resolution:**
```bash
# Benchmark performance
cd backend/lambda
python3 test_performance.py

# Optimize based on bottlenecks identified
```

### Low Throughput (< 100 req/sec)

**Symptoms:**
- System cannot handle 100 concurrent requests
- High error rate under load

**Diagnosis:**
```bash
# Run load test
cd backend/lambda
python3 test_performance.py  # Includes concurrent load test
```

**Solution:**
- Increase Lambda concurrency limits
- Optimize DynamoDB capacity
- Use connection pooling
- Implement request queuing

---

## Frontend Issues

### API Endpoint Not Reachable

**Symptoms:**
- Frontend cannot connect to API
- CORS errors in browser console

**Diagnosis:**
```bash
# Test API endpoint
curl -X GET "https://xxx.execute-api.us-east-1.amazonaws.com/prod/search?q=vitamin+d"

# Check CORS configuration
aws apigateway get-integration-response \
  --rest-api-id xxx \
  --resource-id xxx \
  --http-method GET \
  --status-code 200
```

**Common Causes:**

1. **Wrong API URL**
   - **Solution:** Verify `NEXT_PUBLIC_SEARCH_API_URL` in `.env.local`

2. **CORS Not Configured**
   - **Solution:** Add CORS headers to API Gateway responses
   ```yaml
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```

3. **API Gateway Not Deployed**
   - **Solution:** Deploy API Gateway stage
   ```bash
   aws apigateway create-deployment \
     --rest-api-id xxx \
     --stage-name prod
   ```

**Resolution:**
```bash
# Test frontend integration
cd scripts
tsx test-search-integration.ts
```

### Error Messages Not Displaying

**Symptoms:**
- Errors occur but no user-friendly message shown
- Generic error instead of specific message

**Diagnosis:**
```bash
# Check error handling
cd scripts
tsx test-error-message-property.ts
```

**Solution:**
- Verify ErrorMessage component is imported
- Check error response format matches expected structure
- Review error-responses.ts for proper formatting

### Retry Logic Not Working

**Symptoms:**
- Timeouts don't trigger retry
- Consecutive failures not tracked

**Diagnosis:**
- Check browser console for retry attempts
- Review useIntelligentSearch hook implementation

**Solution:**
- Verify retry configuration in useIntelligentSearch
- Check retryable error codes (408, 429, 5xx)
- Ensure exponential backoff is working

---

## Monitoring and Debugging

### CloudWatch Logs

**View Lambda Logs:**
```bash
# Tail logs in real-time
aws logs tail /aws/lambda/staging-search-api-lancedb --follow

# Search for errors
aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep ERROR

# Filter by request ID
aws logs filter-log-events \
  --log-group-name /aws/lambda/staging-search-api-lancedb \
  --filter-pattern "request-id-xxx"
```

**View API Gateway Logs:**
```bash
aws logs tail /aws/apigateway/staging-search-api --follow
```

### X-Ray Tracing

**View Traces:**
```bash
# Get trace summaries
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)

# Get specific trace
aws xray batch-get-traces --trace-ids xxx
```

**Analyze Performance:**
- Open X-Ray console
- View service map
- Identify slow segments
- Optimize bottlenecks

### CloudWatch Metrics

**Key Metrics to Monitor:**

1. **Lambda Duration**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Duration \
     --dimensions Name=FunctionName,Value=staging-search-api-lancedb \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average,Maximum,p95
   ```

2. **Lambda Errors**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=staging-search-api-lancedb \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

3. **DynamoDB Consumed Capacity**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=supplement-cache \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

### Diagnostic Scripts

**Run All Diagnostics:**
```bash
# Infrastructure verification
cd infrastructure
./verify-deployment.sh staging

# Performance tests
cd scripts
./run-performance-tests.sh

# Integration tests
tsx test-search-integration.ts

# Property tests
cd backend/lambda
python3 test_lancedb_properties.py
python3 test_cache_properties.py
python3 test_discovery_queue_properties.py
```

---

## Getting Help

### Before Contacting Support

1. **Check CloudWatch Logs**
   - Review Lambda function logs
   - Check API Gateway logs
   - Look for error patterns

2. **Run Diagnostic Scripts**
   - `./verify-deployment.sh staging`
   - `./run-performance-tests.sh`
   - Property-based tests

3. **Review CloudFormation Events**
   - Check for failed resource creation
   - Review stack events for errors

4. **Check AWS Service Health**
   - Visit AWS Service Health Dashboard
   - Check for regional outages

### Contact Information

- **CloudWatch Logs:** `/aws/lambda/staging-search-api-lancedb`
- **Documentation:** `docs/INDEX.md`
- **Deployment Guide:** `infrastructure/DEPLOYMENT_GUIDE.md`
- **Performance Guide:** `backend/lambda/PERFORMANCE_TEST_GUIDE.md`

### Useful Commands

```bash
# Quick health check
aws cloudformation describe-stacks --stack-name staging-lancedb-search --query 'Stacks[0].StackStatus'

# Test search API
aws lambda invoke --function-name staging-search-api-lancedb --payload '{"queryStringParameters":{"q":"magnesium"}}' response.json && cat response.json

# Check cache
aws dynamodb scan --table-name supplement-cache --limit 5

# Check discovery queue
aws dynamodb scan --table-name discovery-queue --limit 5

# View recent errors
aws logs tail /aws/lambda/staging-search-api-lancedb --since 1h | grep ERROR
```

---

## Appendix: Error Codes

### HTTP Status Codes

- **200 OK** - Successful search
- **400 Bad Request** - Invalid query (empty, too long, malformed)
- **401 Unauthorized** - Missing or invalid API key
- **404 Not Found** - Supplement not found (added to discovery queue)
- **408 Request Timeout** - Search took too long (retry recommended)
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Lambda execution error
- **503 Service Unavailable** - DynamoDB throttling or EFS unavailable
- **504 Gateway Timeout** - Lambda timeout (> 30s)

### Lambda Error Types

- **Task timed out** - Increase timeout or optimize code
- **Runtime exited with error: signal: killed** - Out of memory
- **No such file or directory** - EFS mount issue
- **Transport endpoint is not connected** - EFS mount failed
- **ProvisionedThroughputExceededException** - DynamoDB throttling
- **Model not found** - Model not uploaded to EFS
- **Database not found** - LanceDB not initialized

---

## Version History

- **v1.0** (2025-11-28) - Initial troubleshooting guide for LanceDB-based system
