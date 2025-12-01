# Environment Configuration Guide

This document describes all environment variables required for SuplementIA to function correctly.

## Frontend Environment Variables

### Required Variables

#### Search API Configuration

```bash
# Search API Lambda Endpoint
# This is the API Gateway URL for the search-api-lancedb Lambda function
NEXT_PUBLIC_SEARCH_API_URL=https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/search

# Feature Flags
# Enable intelligent vector search with LanceDB
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true
```

#### AWS Configuration

```bash
# AWS Region where resources are deployed
AWS_REGION=us-east-1
```

### Optional Variables

```bash
# Alternative feature flag name (legacy)
NEXT_PUBLIC_ENABLE_VECTOR_SEARCH=true

# App URL (for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Portal API (set to DISABLED to use intelligent search)
PORTAL_API_URL=DISABLED
```

## Backend (Lambda) Environment Variables

### search-api-lancedb Lambda

```bash
# LanceDB database path on EFS
LANCEDB_PATH=/mnt/efs/suplementia-lancedb

# ML model path on EFS
MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2

# DynamoDB cache table name
DYNAMODB_CACHE_TABLE=supplement-cache

# Similarity threshold for vector search (0.0 - 1.0)
SIMILARITY_THRESHOLD=0.85
```

### discovery-worker Lambda

```bash
# LanceDB database path on EFS
LANCEDB_PATH=/mnt/efs/suplementia-lancedb

# ML model path on EFS
MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2

# DynamoDB discovery queue table name
DYNAMODB_DISCOVERY_QUEUE=discovery-queue

# DynamoDB cache table name (for invalidation)
DYNAMODB_CACHE_TABLE=supplement-cache
```

### embedding-generator Lambda

```bash
# ML model path on EFS
MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2
```

## Configuration by Environment

### Local Development (.env.local)

```bash
# Use staging API for local development
NEXT_PUBLIC_SEARCH_API_URL=https://staging-search-api.execute-api.us-east-1.amazonaws.com/search
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true
AWS_REGION=us-east-1
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORTAL_API_URL=DISABLED
```

### Staging (.env.staging)

```bash
# Staging API Gateway endpoint
NEXT_PUBLIC_SEARCH_API_URL=https://staging-search-api.execute-api.us-east-1.amazonaws.com/search
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true
AWS_REGION=us-east-1
```

### Production (.env.production)

```bash
# Production API Gateway endpoint
NEXT_PUBLIC_SEARCH_API_URL=https://prod-search-api.execute-api.us-east-1.amazonaws.com/search
NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true
AWS_REGION=us-east-1
```

## Secrets Management

**IMPORTANT:** Never hardcode sensitive values in environment files.

### AWS Secrets Manager

Store sensitive values in AWS Secrets Manager:

```bash
# Create secret
aws secretsmanager create-secret \
  --name suplementia/production/api-keys \
  --secret-string '{"ANTHROPIC_API_KEY":"sk-ant-..."}'

# Retrieve secret in Lambda
import boto3
import json

secretsmanager = boto3.client('secretsmanager')
response = secretsmanager.get_secret_value(SecretId='suplementia/production/api-keys')
secrets = json.loads(response['SecretString'])
api_key = secrets['ANTHROPIC_API_KEY']
```

### AWS Systems Manager Parameter Store

Store configuration values in Parameter Store:

```bash
# Create parameter
aws ssm put-parameter \
  --name /suplementia/production/search-api-url \
  --value "https://prod-search-api.execute-api.us-east-1.amazonaws.com/search" \
  --type String

# Retrieve parameter in Lambda
import boto3

ssm = boto3.client('ssm')
response = ssm.get_parameter(Name='/suplementia/production/search-api-url')
search_api_url = response['Parameter']['Value']
```

## Validation

### Check Frontend Configuration

```bash
# Verify environment variables are loaded
npm run dev

# Check console output for:
# [useIntelligentSearch] Searching: "..." (intelligent: true)
```

### Check Lambda Configuration

```bash
# Test Lambda function
aws lambda invoke \
  --function-name search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  response.json

# Check CloudWatch logs
aws logs tail /aws/lambda/search-api-lancedb --follow
```

## Troubleshooting

### Frontend can't reach API

**Symptom:** Network errors, CORS errors

**Solution:**
1. Verify `NEXT_PUBLIC_SEARCH_API_URL` is set correctly
2. Check API Gateway CORS configuration
3. Verify API Gateway is deployed

### Lambda can't access EFS

**Symptom:** "No such file or directory" errors

**Solution:**
1. Verify `LANCEDB_PATH` and `MODEL_PATH` are correct
2. Check EFS mount configuration in Lambda
3. Verify security groups allow NFS (port 2049)

### Lambda can't access DynamoDB

**Symptom:** "AccessDeniedException" errors

**Solution:**
1. Verify `DYNAMODB_CACHE_TABLE` name is correct
2. Check Lambda IAM role has DynamoDB permissions
3. Verify DynamoDB table exists

### Feature flag not working

**Symptom:** Intelligent search not being used

**Solution:**
1. Verify `NEXT_PUBLIC_USE_INTELLIGENT_SEARCH=true`
2. Rebuild frontend: `npm run build`
3. Restart dev server: `npm run dev`

## References

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Lambda Environment Variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)
