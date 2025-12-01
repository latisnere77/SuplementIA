# Performance Test Quick Start

## Quick Commands

### Run All Tests

```bash
./scripts/run-performance-tests.sh
```

### Backend Tests Only

```bash
cd backend/lambda
python3 test_performance.py
```

### Frontend Tests Only

```bash
export NEXT_PUBLIC_SEARCH_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
tsx scripts/test-performance-frontend.ts
```

## Prerequisites

### Backend Tests

- ✅ Access to AWS resources (DynamoDB, EFS)
- ✅ Lambda execution environment or EC2 with EFS mounted
- ✅ Python 3.11+ with dependencies
- ✅ AWS credentials configured

### Frontend Tests

- ✅ Node.js 18+
- ✅ tsx installed (`npm install -g tsx`)
- ✅ API Gateway URL set in environment

## Expected Output

### Success

```
🎉 All performance tests passed!
```

### Failure

```
⚠️  X performance test(s) failed
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Cache Hit Latency | < 10ms (P95) |
| Vector Search Latency | < 10ms (P95) |
| Total Search Latency | < 200ms (P95) |
| Throughput | >= 100 req/sec |
| Error Rate | < 1% |

## Troubleshooting

### "Not in Lambda/EFS environment"

Backend tests require EFS access. Run from:
- Lambda function
- EC2 instance with EFS mounted

### "tsx or ts-node not found"

Install tsx:
```bash
npm install -g tsx
```

### "NEXT_PUBLIC_SEARCH_API_URL not set"

Set your API Gateway URL:
```bash
export NEXT_PUBLIC_SEARCH_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod
```

## Full Documentation

See: `backend/lambda/PERFORMANCE_TEST_GUIDE.md`
