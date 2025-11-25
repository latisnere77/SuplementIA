# Discovery Worker Lambda

Background worker Lambda function that processes the supplement discovery queue.

## Overview

This Lambda is triggered by DynamoDB Stream events from the `supplement-discovery-queue` table. When users search for unknown supplements, they are added to the queue. This worker:

1. **Validates** the supplement via PubMed API
2. **Generates** embeddings using the embedding generator Lambda
3. **Inserts** the supplement into RDS Postgres
4. **Invalidates** cache via EventBridge
5. **Updates** the queue item status

## Architecture

```
DynamoDB Stream → Lambda Trigger → Discovery Worker
                                    ├─> PubMed API (validation)
                                    ├─> Embedding Lambda (generate embedding)
                                    ├─> RDS Postgres (insert supplement)
                                    ├─> EventBridge (cache invalidation)
                                    └─> DynamoDB (update queue status)
```

## Environment Variables

- `DISCOVERY_QUEUE_TABLE`: DynamoDB table name (default: `supplement-discovery-queue`)
- `RDS_HOST`: RDS Postgres hostname
- `RDS_DATABASE`: Database name (default: `supplements`)
- `RDS_USER`: Database user (default: `postgres`)
- `RDS_PASSWORD_PARAM`: SSM Parameter Store path for RDS password
- `EMBEDDING_LAMBDA_ARN`: ARN of the embedding generator Lambda
- `CACHE_INVALIDATION_BUS`: EventBridge bus name (default: `default`)

## Deployment

```bash
# Set required environment variables
export LAMBDA_ROLE_ARN="arn:aws:iam::ACCOUNT:role/lambda-execution-role"
export RDS_HOST="your-rds-endpoint.rds.amazonaws.com"
export EMBEDDING_LAMBDA_ARN="arn:aws:lambda:REGION:ACCOUNT:function:embedding-generator"

# Deploy
./deploy.sh
```

## Processing Logic

### 1. PubMed Validation

Searches PubMed for studies related to the supplement:
- Query: `{supplement_name}[Title/Abstract] AND (supplement OR supplementation)`
- Valid if at least 1 study exists
- Low evidence if < 5 studies

### 2. Evidence Classification

- **Valid**: ≥ 5 PubMed studies
- **Low Evidence**: 1-4 PubMed studies
- **Invalid**: 0 PubMed studies

### 3. Error Handling

- Failed items are marked with `status: 'failed'` and `failureReason`
- Retry count is incremented
- Items can be manually retried via the queue API

## Monitoring

Key metrics to monitor:
- Processing latency (target: < 30s per item)
- Success rate (target: > 95%)
- PubMed API errors
- Database insertion errors
- Queue backlog size

## Rate Limiting

- PubMed API: 3 requests/second (NCBI limit without API key)
- Batch processing: 10 items per invocation
- Automatic backoff on errors

## Testing

```bash
# Test with a sample event
aws lambda invoke \
  --function-name suplementia-discovery-worker \
  --payload file://test-event.json \
  response.json
```

## Cost Optimization

- Connection pooling for RDS (reuse across invocations)
- Batch processing (10 items per invocation)
- Efficient DynamoDB queries using GSI
- Lambda free tier: 1M requests/month
