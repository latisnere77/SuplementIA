# Embedding Generator Lambda

Generates 384-dimensional embeddings using Sentence Transformers (all-MiniLM-L6-v2).

## Features

- **Model**: all-MiniLM-L6-v2 (384 dimensions)
- **Multilingual**: Supports 100+ languages
- **Fast**: 14K tokens/sec throughput
- **Cached**: Model stored in EFS for fast cold starts
- **Cost**: $0 (within Lambda free tier for typical usage)

## Architecture

```
┌─────────────────────────────────────────┐
│         API Gateway / Lambda URL         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Lambda Function (Python 3.11)      │
│  - sentence-transformers                │
│  - torch (CPU)                          │
│  - Model cached in memory               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         EFS (Model Storage)             │
│  - /mnt/ml-models/                      │
│  - all-MiniLM-L6-v2 (80MB)             │
└─────────────────────────────────────────┘
```

## API

### Single Embedding

**Request:**
```json
POST /embed
{
  "text": "vitamin d"
}
```

**Response:**
```json
{
  "embedding": [0.1, 0.2, ..., 0.384],
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "dimensions": 384,
  "latency": 0.05
}
```

### Batch Embeddings

**Request:**
```json
POST /embed
{
  "texts": ["vitamin d", "magnesium", "omega-3"]
}
```

**Response:**
```json
{
  "embeddings": [
    [0.1, 0.2, ..., 0.384],
    [0.3, 0.4, ..., 0.384],
    [0.5, 0.6, ..., 0.384]
  ],
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "dimensions": 384,
  "count": 3,
  "latency": 0.12
}
```

## Deployment

### Prerequisites

1. **EFS File System**: Create an EFS file system for model storage
2. **Lambda Layer**: Build dependencies as a Lambda layer (optional)
3. **IAM Role**: Lambda execution role with EFS access

### Step 1: Create EFS File System

```bash
# Create EFS file system
aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --tags Key=Name,Value=ml-models

# Create mount target in your VPC
aws efs create-mount-target \
  --file-system-id fs-xxxxx \
  --subnet-id subnet-xxxxx \
  --security-groups sg-xxxxx
```

### Step 2: Pre-load Model to EFS

```bash
# Launch EC2 instance with EFS mounted
# SSH into instance
sudo mkdir -p /mnt/ml-models
sudo mount -t efs fs-xxxxx:/ /mnt/ml-models

# Install dependencies
pip install sentence-transformers

# Download model
python3 << EOF
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', 
                            cache_folder='/mnt/ml-models')
print("Model downloaded successfully")
EOF
```

### Step 3: Deploy Lambda

```bash
# Package Lambda function
cd backend/lambda/embedding-generator
zip -r function.zip lambda_function.py

# Create Lambda function
aws lambda create-function \
  --function-name embedding-generator \
  --runtime python3.11 \
  --handler lambda_function.lambda_handler \
  --role arn:aws:iam::ACCOUNT:role/lambda-efs-role \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 1024 \
  --file-system-configs Arn=arn:aws:elasticfilesystem:REGION:ACCOUNT:access-point/fsap-xxxxx,LocalMountPath=/mnt/ml-models \
  --environment Variables={MODEL_CACHE_DIR=/mnt/ml-models}
```

### Step 4: Install Dependencies

```bash
# Create Lambda layer with dependencies
mkdir -p python/lib/python3.11/site-packages
pip install -r requirements.txt -t python/lib/python3.11/site-packages
zip -r layer.zip python

# Create layer
aws lambda publish-layer-version \
  --layer-name sentence-transformers \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.11

# Attach layer to function
aws lambda update-function-configuration \
  --function-name embedding-generator \
  --layers arn:aws:lambda:REGION:ACCOUNT:layer:sentence-transformers:1
```

### Step 5: Create API Gateway

```bash
# Create Lambda Function URL (simpler than API Gateway)
aws lambda create-function-url-config \
  --function-name embedding-generator \
  --auth-type AWS_IAM

# Or create API Gateway REST API
aws apigateway create-rest-api \
  --name embedding-api \
  --endpoint-configuration types=REGIONAL
```

## Configuration

### Environment Variables

- `MODEL_CACHE_DIR`: Path to EFS mount (default: `/mnt/ml-models`)

### Lambda Settings

- **Runtime**: Python 3.11
- **Memory**: 1024 MB (minimum for model loading)
- **Timeout**: 30 seconds
- **EFS**: Mounted at `/mnt/ml-models`

## Performance

### Cold Start

- **First invocation**: ~5-10s (model loading from EFS)
- **Subsequent invocations**: ~50ms (model cached in memory)

### Throughput

- **Single embedding**: ~50ms
- **Batch (10 texts)**: ~200ms
- **Batch (100 texts)**: ~1.5s

### Cost

**Lambda Free Tier:**
- 1M requests/month
- 400K GB-seconds/month

**Typical Usage (10K embeddings/day):**
- Requests: 300K/month (within free tier)
- Compute: ~30K GB-seconds/month (within free tier)
- **Cost: $0/month**

**EFS Cost:**
- Storage: 80MB model = $0.01/month
- Throughput: Minimal = $0.01/month
- **Total: $0.02/month**

## Testing

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Run test
python lambda_function.py
```

### Lambda Testing

```bash
# Invoke Lambda
aws lambda invoke \
  --function-name embedding-generator \
  --payload '{"text":"vitamin d"}' \
  response.json

cat response.json
```

## Monitoring

### CloudWatch Metrics

- **Invocations**: Number of requests
- **Duration**: Execution time
- **Errors**: Failed requests
- **Throttles**: Rate limit hits

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/lambda/embedding-generator --follow
```

## Troubleshooting

### Model Not Found

**Error**: `Model not found in /mnt/ml-models`

**Solution**: Pre-load model to EFS (see Step 2)

### Out of Memory

**Error**: `MemoryError: Unable to allocate array`

**Solution**: Increase Lambda memory to 2048 MB

### Timeout

**Error**: `Task timed out after 30.00 seconds`

**Solution**: Increase timeout or reduce batch size

## Optimization

### Reduce Cold Start

1. **Provisioned Concurrency**: Keep 1-2 instances warm
2. **Smaller Model**: Use distilbert-base-nli-mean-tokens (256 dims)
3. **Model Quantization**: Use INT8 quantization

### Reduce Cost

1. **Batch Processing**: Process multiple texts per request
2. **Cache Results**: Cache embeddings in DynamoDB/Redis
3. **Reserved Capacity**: Use Savings Plans for predictable workload

## Security

### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:REGION:ACCOUNT:file-system/fs-xxxxx"
    }
  ]
}
```

### API Key

```bash
# Add API key to API Gateway
aws apigateway create-api-key \
  --name embedding-api-key \
  --enabled
```
