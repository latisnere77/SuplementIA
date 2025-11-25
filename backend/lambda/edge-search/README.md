# Lambda@Edge Function for Intelligent Supplement Search

This Lambda@Edge function runs at CloudFront edge locations to provide ultra-fast supplement search with DAX cache integration.

## Features

- **Request Validation**: Sanitizes and validates search queries
- **DAX Cache Lookup**: Ultra-fast cache lookups (< 1ms)
- **SQL Injection Protection**: Blocks malicious queries
- **Edge Computing**: Runs at 450+ CloudFront edge locations worldwide
- **Automatic Fallback**: Falls back to origin on cache miss

## Requirements

- Node.js 18.x
- AWS CLI configured
- CloudFront distribution deployed
- DynamoDB + DAX cluster running

## Deployment

```bash
cd backend/lambda/edge-search
./deploy.sh
```

The script will:
1. Install dependencies
2. Create deployment package
3. Create/update IAM role
4. Deploy Lambda function to us-east-1
5. Publish new version

## Environment Variables

- `DAX_ENDPOINT`: DAX cluster endpoint
- `DYNAMODB_CACHE_TABLE`: DynamoDB cache table name (default: production-supplement-cache)
- `AWS_REGION`: AWS region (default: us-east-1)

## Function Flow

```
1. CloudFront receives request
2. Lambda@Edge validates query
3. Sanitizes input (SQL injection protection)
4. Generates cache key
5. Looks up in DAX cache
   - If HIT: Return immediately (< 1ms)
   - If MISS: Forward to origin
6. Origin processes and caches result
```

## Response Format

### Cache Hit (from edge)
```json
{
  "success": true,
  "supplement": { ... },
  "latency": 0.8,
  "cacheHit": true,
  "source": "dax",
  "timestamp": "2024-11-24T10:30:00.000Z"
}
```

### Cache Miss (forwarded to origin)
Request is forwarded with:
- Sanitized query parameter
- `X-Edge-Processed: true` header
- `X-Cache-Key: SUPPLEMENT#12345` header

## Error Responses

### Invalid Query
```json
{
  "success": false,
  "error": "Query parameter is required",
  "timestamp": "2024-11-24T10:30:00.000Z"
}
```

### Query Too Long
```json
{
  "success": false,
  "error": "Query too long (max 200 characters)",
  "timestamp": "2024-11-24T10:30:00.000Z"
}
```

## Security Features

1. **Input Validation**
   - Max 200 characters
   - Non-empty check
   - Type validation

2. **SQL Injection Protection**
   - Removes special characters: `;`, `'`, `"`, `\`
   - Blocks SQL keywords: `UNION SELECT`, `DROP TABLE`, etc.
   - Removes SQL comments: `--`

3. **XSS Protection**
   - Removes `<script>` tags
   - Sanitizes HTML entities

## Performance

- **Cache Hit Latency**: < 1ms (DAX)
- **Cache Miss Latency**: < 200ms (origin)
- **Memory**: 128 MB
- **Timeout**: 5 seconds
- **Cold Start**: ~100ms

## Monitoring

Lambda@Edge logs are distributed across all edge locations. View logs in CloudWatch Logs:

```bash
# View logs in specific region
aws logs tail /aws/lambda/us-east-1.supplement-search-edge --follow

# View logs in all regions (requires script)
./view-edge-logs.sh
```

## Testing

```bash
# Test locally (requires AWS credentials)
node test-edge-function.js

# Test via CloudFront
curl "https://d1234567890.cloudfront.net/api/search?q=vitamin+d"
```

## Cost

Lambda@Edge is included in AWS Lambda free tier:
- 1M requests/month free
- 400K GB-seconds/month free

Beyond free tier:
- $0.60 per 1M requests
- $0.00005001 per GB-second

**Estimated cost for 10K requests/day**: ~$0.18/month

## Limitations

1. **Region**: Must be deployed to us-east-1
2. **Size**: Max 1 MB compressed
3. **Timeout**: Max 5 seconds for viewer request
4. **Memory**: Max 128 MB for viewer request
5. **Environment Variables**: Limited to 4 KB total

## Troubleshooting

### Function not triggering
- Verify Lambda is associated with CloudFront distribution
- Check CloudFront cache behavior settings
- Ensure function is published (versioned)

### DAX connection errors
- Verify DAX endpoint is correct
- Check security group allows Lambda access
- Ensure IAM role has DynamoDB permissions

### High latency
- Check DAX cluster health
- Monitor DynamoDB throttling
- Review CloudWatch metrics

## References

- [Lambda@Edge Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html)
- [CloudFront Events](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-cloudfront-trigger-events.html)
- [DAX Client](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.html)
